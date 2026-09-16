export type Tone = "low" | "ok" | "high" | "crit";

export interface Insight {
  tone: Tone;
  title: string;
  detail: string;
}

const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

/**
 * The "am I wasting or burning credits?" signal.
 * When a reset time is known we pace usage against elapsed time; otherwise we
 * judge purely by level.
 */
export function weeklyInsight(
  usedPct: number | null,
  resetsAt: string | null,
): Insight {
  if (usedPct == null) {
    return {
      tone: "ok",
      title: "Set your weekly limit",
      detail:
        "Add your plan's weekly token limit in plan_config to unlock utilization and pacing insights.",
    };
  }

  const left = resetsAt ? new Date(resetsAt).getTime() - Date.now() : null;
  if (left != null && left > 0) {
    const daysLeft = Math.max(0, Math.round((left / 8.64e7) * 10) / 10);
    const elapsedPct = Math.min(100, Math.max(0, (1 - left / WEEK_MS) * 100));
    if (usedPct < elapsedPct - 15) {
      return {
        tone: "low",
        title: "Underutilizing your credits",
        detail: `Only ${usedPct}% used with ${daysLeft}d left (pace suggests ~${Math.round(elapsedPct)}%). Lean on Opus and tackle bigger tasks before the reset.`,
      };
    }
    if (usedPct > elapsedPct + 15) {
      return {
        tone: usedPct >= 90 ? "crit" : "high",
        title: "Burning fast",
        detail: `${usedPct}% used with ${daysLeft}d left. Move routine work to Haiku/Sonnet to avoid hitting the cap early.`,
      };
    }
    return {
      tone: "ok",
      title: "On track",
      detail: `${usedPct}% used with ${daysLeft}d left — right on pace.`,
    };
  }

  // No reset info (rolling estimate): judge by level.
  if (usedPct < 40)
    return {
      tone: "low",
      title: "Plenty of headroom",
      detail: `Only ${usedPct}% of your weekly budget used. You can push harder and default to Opus.`,
    };
  if (usedPct < 75)
    return {
      tone: "ok",
      title: "Healthy utilization",
      detail: `${usedPct}% of your weekly budget used — a good rhythm.`,
    };
  if (usedPct < 90)
    return {
      tone: "high",
      title: "Running high",
      detail: `${usedPct}% used. Reserve Opus for the hard problems; use Haiku/Sonnet elsewhere.`,
    };
  return {
    tone: "crit",
    title: "Near your weekly cap",
    detail: `${usedPct}% used. Switch to Haiku/Sonnet or pace down until the reset.`,
  };
}
