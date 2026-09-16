import { costUsd } from "./pricing.js";
import type { AggregateStore, BucketKey, UsageEvent } from "./types.js";
import { config } from "./config.js";

/** Floor an ISO timestamp to the top of its UTC hour. */
function hourBucket(ts: string): string {
  const d = new Date(ts);
  if (Number.isNaN(d.getTime())) return new Date().toISOString();
  d.setUTCMinutes(0, 0, 0);
  return d.toISOString();
}

function keyOf(bucketTs: string, model: string, project: string): BucketKey {
  return `${bucketTs}|${model}|${project}`;
}

/**
 * Fold new events into the accumulated store. Returns the set of bucket keys
 * that changed this run (so we only push what's new/updated).
 */
export function applyEvents(
  store: AggregateStore,
  events: UsageEvent[],
): Set<BucketKey> {
  const changed = new Set<BucketKey>();
  for (const e of events) {
    const bucketTs = hourBucket(e.ts);
    const key = keyOf(bucketTs, e.model, e.project);
    const b = store.buckets[key] ?? {
      bucketTs,
      model: e.model,
      project: e.project,
      input: 0,
      output: 0,
      cacheRead: 0,
      cacheCreation: 0,
      costUsd: 0,
      messageCount: 0,
    };
    b.input += e.input;
    b.output += e.output;
    b.cacheRead += e.cacheRead;
    b.cacheCreation += e.cacheCreation;
    b.messageCount += 1;
    b.costUsd = costUsd(b.model, {
      input: b.input,
      output: b.output,
      cacheRead: b.cacheRead,
      cacheCreation: b.cacheCreation,
    });
    store.buckets[key] = b;
    changed.add(key);
  }
  return changed;
}

/** Drop buckets older than the retention window to keep the file small. */
export function pruneOld(store: AggregateStore): void {
  const cutoff = Date.now() - config.retentionDays * 24 * 60 * 60 * 1000;
  for (const [key, b] of Object.entries(store.buckets)) {
    if (new Date(b.bucketTs).getTime() < cutoff) delete store.buckets[key];
  }
}
