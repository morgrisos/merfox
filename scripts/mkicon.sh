#!/bin/bash
# scripts/mkicon.sh
# Generates icon.icns from build/icon.png

ICON_SRC="build/icon.png"
ICON_OUT="build/icon.icns"
ICONSET="build/icon.iconset"

if [ ! -f "$ICON_SRC" ]; then
    echo "Error: $ICON_SRC not found."
    exit 1
fi

mkdir -p "$ICONSET"

# Resizing
sips -z 16 16     "$ICON_SRC" --out "$ICONSET/icon_16x16.png"
sips -z 32 32     "$ICON_SRC" --out "$ICONSET/icon_16x16@2x.png"
sips -z 32 32     "$ICON_SRC" --out "$ICONSET/icon_32x32.png"
sips -z 64 64     "$ICON_SRC" --out "$ICONSET/icon_32x32@2x.png"
sips -z 128 128   "$ICON_SRC" --out "$ICONSET/icon_128x128.png"
sips -z 256 256   "$ICON_SRC" --out "$ICONSET/icon_128x128@2x.png"
sips -z 256 256   "$ICON_SRC" --out "$ICONSET/icon_256x256.png"
sips -z 512 512   "$ICON_SRC" --out "$ICONSET/icon_256x256@2x.png"
sips -z 512 512   "$ICON_SRC" --out "$ICONSET/icon_512x512.png"
sips -z 1024 1024 "$ICON_SRC" --out "$ICONSET/icon_512x512@2x.png"

# Pack to icns
iconutil -c icns "$ICONSET" -o "$ICON_OUT"

echo "Generated $ICON_OUT"
rm -rf "$ICONSET"
