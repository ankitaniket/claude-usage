-- Claude Usage Tracker schema (Neon Postgres)

-- Hourly, fully-aggregated usage. The collector sends ABSOLUTE totals per
-- (bucket, model, project); ingest replaces on conflict, so re-sends and
-- retries are idempotent.
CREATE TABLE IF NOT EXISTS usage_hourly (
  bucket_ts       timestamptz NOT NULL,
  model           text        NOT NULL,
  project         text        NOT NULL,
  input_tokens    bigint      NOT NULL DEFAULT 0,
  output_tokens   bigint      NOT NULL DEFAULT 0,
  cache_read      bigint      NOT NULL DEFAULT 0,
  cache_creation  bigint      NOT NULL DEFAULT 0,
  cost_usd        numeric     NOT NULL DEFAULT 0,
  message_count   integer     NOT NULL DEFAULT 0,
  updated_at      timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (bucket_ts, model, project)
);

CREATE INDEX IF NOT EXISTS usage_hourly_ts_idx ON usage_hourly (bucket_ts);

-- Point-in-time limit readings. From the live endpoint ('endpoint') or
-- computed by the cron rollup ('estimated').
CREATE TABLE IF NOT EXISTS limit_snapshots (
  id            bigserial PRIMARY KEY,
  captured_at   timestamptz NOT NULL DEFAULT now(),
  win           text        NOT NULL,   -- 'weekly' | '5h' | 'opus_weekly' (window is reserved)
  used_pct      numeric,
  remaining_pct numeric,
  resets_at     timestamptz,
  source        text        NOT NULL DEFAULT 'estimated'
);

CREATE INDEX IF NOT EXISTS limit_snapshots_window_idx
  ON limit_snapshots (win, captured_at DESC);

-- Small key/value config: your plan's weekly limit, the last collector ping,
-- and the cached summary the cron refreshes.
CREATE TABLE IF NOT EXISTS plan_config (
  key   text PRIMARY KEY,
  value jsonb NOT NULL
);

-- Sensible defaults (safe to re-run).
INSERT INTO plan_config (key, value) VALUES
  ('weekly_token_limit',   '30000000'::jsonb),
  ('weekly_cost_limit',    '2500'::jsonb),
  ('five_hour_token_limit','8000000'::jsonb)
ON CONFLICT (key) DO NOTHING;
