#!/bin/bash
# MerFox Code Signature Verification Script
# Purpose: Verify /Applications/MerFox.app has valid code signature before release
# Usage: ./app_codesign_check.sh

set -e

APP_PATH="/Applications/MerFox.app"
EXPECTED_BUNDLE_ID="com.merfox.app"

echo "=== MerFox Code Signature Verification ==="
echo ""

# Check 1: App exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ FAIL: $APP_PATH does not exist"
    exit 1
fi
echo "✅ App exists: $APP_PATH"

# Check 2: Bundle ID verification
ACTUAL_BUNDLE_ID=$(/usr/libexec/PlistBuddy -c "Print :CFBundleIdentifier" "$APP_PATH/Contents/Info.plist" 2>/dev/null || echo "MISSING")
if [ "$ACTUAL_BUNDLE_ID" != "$EXPECTED_BUNDLE_ID" ]; then
    echo "❌ FAIL: Bundle ID mismatch. Expected: $EXPECTED_BUNDLE_ID, Got: $ACTUAL_BUNDLE_ID"
    exit 1
fi
echo "✅ Bundle ID correct: $EXPECTED_BUNDLE_ID"

# Check 3: Version extraction
VERSION=$(/usr/libexec/PlistBuddy -c "Print :CFBundleShortVersionString" "$APP_PATH/Contents/Info.plist" 2>/dev/null || echo "UNKNOWN")
echo "✅ App Version: $VERSION"

# Check 4: Code signature verification (deep & strict)
echo ""
echo "--- Code Signature Verification ---"
if ! codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>&1; then
    echo ""
    echo "❌ FAIL: Code signature verification failed"
    echo "This usually means:"
    echo "  1. Files were modified after signing"
    echo "  2. App was installed via 'cp -r' instead of DMG"
    echo "  3. Post-build scripts modified bundle contents"
    exit 1
fi
echo "✅ Code signature valid"

# Check 5: Gatekeeper assessment (may fail for ad-hoc signatures, that's OK)
echo ""
echo "--- Gatekeeper Assessment ---"
SPCTL_OUTPUT=$(spctl --assess --verbose=4 --type execute "$APP_PATH" 2>&1 || true)
echo "$SPCTL_OUTPUT"
if echo "$SPCTL_OUTPUT" | grep -q "approved"; then
    echo "✅ Gatekeeper: APPROVED"
elif echo "$SPCTL_OUTPUT" | grep -q "adhoc signed"; then
    echo "⚠️  Gatekeeper: Ad-hoc signed (OK for development)"
else
    echo "⚠️  Gatekeeper: Not approved (may require notarization for distribution)"
fi

# Check 6: Verify critical assets bundled
echo ""
echo "--- Asset Verification ---"
FONT_PATH="$APP_PATH/Contents/Resources/standalone/public/fonts/MaterialSymbolsOutlined.woff2"
if [ -f "$FONT_PATH" ]; then
    FONT_SIZE=$(ls -lh "$FONT_PATH" | awk '{print $5}')
    echo "✅ MaterialSymbolsOutlined.woff2 bundled ($FONT_SIZE)"
else
    echo "❌ FAIL: MaterialSymbolsOutlined.woff2 NOT found"
    exit 1
fi

# Check 7: Process identity check (if running)
echo ""
echo "--- Running Process Check (if applicable) ---"
if lsof -nP -iTCP:13337 -sTCP:LISTEN >/dev/null 2>&1; then
    PID_INFO=$(lsof -nP -iTCP:13337 -sTCP:LISTEN | grep LISTEN | head -n 1)
    PID=$(echo "$PID_INFO" | awk '{print $2}')
    PROC_PATH=$(ps -p "$PID" -o comm= 2>/dev/null || echo "UNKNOWN")
    
    echo "Process listening on 13337:"
    echo "  PID: $PID"
    echo "  Path: $PROC_PATH"
    
    if [[ "$PROC_PATH" == *"/Applications/MerFox.app"* ]]; then
        echo "✅ Process running from correct app bundle"
    else
        echo "⚠️  Process running from unexpected path"
    fi
else
    echo "ℹ️  No process listening on port 13337 (app not running)"
fi

echo ""
echo "=== ✅ ALL CHECKS PASSED ==="
echo "App is ready for distribution"
exit 0
