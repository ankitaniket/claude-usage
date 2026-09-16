import { db } from "@/lib/db";
import { checkBearer, unauthorized } from "@/lib/auth";
import { computeSummary, getPlanConfig } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const TOKENS = "input_tokens + output_tokens + cache_creation";

function num(v: unknown, d = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : d;
}

/**
 * Runs every 5h (see vercel.ts). Cloud-side backstop that:
 *  1) closes/resets the 5-hour window (snapshot of trailing-5h usage),
 *  2) writes an estimated weekly snapshot for history,
 *  3) refreshes the cached summary widgets read.
 * Vercel Cron sends `Authorization: Bearer $CRON_SECRET`.
 */
export async function GET(req: Request): Promise<Response> {
  if (!checkBearer(req, "CRON_SECRET")) return unauthorized();

  const sql = db();
  const cfg = await getPlanConfig();

  // 1) 5-hour window rollup + reset marker.
  const [fiveHour] = (await sql`
    SELECT COALESCE(SUM(${sql.unsafe(TOKENS)}), 0)::bigint AS tokens
    FROM usage_hourly
    WHERE bucket_ts >= now() - interval '5 hours'
  `) as { tokens: string }[];
  const fiveHourLimit = num(cfg.five_hour_token_limit, 0);
  const fiveUsedPct =
    fiveHourLimit > 0
      ? Math.min(100, Math.round((num(fiveHour.tokens) / fiveHourLimit) * 1000) / 10)
      : null;
  await sql`
    INSERT INTO limit_snapshots (window, used_pct, remaining_pct, resets_at, source)
    VALUES ('5h', ${fiveUsedPct}, ${fiveUsedPct == null ? null : 100 - fiveUsedPct},
            now() + interval '5 hours', 'estimated')
  `;

  // 2) Weekly estimated snapshot for history.
  const [week] = (await sql`
    SELECT COALESCE(SUM(${sql.unsafe(TOKENS)}), 0)::bigint AS tokens
    FROM usage_hourly
    WHERE bucket_ts >= now() - interval '7 days'
  `) as { tokens: string }[];
  const weekLimit = num(cfg.weekly_token_limit, 0);
  const weekUsedPct =
    weekLimit > 0
      ? Math.min(100, Math.round((num(week.tokens) / weekLimit) * 1000) / 10)
      : null;
  await sql`
    INSERT INTO limit_snapshots (window, used_pct, remaining_pct, resets_at, source)
    VALUES ('weekly', ${weekUsedPct}, ${weekUsedPct == null ? null : 100 - weekUsedPct},
            NULL, 'estimated')
  `;

  // 3) Refresh cached summary.
  const summary = await computeSummary();
  await sql`
    INSERT INTO plan_config (key, value)
    VALUES ('cached_summary', ${JSON.stringify(summary)}::jsonb)
    ON CONFLICT (key) DO UPDATE SET value = EXCLUDED.value
  `;

  return Response.json({
    ok: true,
    fiveHourUsedPct: fiveUsedPct,
    weekUsedPct,
    refreshedAt: summary.generatedAt,
  });
}
