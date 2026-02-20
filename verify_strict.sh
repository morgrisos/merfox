#!/bin/bash
set -e

# Step 0: Ensure dev is dead
if pgrep -f "next dev" > /dev/null; then
    echo "Stopping detected dev server..."
    pkill -f "next dev" || true
    sleep 2
fi

echo "=== A) LISTEN CHECK (13337) ==="
lsof -nP -iTCP:13337 -sTCP:LISTEN || true

echo ""
echo "=== B) PID (from lsof) ==="
PID="$(lsof -nP -iTCP:13337 -sTCP:LISTEN 2>/dev/null | awk 'NR==2{print $2}')"
echo "PID=$PID"

echo ""
echo "=== C) PID FULL ARGS (must show /Applications/MerFox.app) ==="
if [ -n "$PID" ]; then
    ps -p "$PID" -ww -o pid=,comm=,args= || true
else
    echo "No PID found on 13337."
fi

echo ""
echo "=== D) /Applications Info.plist version ==="
/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" /Applications/MerFox.app/Contents/Info.plist 2>/dev/null || true
/usr/libexec/PlistBuddy -c "Print :CFBundleVersion" /Applications/MerFox.app/Contents/Info.plist 2>/dev/null || true

echo ""
echo "=== E) Packaged API: /api/version (timeout strict) ==="
curl -sS --connect-timeout 2 --max-time 3 http://127.0.0.1:13337/api/version || echo "[FAIL] version"

echo ""
echo "=== F) Packaged API: /api/health (timeout strict) ==="
curl -sS --connect-timeout 2 --max-time 3 http://127.0.0.1:13337/api/health || echo "[FAIL] health"

echo ""
echo "=== G) Packaged API: /api/scraper/status ==="
curl -sS --connect-timeout 2 --max-time 3 http://127.0.0.1:13337/api/scraper/status | head -c 300; echo

echo ""
echo "=== H) Latest Run Probe ==="
bash skills/merfox_tsv_gate/scripts/run_latest_probe.sh || echo "[FAIL] Script not found"

echo ""
echo "=== I) raw.csv line count ==="
RUNS_DIR="$HOME/Library/Application Support/merfox/MerFox/runs"
[ -d "$RUNS_DIR" ] || RUNS_DIR="$HOME/Library/Application Support/MerFox/MerFox/runs"

if [ -d "$RUNS_DIR" ]; then
    LATEST="$(ls -dt "$RUNS_DIR"/* | head -n 1)"
    echo "LATEST_RUN=$LATEST"
    if [ -f "$LATEST/raw.csv" ]; then
        wc -l "$LATEST/raw.csv"
    else
        echo "[FAIL] raw.csv missing in $LATEST"
    fi
else
    echo "[FAIL] Runs dir not found: $RUNS_DIR"
fi
