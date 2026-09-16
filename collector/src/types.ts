/** One assistant response worth of usage, extracted from a JSONL line. */
export interface UsageEvent {
  ts: string; // ISO timestamp
  model: string;
  project: string;
  requestId: string; // for in-run dedup
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

/** A fully-accumulated hourly bucket (absolute totals, not deltas). */
export interface Bucket {
  bucketTs: string; // ISO, floored to the hour (UTC)
  model: string;
  project: string;
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
  costUsd: number;
  messageCount: number;
}

export type BucketKey = string; // `${bucketTs}|${model}|${project}`

export interface AggregateStore {
  buckets: Record<BucketKey, Bucket>;
  lastRun?: string;
}

export interface FileState {
  offset: number; // byte offset already consumed
  size: number; // last-seen size (detect truncation/rotation)
}

export interface State {
  files: Record<string, FileState>;
  lastRun?: string;
}

/** Live limit reading from the best-effort usage endpoint. */
export interface LimitSnapshot {
  window: "weekly" | "5h" | "opus_weekly";
  usedPct: number;
  remainingPct: number;
  resetsAt: string | null;
  source: "endpoint" | "estimated";
}

/** Compact payload the widgets consume (also written locally as fallback). */
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
