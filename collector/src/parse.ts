import fs from "node:fs";
import path from "node:path";
import { config } from "./config.js";
import type { State, UsageEvent } from "./types.js";

/** Recursively list every *.jsonl transcript under the projects dir. */
function listTranscripts(dir: string): string[] {
  const out: string[] = [];
  let entries: fs.Dirent[];
  try {
    entries = fs.readdirSync(dir, { withFileTypes: true });
  } catch {
    return out;
  }
  for (const e of entries) {
    const full = path.join(dir, e.name);
    if (e.isDirectory()) out.push(...listTranscripts(full));
    else if (e.isFile() && e.name.endsWith(".jsonl")) out.push(full);
  }
  return out;
}

/** Derive a friendly project name from a transcript's cwd, else the dir name. */
function projectName(cwd: string | undefined, fallbackPath: string): string {
  if (cwd && typeof cwd === "string") {
    const base = path.basename(cwd);
    if (base) return base;
  }
  // Fallback: decode the encoded project dir (…/projects/<encoded>/file.jsonl)
  const dir = path.basename(path.dirname(fallbackPath));
  return dir.replace(/^-/, "").split("-").pop() || dir;
}

function toNum(v: unknown): number {
  return typeof v === "number" && Number.isFinite(v) ? v : 0;
}

/**
 * Read new lines from every transcript since the last run.
 * Mutates `state.files` offsets. Returns newly-seen usage events (deduped by
 * requestId within this batch).
 */
export function parseNewEvents(state: State): UsageEvent[] {
  const events: UsageEvent[] = [];
  const seen = new Set<string>();
  const files = listTranscripts(config.projectsDir);

  for (const file of files) {
    let size: number;
    try {
      size = fs.statSync(file).size;
    } catch {
      continue;
    }
    const prev = state.files[file] ?? { offset: 0, size: 0 };
    // File truncated/rotated → start over.
    let offset = size < prev.offset ? 0 : prev.offset;
    if (size <= offset) {
      state.files[file] = { offset: size, size };
      continue;
    }

    const fd = fs.openSync(file, "r");
    try {
      const len = size - offset;
      const buf = Buffer.allocUnsafe(len);
      fs.readSync(fd, buf, 0, len, offset);
      // Only consume up to the last complete line (ends with \n).
      const lastNl = buf.lastIndexOf(0x0a);
      if (lastNl === -1) {
        // No complete line yet; leave offset as-is.
        state.files[file] = { offset, size };
        continue;
      }
      const consumable = buf.subarray(0, lastNl).toString("utf8");
      offset += lastNl + 1;

      for (const line of consumable.split("\n")) {
        if (!line.trim()) continue;
        let d: any;
        try {
          d = JSON.parse(line);
        } catch {
          continue;
        }
        if (d?.type !== "assistant") continue;
        const usage = d?.message?.usage;
        if (!usage) continue;
        const requestId: string =
          d.requestId || d?.message?.id || `${file}:${offset}:${events.length}`;
        if (seen.has(requestId)) continue;
        seen.add(requestId);

        events.push({
          ts: d.timestamp || new Date().toISOString(),
          model: d?.message?.model || "unknown",
          project: projectName(d.cwd, file),
          requestId,
          input: toNum(usage.input_tokens),
          output: toNum(usage.output_tokens),
          cacheRead: toNum(usage.cache_read_input_tokens),
          cacheCreation: toNum(usage.cache_creation_input_tokens),
        });
      }
      state.files[file] = { offset, size };
    } finally {
      fs.closeSync(fd);
    }
  }

  return events;
}
