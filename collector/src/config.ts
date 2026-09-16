import os from "node:os";
import path from "node:path";
import fs from "node:fs";

/** Load a very small .env file (KEY=VALUE lines) without a dependency. */
function loadDotEnv(): void {
  const envPath = path.join(process.cwd(), ".env");
  if (!fs.existsSync(envPath)) return;
  const text = fs.readFileSync(envPath, "utf8");
  for (const rawLine of text.split(/\r?\n/)) {
    const line = rawLine.trim();
    if (!line || line.startsWith("#")) continue;
    const eq = line.indexOf("=");
    if (eq === -1) continue;
    const key = line.slice(0, eq).trim();
    let value = line.slice(eq + 1).trim();
    if (
      (value.startsWith('"') && value.endsWith('"')) ||
      (value.startsWith("'") && value.endsWith("'"))
    ) {
      value = value.slice(1, -1);
    }
    if (!(key in process.env)) process.env[key] = value;
  }
}

loadDotEnv();

const home = os.homedir();
const claudeHome = process.env.CLAUDE_HOME || path.join(home, ".claude");

export const config = {
  /** Root of Claude Code's data. */
  claudeHome,
  /** Where session transcripts live. */
  projectsDir: path.join(claudeHome, "projects"),
  /** Our own state/output directory. */
  dataDir: path.join(home, ".claude-usage"),
  dashboardUrl: (process.env.DASHBOARD_URL || "").replace(/\/$/, ""),
  ingestToken: process.env.INGEST_TOKEN || "",
  enableLiveUsage: process.env.ENABLE_LIVE_USAGE === "1",
  /** Prune local aggregate buckets older than this (days). */
  retentionDays: 120,
} as const;

export const paths = {
  state: path.join(config.dataDir, "state.json"),
  aggregates: path.join(config.dataDir, "aggregates.json"),
  summary: path.join(config.dataDir, "summary.json"),
};

/** Ensure our data directory exists. */
export function ensureDataDir(): void {
  fs.mkdirSync(config.dataDir, { recursive: true });
}
