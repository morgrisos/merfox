#!/bin/bash
# verify_packaged.sh - Robust verification for MerFox Packaged App
cd /Users/yuga/VSCode/V4/merfox

LOG_FILE="verify_packaged.log"
rm -f "$LOG_FILE"

log() {
    echo "[$(date +'%T')] $1" | tee -a "$LOG_FILE"
}

# 1. Verification of Clean State
log "=== 1. Checking Clean State ==="
if lsof -nP -iTCP:3001 -sTCP:LISTEN >/dev/null; then
    log "ERROR: Port 3001 is already in use. Killing zombie..."
    lsof -t -iTCP:3001 | xargs kill -9
    sleep 2
fi

# 2. Launch App
log "=== 2. Launching Packaged App ==="
APP_PATH="dist_electron/mac-arm64/MerFox.app"
APP_BIN="$APP_PATH/Contents/MacOS/MerFox"

if [ ! -d "$APP_PATH" ]; then
    log "ERROR: App not found at $APP_PATH. Please build first (npm run electron:build)."
    exit 1
fi

nohup "$APP_BIN" > app_launch.log 2>&1 &
APP_PID=$!
log "App launched (PID: $APP_PID). Waiting for Server Health..."

# 3. Health Check (Prevent 000 Error)
# Loop up to 30 seconds for health check
MAX_RETRIES=30
HEALTH_OK=0

for i in $(seq 1 $MAX_RETRIES); do
    # Check if port is listening first
    if lsof -nP -iTCP:3001 -sTCP:LISTEN >/dev/null; then
        HTTP_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/health)
        if [ "$HTTP_CODE" -eq "200" ]; then
            log "Server Health OK (200)."
            HEALTH_OK=1
            break
        fi
    fi
    sleep 1
    echo -n "."
done
echo ""

if [ $HEALTH_OK -eq 0 ]; then
    log "ERROR: Timeout waiting for Server Health. (Is server crashing?)"
    cat app_launch.log
    kill $APP_PID
    exit 1
fi

