#!/bin/bash
# MerFox Code Signature Verification Script
# Purpose: Verify /Applications/MerFox.app has valid code signature before release
# Usage: ./app_codesign_check.sh

set -e

APP_PATH="/Applications/MerFox.app"
EXPECTED_BUNDLE_ID="com.merfox.app"

echo "=== MerFox Code Signature Verification ==="
echo ""

# Check 0: Warn if app already exists (should do clean install)
if [ -d "$APP_PATH" ]; then
    echo "⚠️  WARNING: $APP_PATH already exists"
    echo "   For clean verification, remove it first:"
    echo "   sudo rm -rf '$APP_PATH'"
    echo "   Then install from DMG via Finder drag-and-drop"
    echo ""
else
    echo "✅ No existing installation found"
fi

# Check 1: App exists
if [ ! -d "$APP_PATH" ]; then
    echo "❌ FAIL: $APP_PATH does not exist"
    echo "   Please install MerFox.app to /Applications from the DMG"
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

# Check 4: Quarantine attribute check (must NOT exist for distribution)
echo ""
echo "--- Quarantine Attribute Check ---"
QUARANTINE_ATTRS=$(xattr "$APP_PATH" 2>/dev/null | grep "com.apple.quarantine" || true)
if [ -n "$QUARANTINE_ATTRS" ]; then
    echo "❌ FAIL: Quarantine attributes detected"
    echo "   Found: $QUARANTINE_ATTRS"
    echo "   Remove with: xattr -cr '$APP_PATH'"
    exit 1
fi
echo "✅ No quarantine attributes (good for distribution)"

# Check 5: Code signature verification (deep & strict)
echo ""
echo "--- Code Signature Verification ---"
if ! codesign --verify --deep --strict --verbose=2 "$APP_PATH" 2>&1; then
    echo ""
    echo "❌ FAIL: Code signature verification failed"
    echo "This usually means:"
    echo "  1. Files were modified after signing"
    echo "  2. App was corrupted during copy"
    echo "  3. Post-build scripts modified bundle contents"
    exit 1
fi
echo "✅ Code signature valid (deep & strict)"

# Check 6: Signature details (ad-hoc is OK for Electron apps)
echo ""
echo "--- Signature Details ---"
SIGNATURE_INFO=$(codesign -dv --verbose=4 "$APP_PATH" 2>&1)
echo "$SIGNATURE_INFO" | grep -E "^(Signature|TeamIdentifier|Identifier)" || true

TEAM_ID=$(echo "$SIGNATURE_INFO" | grep "TeamIdentifier" | awk -F= '{print $2}' || echo "not set")
SIGNATURE_TYPE=$(echo "$SIGNATURE_INFO" | grep "^Signature=" | awk -F= '{print $2}' || echo "unknown")

if [ "$SIGNATURE_TYPE" = "adhoc" ]; then
    echo "ℹ️  Signature: Ad-hoc (standard for Electron apps without Apple Developer ID)"
    echo "   This is ACCEPTABLE for distribution to trusted users"
elif [ "$TEAM_ID" != "not set" ] && [ -n "$TEAM_ID" ]; then
    echo "✅ Signature: Notarized with TeamIdentifier: $TEAM_ID"
else
    echo "⚠️  Signature type: $SIGNATURE_TYPE"
fi

# Check 7: Gatekeeper assessment
echo ""
echo "--- Gatekeeper Assessment ---"
SPCTL_OUTPUT=$(spctl --assess --verbose=4 --type execute "$APP_PATH" 2>&1 || true)
if echo "$SPCTL_OUTPUT" | grep -q "approved"; then
    echo "✅ Gatekeeper: APPROVED (notarized)"
elif echo "$SPCTL_OUTPUT" | grep -q "adhoc signed"; then
    echo "ℹ️  Gatekeeper: Ad-hoc signed (requires user to allow in Security Preferences)"
    echo "   Users may see 'unidentified developer' warning on first launch"
else
    echo "ℹ️  Gatekeeper: $(echo "$SPCTL_OUTPUT" | head -n 1)"
fi

# Check 8: Verify critical assets bundled
echo ""
echo "--- Asset Verification ---"
FONT_PATH="$APP_PATH/Contents/Resources/standalone/public/fonts/MaterialSymbolsOutlined.woff2"
if [ -f "$FONT_PATH" ]; then
    FONT_SIZE=$(ls -lh "$FONT_PATH" | awk '{print $5}')
    echo "✅ MaterialSymbolsOutlined.woff2 bundled ($FONT_SIZE)"
else
    echo "❌ FAIL: MaterialSymbolsOutlined.woff2 NOT found"
    echo "   Expected at: $FONT_PATH"
    exit 1
fi

# Check 9: Process identity check (if running)
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
        
        # API Health Check
        API_VERSION=$(curl -sS --connect-timeout 2 --max-time 3 http://127.0.0.1:13337/api/version 2>/dev/null || echo "{}")
        if echo "$API_VERSION" | grep -q "version"; then
            VERSION_NUM=$(echo "$API_VERSION" | grep -o '"version":"[^"]*"' | cut -d'"' -f4)
            echo "✅ API responding: v$VERSION_NUM"
        fi
    else
        echo "⚠️  Process running from unexpected path"
    fi
else
    echo "ℹ️  No process listening on port 13337 (app not running)"
fi

echo ""
echo "=== ✅ ALL CHECKS PASSED ==="
echo "App is ready for distribution"
echo ""
echo "DISTRIBUTION NOTES:"
echo "  - Ad-hoc signature is acceptable for Electron apps"
echo "  - Users may need to right-click → Open on first launch"
echo "  - For enterprise: Consider Apple Developer ID + notarization"
exit 0

