import { db } from "./db";

// Billable token expression used everywhere (excludes cheap cache reads).
const TOKENS = "input_tokens + output_tokens + cache_creation";

export interface Summary {
  generatedAt: string;
  weekTokens: number;
  todayTokens: number;
  weekCostUsd: number;
  dominantModel: string | null;
  activeHoursToday: number;
  weekUsedPct: number | null;
  weekRemainingPct: number | null;
  resetsAt: string | null;
  source: "endpoint" | "estimated";
}

export async function getPlanConfig(): Promise<Record<string, unknown>> {
  const sql = db();
  const rows = (await sql`SELECT key, value FROM plan_config`) as {
    key: string;
    value: unknown;
  }[];
  const out: Record<string, unknown> = {};
  for (const r of rows) out[r.key] = r.value;
  return out;
}

function num(v: unknown, d = 0): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : d;
}

/** The single source of truth for the compact widget payload. */
export async function computeSummary(): Promise<Summary> {
  const sql = db();

  const weekRows = (await sql`
    SELECT model,
           SUM(${sql.unsafe(TOKENS)})::bigint AS tokens,
           SUM(cost_usd)::numeric AS cost
    FROM usage_hourly
    WHERE bucket_ts >= now() - interval '7 days'
    GROUP BY model
  `) as { model: string; tokens: string; cost: string }[];

  let weekTokens = 0;
  let weekCostUsd = 0;
  let dominantModel: string | null = null;
  let maxCost = -1;
  for (const r of weekRows) {
    weekTokens += num(r.tokens);
    const c = num(r.cost);
    weekCostUsd += c;
    if (c > maxCost) {
      maxCost = c;
      dominantModel = r.model;
    }
  }

  const [today] = (await sql`
    SELECT COUNT(DISTINCT bucket_ts)::int AS active_hours,
           COALESCE(SUM(${sql.unsafe(TOKENS)}), 0)::bigint AS tokens
    FROM usage_hourly
    WHERE bucket_ts >= date_trunc('day', now())
  `) as { active_hours: number; tokens: string }[];

  // Only trust a *recent* live reading; otherwise we estimate below.
  const snap = (await sql`
    SELECT used_pct, remaining_pct, resets_at, source
    FROM limit_snapshots
    WHERE win = 'weekly' AND source = 'endpoint'
      AND captured_at >= now() - interval '6 hours'
    ORDER BY captured_at DESC
    LIMIT 1
  `) as {
    used_pct: string | null;
    remaining_pct: string | null;
    resets_at: string | null;
    source: string;
  }[];

  let weekUsedPct: number | null = null;
  let weekRemainingPct: number | null = null;
  let resetsAt: string | null = null;
  let source: "endpoint" | "estimated" = "estimated";

  if (snap.length && snap[0].used_pct != null) {
    weekUsedPct = num(snap[0].used_pct);
    weekRemainingPct =
      snap[0].remaining_pct != null
        ? num(snap[0].remaining_pct)
        : 100 - weekUsedPct;
    resetsAt = snap[0].resets_at;
    source = snap[0].source === "endpoint" ? "endpoint" : "estimated";
  } else {
    // No live reading → estimate against the configured weekly token limit.
    const cfg = await getPlanConfig();
    const limit = num(cfg.weekly_token_limit, 0);
    if (limit > 0) {
      weekUsedPct = Math.min(100, Math.round((weekTokens / limit) * 1000) / 10);
      weekRemainingPct = Math.max(0, 100 - weekUsedPct);
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    weekTokens,
    todayTokens: num(today?.tokens),
    weekCostUsd: Math.round(weekCostUsd * 100) / 100,
    dominantModel,
    activeHoursToday: today?.active_hours ?? 0,
    weekUsedPct,
    weekRemainingPct,
    resetsAt,
    source,
  };
}

// ---- Dashboard page queries ----

export async function getDailyTrend(days = 30) {
  const sql = db();
  return (await sql`
    SELECT to_char(date_trunc('day', bucket_ts), 'YYYY-MM-DD') AS day,
           SUM(${sql.unsafe(TOKENS)})::bigint AS tokens,
           SUM(cost_usd)::numeric AS cost,
           SUM(message_count)::int AS messages
    FROM usage_hourly
    WHERE bucket_ts >= now() - (${days} || ' days')::interval
    GROUP BY 1 ORDER BY 1
  `) as { day: string; tokens: string; cost: string; messages: number }[];
}

export async function getModelSplit(days = 7) {
  const sql = db();
  return (await sql`
    SELECT model,
           SUM(${sql.unsafe(TOKENS)})::bigint AS tokens,
           SUM(cost_usd)::numeric AS cost
    FROM usage_hourly
    WHERE bucket_ts >= now() - (${days} || ' days')::interval
    GROUP BY model ORDER BY cost DESC
  `) as { model: string; tokens: string; cost: string }[];
}

export async function getProjectSplit(days = 7, limit = 8) {
  const sql = db();
  return (await sql`
    SELECT project,
           SUM(${sql.unsafe(TOKENS)})::bigint AS tokens,
           SUM(cost_usd)::numeric AS cost
    FROM usage_hourly
    WHERE bucket_ts >= now() - (${days} || ' days')::interval
    GROUP BY project ORDER BY tokens DESC LIMIT ${limit}
  `) as { project: string; tokens: string; cost: string }[];
}

/** Hour-of-day (0-23) × day-of-week (0=Sun) activity heatmap over N days. */
export async function getHourHeatmap(days = 14) {
  const sql = db();
  return (await sql`
    SELECT EXTRACT(dow FROM bucket_ts)::int AS dow,
           EXTRACT(hour FROM bucket_ts)::int AS hour,
           SUM(${sql.unsafe(TOKENS)})::bigint AS tokens
    FROM usage_hourly
    WHERE bucket_ts >= now() - (${days} || ' days')::interval
    GROUP BY 1, 2
  `) as { dow: number; hour: number; tokens: string }[];
}
