#!/bin/bash
set -u

echo "========================"
echo "Step 1: App Version Info"
APP="/Applications/MerFox.app"
echo "Check App: $APP"
ls -ld "$APP" || echo "App not found"
if [ -d "$APP" ]; then
  echo "ShortVersion: $(defaults read "$APP/Contents/Info.plist" CFBundleShortVersionString 2>/dev/null || echo 'N/A')"
  echo "BundleVersion: $(defaults read "$APP/Contents/Info.plist" CFBundleVersion 2>/dev/null || echo 'N/A')"
  echo "Codesign:"
  codesign -dv --verbose=4 "$APP" 2>&1 | head -n 10
else
  echo "SKIP: App missing"
fi

echo ""
echo "========================"
echo "Step 2: UserData Check"
BASE="$HOME/Library/Application Support/merfox/MerFox"
echo "BASE=$BASE"
if [ -d "$BASE" ]; then
  ls -ld "$BASE"
  echo "-- Recent Files --"
  find "$BASE" -maxdepth 2 -type f \( -name "mapping.csv" -o -name "run.log" -o -name "*.log" -o -name "*.tsv" -o -name "*.csv" \) -exec ls -lah {} + 2>/dev/null | head -n 20
else
  echo "BASE directory missing"
fi

RUNS="$BASE/runs"
echo "-- Runs Dir --"
if [ -d "$RUNS" ]; then
  ls -ld "$RUNS"
  echo "Top 5 recent runs:"
  ls -lt "$RUNS" | head -n 6
  LATEST_RUN="$(ls -td "$RUNS"/* 2>/dev/null | head -n 1)"
  echo "LATEST_RUN=$LATEST_RUN"
else
  echo "Runs dir missing"
fi

echo ""
echo "========================"
echo "Step 3: Port Detection"
HOST="127.0.0.1"
PORT=""
for p in 13337 3001 3333; do
  if curl -fsS --max-time 1 "http://$HOST:$p/api/health" >/dev/null 2>&1; then
    echo "Found Health API on $p"
    PORT="$p"
    break
  fi
done

if [ -z "$PORT" ]; then
  for p in 13337 3001 3333; do
    if curl -fsS --max-time 1 "http://$HOST:$p/" >/dev/null 2>&1; then
      echo "Found Root on $p"
      PORT="$p"
      break
    fi
  done
fi
echo "PORT=$PORT"

if [ -n "$PORT" ]; then
  echo "Checking /api/runs..."
  curl -fsS --max-time 3 "http://$HOST:$PORT/api/runs?limit=3" > /dev/null && echo "API OK" || echo "API FAIL"
  echo "Checking /api/mapping..."
  curl -fsS --max-time 3 "http://$HOST:$PORT/api/mapping" > /dev/null && echo "API OK" || echo "API FAIL"
fi

echo ""
echo "========================"
echo "Step 4: Scrape Simulation (UI Proxy)"
if [ -n "$PORT" ]; then
  echo "Triggering Scrape via API ($PORT)..."
  curl -sS -X POST "http://$HOST:$PORT/api/automation/run?force=true" \
    -H "content-type: application/json" \
    -d "{\"targetUrl\":\"https://jp.mercari.com/search?keyword=test2\",\"mode\":\"automation\"}" > /dev/null 2>&1
  
  echo "Waiting 20s for processing..."
  sleep 20
else
  echo "SKIP: No Port, cannot simulate scrape."
fi

echo "Checking LATEST_RUN again..."
LATEST_RUN="$(ls -td "$RUNS"/* 2>/dev/null | head -n 1)"
echo "LATEST_RUN=$LATEST_RUN"

if [ -d "$LATEST_RUN" ]; then
  echo "Checking raw.csv..."
  ls -l "$LATEST_RUN/raw.csv" 2>/dev/null || echo "raw.csv missing"
  if [ -f "$LATEST_RUN/raw.csv" ]; then
     head -n 5 "$LATEST_RUN/raw.csv"
  fi
fi

echo ""
echo "========================"
echo "Step 5: Log Check"
if [ -d "$LATEST_RUN" ]; then
  LOG="$LATEST_RUN/run.log"
  echo "LOG=$LOG"
  if [ -f "$LOG" ]; then
    ls -lh "$LOG"
    echo "Tail 50:"
    tail -n 50 "$LOG"
  else
    echo "run.log missing"
  fi
fi
