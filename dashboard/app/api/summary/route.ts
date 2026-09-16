import { db } from "@/lib/db";
import { checkBearer, unauthorized } from "@/lib/auth";
import { computeSummary, type Summary } from "@/lib/queries";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * Compact payload the Mac/Android widgets consume. Token-scoped via
 * SUMMARY_TOKEN. Serves the cron/ingest-cached summary when present (cheap),
 * else computes on the fly.
 */
export async function GET(req: Request): Promise<Response> {
  if (!checkBearer(req, "SUMMARY_TOKEN")) return unauthorized();

  const sql = db();
  let summary: Summary;
  try {
    const rows = (await sql`
      SELECT value FROM plan_config WHERE key = 'cached_summary'
    `) as { value: Summary }[];
    summary = rows.length ? rows[0].value : await computeSummary();
  } catch {
    summary = await computeSummary();
  }

  // Flag staleness: if the collector hasn't pinged in > 8h, mark estimated.
  try {
    const ping = (await sql`
      SELECT value FROM plan_config WHERE key = 'last_collector_ping'
    `) as { value: string }[];
    if (ping.length) {
      const ageMs = Date.now() - new Date(ping[0].value).getTime();
      if (ageMs > 8 * 60 * 60 * 1000) summary = { ...summary, source: "estimated" };
    }
  } catch {
    /* ignore */
  }

  return new Response(JSON.stringify(summary), {
    status: 200,
    headers: {
      "content-type": "application/json",
      "cache-control": "public, max-age=300",
    },
  });
}
