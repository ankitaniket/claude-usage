import fs from "node:fs";
import { paths } from "./config.js";
import type { AggregateStore, Bucket, LimitSnapshot, Summary } from "./types.js";

/**
 * "Billable" token count: input + output + newly-created cache context.
 * Cache *reads* are deliberately excluded — they run into the billions and
 * would drown out the signal (they're the cheap part of usage).
 */
export function tokensOf(b: Bucket): number {
  return b.input + b.output + b.cacheCreation;
}

function withinLast(bucketTs: string, ms: number): boolean {
  return Date.now() - new Date(bucketTs).getTime() <= ms;
}

function isToday(bucketTs: string): boolean {
  const d = new Date(bucketTs);
  const now = new Date();
  return (
    d.getFullYear() === now.getFullYear() &&
    d.getMonth() === now.getMonth() &&
    d.getDate() === now.getDate()
  );
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function buildSummary(
  store: AggregateStore,
  weekly?: LimitSnapshot | null,
): Summary {
  let weekTokens = 0;
  let todayTokens = 0;
  let weekCostUsd = 0;
  const costByModel = new Map<string, number>();
  const activeHours = new Set<string>();

  for (const b of Object.values(store.buckets)) {
    const tok = tokensOf(b);
    if (withinLast(b.bucketTs, WEEK_MS)) {
      weekTokens += tok;
      weekCostUsd += b.costUsd;
      costByModel.set(b.model, (costByModel.get(b.model) ?? 0) + b.costUsd);
    }
    if (isToday(b.bucketTs)) {
      todayTokens += tok;
      activeHours.add(b.bucketTs);
    }
  }

  let dominantModel: string | null = null;
  let max = -1;
  for (const [model, cost] of costByModel) {
    if (cost > max) {
      max = cost;
      dominantModel = model;
    }
  }

  return {
    generatedAt: new Date().toISOString(),
    weekTokens,
    todayTokens,
    weekCostUsd: Math.round(weekCostUsd * 100) / 100,
    dominantModel,
    activeHoursToday: activeHours.size,
    weekUsedPct: weekly ? weekly.usedPct : null,
    weekRemainingPct: weekly ? weekly.remainingPct : null,
    resetsAt: weekly ? weekly.resetsAt : null,
    source: weekly ? weekly.source : "estimated",
  };
}

export function writeSummary(summary: Summary): void {
  fs.writeFileSync(paths.summary, JSON.stringify(summary, null, 2));
}
