#!/usr/bin/env bash
# Install the Claude Usage collector as a launchd agent (runs every 3h).
set -euo pipefail

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
NODE="$(command -v node)"
LABEL="com.claudeusage.collector"
PLIST_DST="$HOME/Library/LaunchAgents/$LABEL.plist"

if [ ! -f "$DIR/.env" ]; then
  echo "!! $DIR/.env not found. Copy .env.example to .env and fill it first."
  exit 1
fi

echo "==> Building collector"
( cd "$DIR" && npm install --silent && npm run build --silent )

echo "==> Writing launchd plist to $PLIST_DST"
mkdir -p "$HOME/Library/LaunchAgents"
sed -e "s#__NODE__#$NODE#g" -e "s#__DIR__#$DIR#g" \
  "$DIR/com.claudeusage.collector.plist" > "$PLIST_DST"

echo "==> (Re)loading agent"
launchctl unload "$PLIST_DST" 2>/dev/null || true
launchctl load "$PLIST_DST"
launchctl kickstart -k "gui/$(id -u)/$LABEL" 2>/dev/null || true

echo "==> Done. Status:"
launchctl list | grep "$LABEL" || true
echo "Logs: $DIR/collector.log"
echo "To uninstall: launchctl unload '$PLIST_DST' && rm '$PLIST_DST'"
