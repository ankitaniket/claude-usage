import { config } from "./config.js";
import type { Bucket, LimitSnapshot } from "./types.js";

/** Wire shapes use snake_case to match the SQL columns directly. */
interface WireBucket {
  bucket_ts: string;
  model: string;
  project: string;
  input_tokens: number;
  output_tokens: number;
  cache_read: number;
  cache_creation: number;
  cost_usd: number;
  message_count: number;
}

function toWireBucket(b: Bucket): WireBucket {
  return {
    bucket_ts: b.bucketTs,
    model: b.model,
    project: b.project,
    input_tokens: b.input,
    output_tokens: b.output,
    cache_read: b.cacheRead,
    cache_creation: b.cacheCreation,
    cost_usd: Math.round(b.costUsd * 1e6) / 1e6,
    message_count: b.messageCount,
  };
}

function toWireLimit(l: LimitSnapshot) {
  return {
    window: l.window,
    used_pct: l.usedPct,
    remaining_pct: l.remainingPct,
    resets_at: l.resetsAt,
    source: l.source,
  };
}

/**
 * POST buckets (absolute totals) + limit snapshots to the dashboard.
 * Because totals are absolute and ingest upserts by (bucket,model,project),
 * pushing everything is idempotent and inherently backfills. Returns true on
 * success; no-op (false) if DASHBOARD_URL is unset.
 */
export async function push(
  buckets: Bucket[],
  limits: LimitSnapshot[],
  collectorAt: string,
): Promise<boolean> {
  if (!config.dashboardUrl) {
    console.log("[push] DASHBOARD_URL not set — local-only run, skipping push.");
    return false;
  }
  const body = JSON.stringify({
    buckets: buckets.map(toWireBucket),
    limits: limits.map(toWireLimit),
    collectorAt,
  });
  const url = `${config.dashboardUrl}/api/ingest`;
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 20000);
    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.ingestToken}`,
      },
      body,
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) {
      console.error(`[push] ingest failed: ${res.status} ${await res.text()}`);
      return false;
    }
    console.log(
      `[push] ingested ${buckets.length} buckets, ${limits.length} limit snapshots.`,
    );
    return true;
  } catch (err) {
    console.error(`[push] ingest error:`, (err as Error).message);
    return false;
  }
}