# 4. Verify Root UI
log "=== 4. Checking UI (Root) ==="
ROOT_CODE=$(curl -s -o /dev/null -w "%{http_code}" http://127.0.0.1:3001/)
if [ "$ROOT_CODE" -eq "200" ]; then
    log "UI Root OK (200)."
else
    log "ERROR: UI Root returned $ROOT_CODE"
    kill $APP_PID
    exit 1
fi

# 5. Trigger Test Run
log "=== 5. Triggering Test Run ==="
RUN_ID="verify_pkg_$(date +%s)"
START_RES=$(curl -s -X POST -H "Content-Type: application/json" -d '{"runId":"'"$RUN_ID"'","mode":"onetime","targetUrl":"https://jp.mercari.com/search?keyword=test"}' http://127.0.0.1:3001/api/run/start)
echo "Start Response: $START_RES"

if echo "$START_RES" | grep -q '"success":true'; then
    log "Test Run Triggered Successfully."
else
    log "ERROR: Test Run Trigger Failed."
    kill $APP_PID
    exit 1
fi

# 6. Wait for Artifacts
log "=== 6. Waiting for Artifacts (Header Check) ==="
MAX_WAIT=120
FOUND=0
RUN_PATH=""

# P7: Robust RUNS_DIR Detection
detect_runs_dir() {
    if [ -n "$MERFOX_RUNS_DIR" ] && [ -d "$MERFOX_RUNS_DIR" ]; then
        echo "$MERFOX_RUNS_DIR"
    elif [ -d "$HOME/Library/Application Support/merfox/MerFox/runs" ]; then
        echo "$HOME/Library/Application Support/merfox/MerFox/runs"
    elif [ -d "$HOME/Library/Application Support/MerFox/runs" ]; then
        echo "$HOME/Library/Application Support/MerFox/runs"
    else
        echo "$(pwd)/server/runs"
    fi
}
DETECTED_RUNS_DIR=$(detect_runs_dir)
log "Detected potential runs dir: $DETECTED_RUNS_DIR"

# Helper for 0-record support (Header must exist)
has_tsv_header() {
  local f="$1"
  [ -f "$f" ] || return 1
  # Ensure first line is not empty (contains at least one character)
  head -n 1 "$f" | grep -q .
}

for i in $(seq 1 $MAX_WAIT); do
    if [ -d "$DETECTED_RUNS_DIR" ]; then
        FOUND_PATH=$(find "$DETECTED_RUNS_DIR" -maxdepth 1 -type d -name "*$RUN_ID*" | head -n 1)
        if [ -n "$FOUND_PATH" ]; then
             RUN_PATH="$FOUND_PATH"
        fi
    fi

    if [ -n "$RUN_PATH" ] && [ -d "$RUN_PATH" ]; then
        HAS_AMAZON=0; HAS_PROFIT=0; HAS_ASIN=0
        if has_tsv_header "$RUN_PATH/amazon.tsv"; then HAS_AMAZON=1; fi
        if has_tsv_header "$RUN_PATH/profit.tsv"; then HAS_PROFIT=1; fi
        if has_tsv_header "$RUN_PATH/asin.tsv"; then HAS_ASIN=1; fi
        
        if [ $HAS_AMAZON -eq 1 ] && [ $HAS_PROFIT -eq 1 ] && [ $HAS_ASIN -eq 1 ]; then
            FOUND=1
            break
        fi
    fi
    sleep 2
    echo -n "."
done
echo ""

if [ $FOUND -eq 0 ]; then
    log "ERROR: Timeout waiting for artifacts."
    log "Last checked path: $RUN_PATH"
    log "Runs Root: $DETECTED_RUNS_DIR"
    ls -lt "$DETECTED_RUNS_DIR" | head -n 10 | while read line; do log "  $line"; done
    kill $APP_PID
    exit 1
fi

log "Artifacts found at: $RUN_PATH"

# 7. BOM & Header Verification (Strict)
log "=== 7. Verifying BOM & Headers ==="
check_bom_header() {
  local FILE="$1"
  local EXPECT_FIRST_COL="$2"

  [ -f "$FILE" ] || { log "ERROR: Missing file $FILE"; return 1; }

  local BOM
  BOM=$(xxd -g 1 -l 3 "$FILE" | awk '{print $2" "$3" "$4}')
  if [ "$BOM" != "ef bb bf" ]; then
    log "ERROR: $FILE missing BOM (Got: $BOM)"
    return 1
  fi

  # Strip BOM and compare first column strictly
  local FIRST_COL
  FIRST_COL=$(head -n 1 "$FILE" | perl -pe 's/^\xEF\xBB\xBF//' | cut -f1)

  if [ "$FIRST_COL" != "$EXPECT_FIRST_COL" ]; then
    local FIRST_LINE
    FIRST_LINE=$(head -n 1 "$FILE" | perl -pe 's/^\xEF\xBB\xBF//')
    log "ERROR: $FILE Header Mismatch. Expected first col '$EXPECT_FIRST_COL' but got '$FIRST_COL' line='$FIRST_LINE'"
    return 1
  fi

  log "PASS: $FILE (Header OK: first col '$EXPECT_FIRST_COL')"
  log "PASS: $FILE (BOM OK)"
  return 0
}

check_bom_header "$RUN_PATH/amazon.tsv" "sku" || { kill $APP_PID; exit 1; }
check_bom_header "$RUN_PATH/profit.tsv" "sku" || { kill $APP_PID; exit 1; }
check_bom_header "$RUN_PATH/asin.tsv" "collected_at" || { kill $APP_PID; exit 1; }

# 8. Verify Download API
log "=== 8. Verifying Download API ==="
verify_download() {
  local TYPE="$1"
  local CODE
  CODE=$(curl -s -o /dev/null -w "%{http_code}" "http://127.0.0.1:3001/api/runs/$RUN_ID/files/$TYPE")
  if [ "$CODE" = "200" ]; then
    log "Download API ($TYPE) OK (200)."
  else
    log "ERROR: Download API ($TYPE) returned $CODE"
    return 1
  fi
}

verify_download "amazon" || { kill $APP_PID; exit 1; }
verify_download "profit" || { kill $APP_PID; exit 1; }
verify_download "asin"   || { kill $APP_PID; exit 1; }

# 9. Graceful Shutdown & Zombie Check
log "=== 9. Shutdown & Cleanup ==="
log "Sending Quit Command..."
osascript -e 'tell application "MerFox" to quit'
sleep 3

if lsof -nP -iTCP:3001 -sTCP:LISTEN >/dev/null; then
    log "ERROR: Port 3001 still LISTEN (Zombie Process)."
    lsof -nP -iTCP:3001 -sTCP:LISTEN
    exit 1
else
    log "Port 3001 is free. Clean shutdown confirmed."
fi

log "=== VERIFICATION PASS ==="
exit 0
