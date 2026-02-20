#!/usr/bin/env bash
set -e

# Usage: ./verify_packaged.sh [RUN_DIR]
# If RUN_DIR is not provided, use the latest directory in runs_dev/

if [ -n "$1" ]; then
    RUN_DIR="$1"
else
    # Find latest run dir
    RUN_DIR=$(ls -td runs_dev/* 2>/dev/null | head -n 1)
fi

if [ -z "$RUN_DIR" ] || [ ! -d "$RUN_DIR" ]; then
    echo "❌ Run directory not found: $RUN_DIR"
    exit 1
fi

echo "🔍 Verifying Run: $RUN_DIR"

# 1. Critical Files Existence
test -f "$RUN_DIR/run.log" || { echo "❌ run.log missing"; exit 1; }
test -f "$RUN_DIR/raw.csv" || { echo "❌ raw.csv missing"; exit 1; }

# 2. BOM Check for raw.csv (Must be EF BB BF)
RAW_BOM=$(head -c 3 "$RUN_DIR/raw.csv" | xxd -p)
if [ "$RAW_BOM" != "efbbbf" ]; then
    echo "❌ BOM missing in raw.csv (Found: $RAW_BOM)"
    exit 1
fi

# 3. Numeric Integrity in run.log
# Grep for "Export: -" etc in RUN SUMMARY section
if grep -E "(Export|Calc|ASIN):.*-" "$RUN_DIR/run.log"; then
    echo "❌ Invalid numeric values (Found '-') in run.log"
    exit 1
fi

# 4. Compatibility Folders Check (Conditional)
# Check if tsv_rows=0 in run.log
TSV_ROWS_0=$(grep "tsv_rows=0" "$RUN_DIR/run.log" || true)

if [ -n "$TSV_ROWS_0" ]; then
    echo "⚠️  tsv_rows=0 detected. Skipping folder existence check (amazon/profit/asin/failed)."
else
    # Valid rows exist, so folders MUST exist
    test -d "$RUN_DIR/amazon" || { echo "❌ amazon/ directory missing (tsv_rows > 0)"; exit 1; }
    test -d "$RUN_DIR/profit" || { echo "❌ profit/ directory missing (tsv_rows > 0)"; exit 1; }
    test -d "$RUN_DIR/asin" || { echo "❌ asin/ directory missing (tsv_rows > 0)"; exit 1; }
    # failed folder is optional depending on failures, but usually good to check if logic implies it
fi

# 5. Universal BOM Check for all CSV/TSV
echo "🔍 Checking BOM for all CSV/TSV files..."
find "$RUN_DIR" -name "*.csv" -o -name "*.tsv" | while read -r FILE; do
    BOM=$(head -c 3 "$FILE" | xxd -p)
    if [ "$BOM" != "efbbbf" ]; then
        echo "❌ BOM missing in $FILE"
        exit 1
    fi
done

echo "✅ ALL CHECKS PASSED for $RUN_DIR"
