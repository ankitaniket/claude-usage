import { execFileSync } from "node:child_process";
import type { LimitSnapshot } from "./types.js";

/**
 * BEST-EFFORT live "% remaining", mirroring what `claude /usage` shows.
 *
 * This uses the OAuth token from the macOS Keychain and an UNDOCUMENTED
 * endpoint. It is wrapped so that ANY failure (no token, endpoint moved,
 * shape changed, offline) returns [] and the rest of the collector proceeds
 * on local metrics only. Confirm/adjust ENDPOINT + parsing at build time by
 * inspecting the CLI's network call.
 */

const ENDPOINT = "https://api.anthropic.com/api/oauth/usage";
const OAUTH_BETA = "oauth-2025-04-20";

function readOAuthToken(): string | null {
  try {
    const raw = execFileSync(
      "security",
      ["find-generic-password", "-s", "Claude Code-credentials", "-w"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "ignore"] },
    ).trim();
    const parsed = JSON.parse(raw);
    return parsed?.claudeAiOauth?.accessToken || parsed?.accessToken || null;
  } catch {
    return null;
  }
}

/** Coerce whatever shape the endpoint returns into our snapshots. */
function normalize(data: any): LimitSnapshot[] {
  const out: LimitSnapshot[] = [];
  const push = (
    window: LimitSnapshot["window"],
    node: any,
  ): void => {
    if (!node || typeof node !== "object") return;
    // Try common field names defensively.
    const used =
      num(node.utilization) ??
      num(node.used_pct) ??
      num(node.usedPercent) ??
      (num(node.used) != null && num(node.limit)
        ? (num(node.used)! / num(node.limit)!) * 100
        : null);
    if (used == null) return;
    const usedPct = Math.max(0, Math.min(100, used <= 1 ? used * 100 : used));
    out.push({
      window,
      usedPct: round(usedPct),
      remainingPct: round(100 - usedPct),
      resetsAt: node.resets_at || node.resetsAt || node.reset_at || null,
      source: "endpoint",
    });
  };

  push("5h", data?.five_hour ?? data?.fiveHour ?? data?.session ?? data?.["5h"]);
  push("weekly", data?.seven_day ?? data?.weekly ?? data?.week ?? data?.["7d"]);
  push(
    "opus_weekly",
    data?.seven_day_opus ?? data?.opus_weekly ?? data?.weekly_opus,
  );
  return out;
}

function num(v: unknown): number | null {
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}
function round(n: number): number {
  return Math.round(n * 10) / 10;
}

export async function fetchLiveLimits(): Promise<LimitSnapshot[]> {
  const token = readOAuthToken();
  if (!token) return [];
  try {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 8000);
    const res = await fetch(ENDPOINT, {
      headers: {
        Authorization: `Bearer ${token}`,
        "anthropic-beta": OAUTH_BETA,
        "Content-Type": "application/json",
      },
      signal: controller.signal,
    });
    clearTimeout(timer);
    if (!res.ok) return [];
    const data = await res.json();
    return normalize(data);
  } catch {
    return [];
  }
}
