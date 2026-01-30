#!/bin/bash
set -euo pipefail

RUNS_DIR_1="$HOME/Library/Application Support/merfox/MerFox/runs"
RUNS_DIR_2="$HOME/Library/Application Support/MerFox/MerFox/runs"

TARGET_DIR=""
if [ -d "$RUNS_DIR_1" ]; then
    TARGET_DIR="$RUNS_DIR_1"
elif [ -d "$RUNS_DIR_2" ]; then
    TARGET_DIR="$RUNS_DIR_2"
else
    echo "NO RUNS DIR FOUND"
    exit 1
fi

echo "Scanning: $TARGET_DIR"

# Check if directory is empty
if [ -z "$(ls -A "$TARGET_DIR")" ]; then
   echo "RUNS DIR IS EMPTY"
   exit 0
fi

LATEST=$(ls -dt "$TARGET_DIR"/* | head -n 1)
echo "LATEST_RUN=$(basename "$LATEST")"

if [ -f "$LATEST/raw.csv" ]; then
    LINES=$(wc -l < "$LATEST/raw.csv")
    echo "raw.csv: FOUND (Lines: $LINES)"
else
    echo "raw.csv: MISSING"
fi

if [ -f "$LATEST/mapping.csv" ]; then
     echo "mapping.csv: FOUND (Run Local)"
elif [ -f "$TARGET_DIR/../../mapping.csv" ]; then
    # Standard location is ~/Library/Application Support/merfox/MerFox/mapping.csv
    # TARGET_DIR is runs/
     echo "mapping.csv: FOUND (Global Fallback)"
else
     echo "mapping.csv: MISSING"
fi

if [ -f "$LATEST/amazon_upload.tsv" ]; then
    echo "amazon_upload.tsv: FOUND"
    ls -lah "$LATEST/amazon_upload.tsv"
else
    echo "amazon_upload.tsv: MISSING"
fi
