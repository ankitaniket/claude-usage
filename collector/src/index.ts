import { config, ensureDataDir } from "./config.js";
import {
  loadState,
  saveState,
  loadAggregates,
  saveAggregates,
} from "./state.js";
import { parseNewEvents } from "./parse.js";
import { applyEvents, pruneOld } from "./aggregate.js";
import { buildSummary, writeSummary } from "./summary.js";
import { fetchLiveLimits } from "./usageEndpoint.js";
import { push } from "./push.js";
import type { LimitSnapshot } from "./types.js";

async function main(): Promise<void> {
  const startedAt = new Date().toISOString();
  ensureDataDir();

  const state = loadState();
  const store = loadAggregates();

  // 1. Parse only new log lines.
  const events = parseNewEvents(state);
  console.log(`[collector] ${events.length} new usage events.`);

  // 2. Fold into the accumulated store.
  applyEvents(store, events);
  pruneOld(store);

  // 3. Best-effort live limits (never throws).
  let limits: LimitSnapshot[] = [];
  if (config.enableLiveUsage) {
    limits = await fetchLiveLimits();
    console.log(`[collector] ${limits.length} live limit snapshots.`);
  }
  // 4. Build + persist the local summary (widget fallback).
  const summary = buildSummary(store, limits);
  writeSummary(summary);
  console.log(
    `[collector] session(5h)=${summary.session.usedPct ?? "?"}%, ` +
      `week=${summary.week.usedPct ?? "?"}%, today=${summary.todayTokens} tok, ` +
      `model=${summary.dominantModel ?? "n/a"}`,
  );

  // 5. Push all buckets (absolute totals, idempotent upsert) + limits.
  await push(Object.values(store.buckets), limits, startedAt);

  // 6. Persist state + aggregates last (so a mid-run crash re-reads safely).
  store.lastRun = startedAt;
  state.lastRun = startedAt;
  saveAggregates(store);
  saveState(state);
}

main().catch((err) => {
  console.error("[collector] fatal:", err);
  process.exit(1);
});
