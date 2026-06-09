#!/bin/bash
# Single-layer patrol pipeline — run as ONE background Bash from the main agent:
#   bash scripts/patrol.sh <patrol_number> [--skip-scrape]
#
# Why this exists (patrol 484 lesson): a subagent that backgrounds scrape.js and
# waits to be re-invoked is a two-layer relay — if the inner wake-up never fires,
# everything after scrape silently hangs. One script, one background Bash, one
# completion notification. --skip-scrape resumes from an existing raw_results
# (takeover after a broken relay) without re-hitting Carousell.
#
# Verbose output goes to /tmp/carousell_patrol_<N>.log; stdout stays compact
# (last lines per step + PATROL_* markers) so the agent can read it whole.
set -uo pipefail
cd "$(dirname "$0")/.."

N="${1:?usage: patrol.sh <patrol_number> [--skip-scrape]}"
SKIP_SCRAPE="${2:-}"
LOG="/tmp/carousell_patrol_${N}.log"
: > "$LOG"

step() {
  local name="$1"; shift
  echo "--- $name ---"
  "$@" 2>&1 | tee -a "$LOG" | tail -8
  local code=$?
  if [ "$name" = "scrape" ] && [ "$code" -eq 2 ]; then
    echo "PATROL_RESULT: CF_BLOCKED (exit 2) — IP-level Cloudflare block, tell User to turn off VPN; scrape aborted before writing files"
    exit 2
  fi
  if [ "$code" -ne 0 ]; then
    echo "PATROL_RESULT: ${name}_FAILED exit $code (full log: $LOG)"
    exit "$code"
  fi
}

if [ "$SKIP_SCRAPE" = "--skip-scrape" ]; then
  echo "--- scrape skipped (takeover from existing raw_results) ---"
else
  step scrape node scripts/scrape.js
fi
step velocity_log   node scripts/velocity_log.js
step velocity_check node scripts/velocity_check.js 120
step velocity_sold  node scripts/velocity_sold_table.js
step process        node scripts/process.js

NV=$(python3 -c "import json; print(len(json.load(open('state/need_verify.json'))))")
echo "PATROL_NEED_VERIFY: $NV"
echo "PATROL_RESULT: OK (full log: $LOG)"
