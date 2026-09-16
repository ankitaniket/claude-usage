import {
  computeSummary,
  getDailyTrend,
  getModelSplit,
  getProjectSplit,
  getHourHeatmap,
  type Summary,
} from "@/lib/queries";
import { sessionInsight } from "@/lib/insights";
import { fmtTokens, fmtUsd, shortModel, resetsIn } from "@/lib/format";
import { TrendChart, ProjectBars } from "./components/Charts";
import { UsageRing, StatCard, ModelSplit, Heatmap, LimitBar } from "./components/Ui";

export const dynamic = "force-dynamic";

function toNum(v: unknown): number {
  const n = typeof v === "string" ? parseFloat(v) : (v as number);
  return Number.isFinite(n) ? n : 0;
}

export default async function Page() {
  let data:
    | {
        summary: Summary;
        trend: { day: string; tokens: number }[];
        models: { model: string; tokens: number; cost: number }[];
        projects: { project: string; tokens: number }[];
        heat: { dow: number; hour: number; tokens: number }[];
      }
    | null = null;
  let error: string | null = null;

  try {
    const [summary, trendRaw, modelsRaw, projectsRaw, heatRaw] =
      await Promise.all([
        computeSummary(),
        getDailyTrend(30),
        getModelSplit(7),
        getProjectSplit(7),
        getHourHeatmap(14),
      ]);
    data = {
      summary,
      trend: trendRaw.map((r) => ({ day: r.day, tokens: toNum(r.tokens) })),
      models: modelsRaw.map((r) => ({
        model: r.model,
        tokens: toNum(r.tokens),
        cost: toNum(r.cost),
      })),
      projects: projectsRaw.map((r) => ({
        project: r.project,
        tokens: toNum(r.tokens),
      })),
      heat: heatRaw.map((r) => ({
        dow: r.dow,
        hour: r.hour,
        tokens: toNum(r.tokens),
      })),
    };
  } catch (e) {
    error = (e as Error).message;
  }

  if (!data) {
    return (
      <main className="mx-auto max-w-2xl px-6 py-24">
        <h1 className="text-2xl font-semibold text-neutral-100">Claude Usage</h1>
        <div className="mt-6 rounded-2xl border border-amber-500/30 bg-amber-500/5 p-6 text-sm text-amber-200/90">
          <p className="font-medium">Not connected yet.</p>
          <p className="mt-2 text-amber-200/70">
            Set <code className="text-amber-100">DATABASE_URL</code>, run{" "}
            <code className="text-amber-100">db/schema.sql</code> against Neon,
            then let the collector push data.
          </p>
          {error && (
            <p className="mt-3 font-mono text-xs text-amber-200/50">{error}</p>
          )}
        </div>
      </main>
    );
  }

  const { summary, trend, models, projects, heat } = data;
  const insight = sessionInsight(summary.session.usedPct, summary.session.resetsAt);
  const toneRing: Record<string, string> = {
    low: "border-sky-500/30 bg-sky-500/5 text-sky-200",
    ok: "border-emerald-500/30 bg-emerald-500/5 text-emerald-200",
    high: "border-amber-500/30 bg-amber-500/5 text-amber-200",
    crit: "border-red-500/30 bg-red-500/5 text-red-200",
  };
  const sessionResets = resetsIn(summary.session.resetsAt);
  const weekResets = resetsIn(summary.week.resetsAt);

  return (
    <main className="mx-auto max-w-6xl px-6 py-10">
      <header className="flex items-baseline justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-neutral-100">
            Claude Usage
          </h1>
          <p className="mt-1 text-sm text-neutral-500">
            Your live Claude limits — no need to open the usage page ·{" "}
            <span
              className={
                summary.source === "endpoint"
                  ? "text-emerald-400"
                  : "text-neutral-500"
              }
            >
              {summary.source === "endpoint" ? "live" : "estimated"}
            </span>
          </p>
        </div>
        <span className="text-xs text-neutral-600">
          updated {new Date(summary.generatedAt).toLocaleString()}
        </span>
      </header>

      {/* HERO: 5-hour session window (the one that blocks you) */}
      <section className="mt-8 grid gap-5 lg:grid-cols-[auto_1fr]">
        <div className="flex flex-col items-center justify-center rounded-2xl border border-white/10 bg-white/[0.03] p-6">
          <span className="mb-2 text-xs font-medium uppercase tracking-wider text-neutral-400">
            Current session · 5h
          </span>
          <UsageRing
            pct={summary.session.usedPct}
            label="used"
            sub={sessionResets ? `resets in ${sessionResets}` : "reset time n/a"}
          />
        </div>

        <div className="flex flex-col gap-5">
          <div className={`rounded-2xl border p-5 ${toneRing[insight.tone]}`}>
            <div className="text-sm font-semibold">{insight.title}</div>
            <div className="mt-1 text-sm opacity-80">{insight.detail}</div>
          </div>
          {/* Secondary limits: weekly + opus */}
          <div className="grid gap-4 sm:grid-cols-2">
            <LimitBar
              label="Weekly · all models"
              pct={summary.week.usedPct}
              resets={weekResets}
            />
            <LimitBar
              label="Weekly · Opus"
              pct={summary.opus.usedPct}
              resets={resetsIn(summary.opus.resetsAt)}
            />
          </div>
          <div className="grid gap-4 sm:grid-cols-4">
            <StatCard
              label="Today"
              value={fmtTokens(summary.todayTokens)}
              hint="tokens"
            />
            <StatCard
              label="This week"
              value={fmtTokens(summary.weekTokens)}
              hint="tokens"
            />
            <StatCard
              label="Cost-equiv"
              value={fmtUsd(summary.weekCostUsd)}
              hint="this week"
            />
            <StatCard
              label="Top model"
              value={shortModel(summary.dominantModel)}
              hint={`${summary.activeHoursToday}h active today`}
            />
          </div>
        </div>
      </section>

      {/* Trend */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-3 text-sm font-medium text-neutral-300">
          Daily tokens · last 30 days
        </h2>
        <TrendChart data={trend} />
      </section>

      {/* Model + project split */}
      <section className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-4 text-sm font-medium text-neutral-300">
            Model split · last 7 days
          </h2>
          {models.length ? (
            <ModelSplit data={models} />
          ) : (
            <p className="text-sm text-neutral-600">No data yet.</p>
          )}
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-5">
          <h2 className="mb-4 text-sm font-medium text-neutral-300">
            Top projects · last 7 days
          </h2>
          {projects.length ? (
            <ProjectBars data={projects} />
          ) : (
            <p className="text-sm text-neutral-600">No data yet.</p>
          )}
        </div>
      </section>

      {/* Heatmap */}
      <section className="mt-6 rounded-2xl border border-white/10 bg-white/[0.03] p-5">
        <h2 className="mb-4 text-sm font-medium text-neutral-300">
          Active hours · last 14 days
        </h2>
        <Heatmap cells={heat} />
      </section>

      <footer className="mt-10 text-center text-xs text-neutral-700">
        Claude Usage Tracker · collector → Neon → dashboard
      </footer>
    </main>
  );
}
