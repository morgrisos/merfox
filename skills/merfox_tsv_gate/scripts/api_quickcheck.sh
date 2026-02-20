#!/bin/bash
set -euo pipefail

PORT=${MERFOX_PORT:-13337}
URL="http://127.0.0.1:$PORT"

echo "=== API Quick Check (Port: $PORT) ==="

check_endpoint() {
    ENDPOINT=$1
    NAME=$2
    
    # Capture exit code carefully
    if RESPONSE=$(curl -s --connect-timeout 2 --max-time 3 "$URL$ENDPOINT"); then
        echo "[OK] $NAME"
        echo "$RESPONSE" | head -c 300
        echo "" # newline
    else
        echo "[FAIL] $NAME (Timeout or Error)"
    fi
}

check_endpoint "/api/version" "Version"
check_endpoint "/api/health" "Health"
check_endpoint "/api/scraper/status" "Status"
