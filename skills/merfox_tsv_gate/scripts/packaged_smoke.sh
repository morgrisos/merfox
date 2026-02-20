#!/bin/bash
set -euo pipefail
PORT=13337
echo "SMOKE TEST: Port $PORT"
env -i HOME="$HOME" PATH="/usr/bin:/bin" open -a "/Applications/MerFox.app"
sleep 5
lsof -i:$PORT -sTCP:LISTEN || echo "FAIL: Not listening"
