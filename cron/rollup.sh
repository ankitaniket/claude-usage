#!/usr/bin/env bash
# Calls the dashboard's 5-hour rollup endpoint. Run this from cron on your EC2
# box (or anywhere). Resets the 5h window, refreshes the cached summary.
#
# Reads DASHBOARD_URL and CRON_SECRET from the environment, or from a
# cron/.env file sitting next to this script.
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
[ -f "$DIR/.env" ] && set -a && . "$DIR/.env" && set +a

: "${DASHBOARD_URL:?set DASHBOARD_URL}"
: "${CRON_SECRET:?set CRON_SECRET}"

code=$(curl -sS -o /tmp/claude-rollup.out -w "%{http_code}" \
  -H "Authorization: Bearer $CRON_SECRET" \
  "${DASHBOARD_URL%/}/api/cron/rollup")

echo "$(date -u +%FT%TZ) HTTP $code $(cat /tmp/claude-rollup.out)"
[ "$code" = "200" ]
