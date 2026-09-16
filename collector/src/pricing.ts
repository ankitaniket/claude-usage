/**
 * Cost-equivalent pricing (USD per 1M tokens). You are on a subscription, so
 * this is a *utilization proxy* — a stable way to weigh Opus vs Haiku work —
 * not an actual bill. Rates track public Anthropic list prices; adjust freely.
 */
export interface Rate {
  input: number;
  output: number;
  cacheWrite: number; // cache_creation_input_tokens (5m tier)
  cacheRead: number; // cache_read_input_tokens
}

const RATES: Record<string, Rate> = {
  opus: { input: 15, output: 75, cacheWrite: 18.75, cacheRead: 1.5 },
  sonnet: { input: 3, output: 15, cacheWrite: 3.75, cacheRead: 0.3 },
  haiku: { input: 1, output: 5, cacheWrite: 1.25, cacheRead: 0.1 },
};

const FALLBACK: Rate = RATES.sonnet;

/** Map a model id (e.g. "claude-opus-4-8") to a rate family. */
export function rateForModel(model: string): Rate {
  const m = model.toLowerCase();
  if (m.includes("opus")) return RATES.opus;
  if (m.includes("sonnet")) return RATES.sonnet;
  if (m.includes("haiku")) return RATES.haiku;
  return FALLBACK;
}

export interface TokenCounts {
  input: number;
  output: number;
  cacheRead: number;
  cacheCreation: number;
}

/** Cost-equivalent in USD for a set of token counts under a model. */
export function costUsd(model: string, t: TokenCounts): number {
  const r = rateForModel(model);
  return (
    (t.input * r.input +
      t.output * r.output +
      t.cacheCreation * r.cacheWrite +
      t.cacheRead * r.cacheRead) /
    1_000_000
  );
}
