#!/usr/bin/env bash
set -e

# Find the latest run directory
RUN_DIR=$(ls -td runs_dev/* | head -n 1)

if [ -z "$RUN_DIR" ]; then
    echo "❌ No runs_dev directory found"
    exit 1
fi

echo "Checking latest run: $RUN_DIR"

# 1. Check file existence
test -d "$RUN_DIR"
test -f "$RUN_DIR/run.log"
test -f "$RUN_DIR/raw.csv"

# 2. BOM Check (EF BB BF)
# Using xxd to check first 3 bytes
BOM=$(head -c 3 "$RUN_DIR/raw.csv" | xxd -p)
if [ "$BOM" != "efbbbf" ]; then
    echo "❌ BOM missing in raw.csv: $BOM"
    exit 1
fi

# 3. Numeric Integrity Check in run.log
# Ensure no lines contain "Export: -" which indicates missing numeric data
if grep -E "Export: -" "$RUN_DIR/run.log"; then
  echo "❌ Invalid numeric line found in run.log (Export: -)"
  exit 1
fi

echo "✅ verify passed for $RUN_DIR"
