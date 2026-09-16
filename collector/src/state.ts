import fs from "node:fs";
import { paths } from "./config.js";
import type { AggregateStore, State } from "./types.js";

function readJson<T>(file: string, fallback: T): T {
  try {
    return JSON.parse(fs.readFileSync(file, "utf8")) as T;
  } catch {
    return fallback;
  }
}

/** Write atomically so a crash can't corrupt state. */
function writeJson(file: string, data: unknown): void {
  const tmp = `${file}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(data, null, 2));
  fs.renameSync(tmp, file);
}

export function loadState(): State {
  return readJson<State>(paths.state, { files: {} });
}

export function saveState(state: State): void {
  writeJson(paths.state, state);
}

export function loadAggregates(): AggregateStore {
  return readJson<AggregateStore>(paths.aggregates, { buckets: {} });
}

export function saveAggregates(store: AggregateStore): void {
  writeJson(paths.aggregates, store);
}
