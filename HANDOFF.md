# Handoff / Resume notes

Last worked: 2026-09-17. Paused mid-way through the **"5-hour session window as priority"** UI rework.

## ✅ Already DONE and LIVE (before this rework)

- **Collector** (`collector/`): parses `~/.claude/projects/**/*.jsonl`, aggregates hourly, best-effort live limits from Claude's private OAuth endpoint, pushes to dashboard, writes `~/.claude-usage/summary.json`. Installed as **launchd agent** `com.claudeusage.collector` (currently every 3h).
- **Neon DB**: schema applied (`usage_hourly`, `limit_snapshots`, `plan_config`). Connection string is in `dashboard/.env.local` (gitignored).
- **Dashboard**: deployed to **https://claude-usage-wiyse.vercel.app** (Vercel team `wiyse`, free usage). Env vars set: `DATABASE_URL`, `INGEST_TOKEN`, `SUMMARY_TOKEN`, `CRON_SECRET`.
- **Mac app**: menu bar app + widget, builds & runs. Local config in `mac/Shared/BuildConfig.swift` (gitignored) has prod URL + `SUMMARY_TOKEN`.
- **Secrets**: all tokens in `/Users/ankitaniket/Documents/Projects/claude-usage/.secrets.local` (gitignored).
- **Repo**: https://github.com/ankitaniket/claude-usage (private).
- **Live % remaining WORKS**: the endpoint returns `five_hour` (session) + `seven_day` (weekly) utilization + reset times.

## 🚧 IN PROGRESS — "session-first" rework (code edited, NOT built/deployed/committed cleanly)

Goal: make the **5-hour session window** the hero metric everywhere (it's the one that blocks you at 100%), with its reset countdown; weekly/opus become secondary.

### Edited (needs verification):
- `dashboard/lib/queries.ts` — `Summary` now nested: `session`/`week`/`opus` as `WindowStat {usedPct,remainingPct,resetsAt}`. `computeSummary` rewritten with `latest(win)` + `estimate()` helpers. **DONE.**
- `dashboard/lib/insights.ts` — added `sessionInsight()` + `resetsInText()`. **DONE.**
- `dashboard/app/page.tsx` — session hero ring + `LimitBar` for weekly/opus. **DONE.**
- `dashboard/app/components/Ui.tsx` — added `LimitBar`. **DONE.**
- `collector/src/types.ts` — nested `Summary` + `WindowStat`. **DONE.** (collector rebuilt OK earlier)
- `collector/src/summary.ts` — `buildSummary(store, limits[])` builds session/week/opus. **DONE.**
- `collector/src/index.ts` — passes all limits, new log line. **DONE.**
- `mac/Shared/Summary.swift` — nested `WindowStat`. **DONE.**
- `mac/App/UsageStore.swift` — `menuBarText`/`tint` use `session.usedPct`. **DONE.**
- `mac/App/MenuContentView.swift` — session-first dropdown + `limitRow`. **DONE.**

### ❌ REMAINING to finish the rework (in order):

1. **Update the widget** `mac/Widget/ClaudeUsageWidget.swift`:
   - `RingView(pct: s?.session.usedPct)` (was `weekUsedPct`).
   - Reset line: use `s.session.resetsAt` and show "session · resets in …".
   - Show weekly as a small secondary line if room.
2. **Verify dashboard**: `cd dashboard && npx tsc --noEmit` (fix any leftover `weekUsedPct`/`resetsAt` refs), then `npm run build`.
3. **Rebuild + re-run collector** to emit the new-shape `summary.json` and push:
   `cd collector && npm run build && node dist/index.js`
4. **Rebuild Mac app**: `cd mac && xcodegen generate && xcodebuild -project ClaudeUsage.xcodeproj -scheme ClaudeUsage -configuration Debug -destination 'platform=macOS' CODE_SIGNING_ALLOWED=NO build`
   - then relaunch: kill old `ClaudeUsage`, `open` the built `.app`.
5. **Redeploy dashboard**: `cd dashboard && vercel --prod --yes` (the LIVE site still shows the OLD weekly-first UI until this runs).
6. **Verify**: `curl -H "Authorization: Bearer $SUMMARY_TOKEN" https://claude-usage-wiyse.vercel.app/api/summary` → expect nested `session`/`week`/`opus`.
7. **Commit + push** each logical chunk with short messages.

## 🔜 Also queued (task #10): fresher session data
- Bump collector cadence so the 5h session % isn't stale: in `collector/com.claudeusage.collector.plist` change `StartInterval` `10800` → `1800` (30 min). Then reinstall: `cd collector && bash install.sh`.

## 👤 YOUR manual steps (need your accounts/boxes)
- **EC2 cron**: clone repo on EC2, `cd cron`, `cp .env.example .env`, set `DASHBOARD_URL=https://claude-usage-wiyse.vercel.app` and `CRON_SECRET` (from `.secrets.local`), `chmod +x rollup.sh && ./rollup.sh` to test, then add crontab `0 */5 * * *` (see `cron/README.md`).
- **Make Mac app permanent**: open `mac/ClaudeUsage.xcodeproj` in Xcode, select your Apple ID team, Run once (registers the widget so it appears in the widget gallery), then add the app to System Settings → General → Login Items.
- **Tune real limits** (optional): update `plan_config` rows `weekly_token_limit` / `five_hour_token_limit` to your actual plan so the *estimated* fallback matches (live endpoint values are used when available).

## Notes / gotchas
- `limit_snapshots` column is **`win`** not `window` (reserved word).
- Collector sends **absolute** per-bucket totals; ingest upserts idempotently — safe to re-run.
- Collector `dist/` must be rebuilt after any `src/` change (stale dist caused a bug earlier).
- The `.secrets.local`, `dashboard/.env.local`, `collector/.env`, `mac/Shared/BuildConfig.swift` files are gitignored — they hold the real tokens/URL and won't be in the repo.
