/** Compact token/number formatting (1.2M, 340K, 5.6B). */
export function fmtTokens(n: number): string {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(1)}K`;
  return `${Math.round(n)}`;
}

export function fmtUsd(n: number): string {
  if (n >= 1000) return `$${(n / 1000).toFixed(1)}k`;
  return `$${n.toFixed(2)}`;
}

/** Short model label: claude-opus-4-8 → Opus 4.8 */
export function shortModel(model: string | null): string {
  if (!model) return "—";
  const m = model.toLowerCase();
  const fam = m.includes("opus")
    ? "Opus"
    : m.includes("sonnet")
      ? "Sonnet"
      : m.includes("haiku")
        ? "Haiku"
        : model;
  const ver = model.match(/(\d+)-(\d+)/);
  return ver ? `${fam} ${ver[1]}.${ver[2]}` : fam;
}

/** Accent color that shifts green → amber → red with % used. */
export function usageColor(pct: number | null): string {
  if (pct == null) return "#8b8b93";
  if (pct >= 90) return "#f2555a"; // red
  if (pct >= 70) return "#f4ab34"; // amber
  if (pct >= 40) return "#e8c15a"; // yellow
  return "#3ecf8e"; // green
}

/** Human "resets in 2d 4h" from an ISO timestamp. */
export function resetsIn(iso: string | null): string | null {
  if (!iso) return null;
  const ms = new Date(iso).getTime() - Date.now();
  if (!Number.isFinite(ms) || ms <= 0) return null;
  const h = Math.floor(ms / 3.6e6);
  const d = Math.floor(h / 24);
  if (d >= 1) return `${d}d ${h % 24}h`;
  const m = Math.floor((ms % 3.6e6) / 6e4);
  return `${h}h ${m}m`;
}
