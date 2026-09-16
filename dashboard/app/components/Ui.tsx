import { fmtTokens, usageColor } from "@/lib/format";

/** SVG progress ring for weekly % used. */
export function UsageRing({
  pct,
  label,
  sub,
}: {
  pct: number | null;
  label: string;
  sub?: string;
}) {
  const r = 78;
  const c = 2 * Math.PI * r;
  const val = pct == null ? 0 : Math.min(100, Math.max(0, pct));
  const color = usageColor(pct);
  return (
    <div className="relative flex items-center justify-center">
      <svg width="188" height="188" className="-rotate-90">
        <circle
          cx="94"
          cy="94"
          r={r}
          fill="none"
          stroke="rgba(255,255,255,0.08)"
          strokeWidth="14"
        />
        <circle
          cx="94"
          cy="94"
          r={r}
          fill="none"
          stroke={color}
          strokeWidth="14"
          strokeLinecap="round"
          strokeDasharray={c}
          strokeDashoffset={c - (val / 100) * c}
          style={{ transition: "stroke-dashoffset .6s ease" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-4xl font-semibold tabular-nums" style={{ color }}>
          {pct == null ? "—" : `${Math.round(pct)}%`}
        </span>
        <span className="text-xs uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        {sub && <span className="mt-1 text-xs text-neutral-400">{sub}</span>}
      </div>
    </div>
  );
}

/** Secondary limit as a labeled progress bar (weekly, opus). */
export function LimitBar({
  label,
  pct,
  resets,
}: {
  label: string;
  pct: number | null;
  resets: string | null;
}) {
  const color = usageColor(pct);
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
      <div className="flex items-baseline justify-between">
        <span className="text-xs uppercase tracking-wider text-neutral-500">
          {label}
        </span>
        <span className="text-sm font-semibold tabular-nums" style={{ color }}>
          {pct == null ? "—" : `${Math.round(pct)}%`}
        </span>
      </div>
      <div className="mt-2 h-2 overflow-hidden rounded-full bg-white/5">
        <div
          className="h-full rounded-full"
          style={{ width: `${pct == null ? 0 : Math.min(100, pct)}%`, background: color }}
        />
      </div>
      <div className="mt-1.5 text-xs text-neutral-500">
        {resets ? `resets in ${resets}` : " "}
      </div>
    </div>
  );
}

export function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
      <div className="text-xs uppercase tracking-wider text-neutral-500">
        {label}
      </div>
      <div className="mt-2 text-2xl font-semibold tabular-nums text-neutral-100">
        {value}
      </div>
      {hint && <div className="mt-1 text-xs text-neutral-500">{hint}</div>}
    </div>
  );
}

export function ModelSplit({
  data,
}: {
  data: { model: string; tokens: number; cost: number }[];
}) {
  const total = data.reduce((s, d) => s + d.tokens, 0) || 1;
  const colors: Record<string, string> = {
    opus: "#c77dff",
    sonnet: "#5aa9e8",
    haiku: "#3ecf8e",
  };
  const colorFor = (m: string) => {
    const k = Object.keys(colors).find((c) => m.toLowerCase().includes(c));
    return k ? colors[k] : "#9aa0aa";
  };
  return (
    <div className="space-y-3">
      <div className="flex h-3 overflow-hidden rounded-full bg-white/5">
        {data.map((d) => (
          <div
            key={d.model}
            style={{
              width: `${(d.tokens / total) * 100}%`,
              background: colorFor(d.model),
            }}
          />
        ))}
      </div>
      <div className="space-y-2">
        {data.map((d) => (
          <div key={d.model} className="flex items-center justify-between text-sm">
            <div className="flex items-center gap-2">
              <span
                className="h-2.5 w-2.5 rounded-full"
                style={{ background: colorFor(d.model) }}
              />
              <span className="text-neutral-300">{d.model}</span>
            </div>
            <span className="tabular-nums text-neutral-500">
              {fmtTokens(d.tokens)} · {Math.round((d.tokens / total) * 100)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Day-of-week × hour activity heatmap. */
export function Heatmap({
  cells,
}: {
  cells: { dow: number; hour: number; tokens: number }[];
}) {
  const grid = new Map<string, number>();
  let max = 0;
  for (const c of cells) {
    grid.set(`${c.dow}-${c.hour}`, c.tokens);
    if (c.tokens > max) max = c.tokens;
  }
  const days = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  const intensity = (t: number) => {
    if (!t || !max) return "rgba(255,255,255,0.04)";
    const a = 0.12 + 0.8 * (t / max);
    return `rgba(62,207,142,${a.toFixed(3)})`;
  };
  return (
    <div className="overflow-x-auto">
      <div className="inline-block">
        <div className="flex pl-9">
          {Array.from({ length: 24 }, (_, h) => (
            <div
              key={h}
              className="w-[14px] text-center text-[9px] text-neutral-600"
            >
              {h % 6 === 0 ? h : ""}
            </div>
          ))}
        </div>
        {days.map((day, dow) => (
          <div key={day} className="flex items-center">
            <div className="w-9 text-[10px] text-neutral-500">{day}</div>
            {Array.from({ length: 24 }, (_, h) => {
              const t = grid.get(`${dow}-${h}`) ?? 0;
              return (
                <div
                  key={h}
                  title={`${day} ${h}:00 — ${fmtTokens(t)}`}
                  className="m-[1px] h-3 w-3 rounded-[3px]"
                  style={{ background: intensity(t) }}
                />
              );
            })}
          </div>
        ))}
      </div>
    </div>
  );
}
