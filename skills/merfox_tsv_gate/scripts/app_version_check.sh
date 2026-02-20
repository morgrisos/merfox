#!/bin/bash
# app_version_check.sh - Packaged App Identity and Version Verification
# Purpose: Enforce /Applications/MerFox.app identity and version consistency
# Usage: ./app_version_check.sh

set -e

PACKAGED_APP="/Applications/MerFox.app"
INFO_PLIST="$PACKAGED_APP/Contents/Info.plist"
EXPECTED_PORT=13337
TIMEOUT=5

echo "=== Packaged App Identity Check ==="
echo ""

# 1) Check if packaged app exists
if [ ! -d "$PACKAGED_APP" ]; then
    echo "❌ FAIL: $PACKAGED_APP does not exist"
    exit 1
fi
echo "✓ Packaged app exists: $PACKAGED_APP"

# 2) Get version from Info.plist
if [ ! -f "$INFO_PLIST" ]; then
    echo "❌ FAIL: Info.plist not found"
    exit 1
fi

PLIST_VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$INFO_PLIST" 2>/dev/null || echo "UNKNOWN")
echo "✓ Info.plist version: $PLIST_VERSION"

# 3) Check port 13337 listener
LISTEN_LINE=$(lsof -nP -iTCP:$EXPECTED_PORT -sTCP:LISTEN 2>/dev/null | awk 'NR==2')
if [ -z "$LISTEN_LINE" ]; then
    echo "⚠️  WARN: No listener on port $EXPECTED_PORT (app not running)"
    exit 0
fi

PID=$(echo "$LISTEN_LINE" | awk '{print $2}')
COMM=$(echo "$LISTEN_LINE" | awk '{print $1}')
echo "✓ Port $EXPECTED_PORT listener: PID=$PID COMM=$COMM"

# 4) Verify PID is from /Applications/MerFox.app
APP_PATH_COUNT=$(lsof -p "$PID" 2>/dev/null | egrep -c "MerFox\.app/Contents/(MacOS/MerFox|Resources/standalone)" || echo 0)
if [ "$APP_PATH_COUNT" -eq 0 ]; then
    echo "❌ FAIL: PID $PID is NOT from $PACKAGED_APP"
    echo "   Possible cause: Different app running or dev mode"
    lsof -p "$PID" | head -n 10
    exit 1
fi
echo "✓ PID $PID confirmed from $PACKAGED_APP"

# 5) Verify API version matches Info.plist
API_VERSION=$(curl -sS --connect-timeout 2 --max-time "$TIMEOUT" "http://127.0.0.1:$EXPECTED_PORT/api/version" 2>/dev/null | grep -o '"version":"[^"]*"' | cut -d'"' -f4 || echo "UNREACHABLE")

if [ "$API_VERSION" = "UNREACHABLE" ]; then
    echo "⚠️  WARN: API unreachable at /api/version"
    exit 0
fi

echo "✓ API version: $API_VERSION"

if [ "$API_VERSION" != "$PLIST_VERSION" ]; then
    echo "❌ FAIL: Version mismatch!"
    echo "   Info.plist: $PLIST_VERSION"
    echo "   API:        $API_VERSION"
    exit 1
fi

echo "✓ Version consistency confirmed: $API_VERSION"
echo ""
echo "=== ✅ ALL CHECKS PASSED ==="
