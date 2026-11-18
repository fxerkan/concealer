#!/bin/sh
# Development instance of this checkout: its own vault and a fixed port, so it never mixes with
# the installed concealer (8787) or the vault that lives next to this script.
#   ./dev.sh          start (creates the dev vault with sample data on first run)
#   ./dev.sh reset    wipe the dev vault, then start fresh
# Web UI: http://127.0.0.1:18787 · master password: demo
# Chrome extension: popup ⚙ → App port 18787 (back to 8787 for the installed app).
set -e
cd "$(dirname "$0")"
PORT=18787
export CONCEALER_HOME="${CONCEALER_DEV_HOME:-$HOME/.concealer-dev}" CONCEALER_NO_OPEN=1
[ "$1" = reset ] && rm -rf "$CONCEALER_HOME"
if [ ! -f "$CONCEALER_HOME/secrets.enc.yaml" ]; then
  mkdir -p "$CONCEALER_HOME"
  tok=$(printf 'demo\ndemo\n' | ./concealer init 2>/dev/null | sed -n 's/.*CONCEALER_TOKEN=\([A-Za-z0-9_.-]*\).*/\1/p' | head -n 1)
  CONCEALER_TOKEN="$tok" ./concealer _demo-seed
fi
echo "concealer dev → http://127.0.0.1:$PORT  (master password: demo, vault: $CONCEALER_HOME)"
exec ./concealer web "$PORT"
