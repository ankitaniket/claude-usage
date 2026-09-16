# Claude Usage Tracker

Track how much of your Claude you actually use — like tracking an employee, where the employee is Claude.

Automatically records your Claude Code usage every few hours into **Neon**, shows insights on a **dashboard**, and surfaces a glanceable **"% left this week"** in a Mac **menu bar app** and **desktop widget** — so you open your laptop, see how much is left, and pick the right model.

## Architecture

```
 Mac (data lives here)              Cloud (Vercel + Neon)          Clients
  collector (launchd, 3h)  ──push──▶  Next.js dashboard  ──API──▶  Mac menu bar
   parse ~/.claude/*.jsonl            /api/ingest (write)          Mac widget
   pricing → cost-equiv               /api/summary (read)          Android (later)
   best-effort live % rem             /api/cron/rollup (5h)
   local summary.json                 Neon Postgres
```

- **collector/** — Node/TS. Parses Claude Code transcripts, aggregates hourly usage, best-effort live "% remaining", pushes to the dashboard, writes a local summary for the widget. Runs via launchd every 3h.
- **dashboard/** — Next.js (App Router) on Vercel + Neon. Ingest & summary APIs, a 5-hourly cron rollup, and the metrics/insights UI.
- **mac/** — SwiftUI menu bar app + WidgetKit widget (generated with `xcodegen`).

## Setup

1. **Dashboard**: provision Neon, run `dashboard/db/schema.sql`, set `DATABASE_URL`, `INGEST_TOKEN`, `SUMMARY_TOKEN`, `CRON_SECRET`, deploy to Vercel.
2. **Collector**: `cp collector/.env.example collector/.env` (fill `DASHBOARD_URL` + `INGEST_TOKEN`), then `bash collector/install.sh`.
3. **Mac app**: fill `mac/Shared/BuildConfig.swift`, `cd mac && xcodegen generate`, open in Xcode, select your team, run.

## Verify

- Collector: `cd collector && npm run once` → check `~/.claude-usage/summary.json`.
- Dashboard: open the deployed URL; `curl -H "Authorization: Bearer $SUMMARY_TOKEN" $URL/api/summary`.
