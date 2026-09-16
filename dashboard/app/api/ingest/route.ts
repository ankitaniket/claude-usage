import { db } from "@/lib/db";
import { checkBearer, unauthorized } from "@/lib/auth";
import { computeSummary } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

interface Body {
  buckets?: unknown[];
  limits?: {
    window: string;
    used_pct: number | null;
    remaining_pct: number | null;
    resets_at: string | null;
    source: string;
  }[];
  collectorAt?: string;
}

export async function POST(req: Request): Promise<Response> {
  if (!checkBearer(req, "INGEST_TOKEN")) return unauthorized();

  let body: Body;
  try {
    body = (await req.json()) as Body;
  } catch {
    return Response.json({ error: "invalid json" }, { status: 400 });
  }

  const sql = db();
  const buckets = Array.isArray(body.buckets) ? body.buckets : [];
  const limits = Array.isArray(body.limits) ? body.limits : [];

  // Batched, set-based idempotent upsert of absolute per-bucket totals.
  if (buckets.length) {
    await sql`
      INSERT INTO usage_hourly
        (bucket_ts, model, project, input_tokens, output_tokens,
         cache_read, cache_creation, cost_usd, message_count, updated_at)
      SELECT bucket_ts, model, project, input_tokens, output_tokens,
             cache_read, cache_creation, cost_usd, message_count, now()
      FROM jsonb_to_recordset(${JSON.stringify(buckets)}::jsonb) AS t(
        bucket_ts timestamptz, model text, project text,
        input_tokens bigint, output_tokens bigint, cache_read bigint,
        cache_creation bigint, cost_usd numeric, message_count int)
      ON CONFLICT (bucket_ts, model, project) DO UPDATE SET
        input_tokens   = EXCLUDED.input_tokens,
        output_tokens  = EXCLUDED.output_tokens,
        cache_read     = EXCLUDED.cache_read,
        cache_creation = EXCLUDED.cache_creation,
        cost_usd       = EXCLUDED.cost_usd,
        message_count  = EXCLUDED.message_count,
        updated_at     = now()
    `;
  }

  // Record any live limit snapshots the collector captured.
  for (const l of limits) {
    await sql`
      INSERT INTO limit_snapshots (window, used_pct, remaining_pct, resets_at, source)
      VALUES (${l.window}, ${l.used_pct}, ${l.remaining_pct}, ${l.resets_at}, ${l.source})
    `;
  }

  // Note the collector heartbeat for staleness detection.
  await sql`
    INSERT INTO plan_config (key, value)
    VALUES ('last_collector_ping', ${JSON.stringify(body.collectorAt ?? new Date().toISOString())}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;

  // Refresh + cache the summary so widgets get fresh derived values.
  const summary = await computeSummary();
  await sql`
    INSERT INTO plan_config (key, value)
    VALUES ('cached_summary', ${JSON.stringify(summary)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;

  return Response.json({ ok: true, buckets: buckets.length, limits: limits.length });
}
