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

# 1. Critical Files Existence (MUST EXIST)
test -f "$RUN_DIR/run.log" || { echo "❌ run.log missing"; exit 1; }
test -f "$RUN_DIR/raw.csv" || { echo "❌ raw.csv missing"; exit 1; }

# 2. BOM Check for raw.csv (MUST BE EF BB BF)
RAW_BOM=$(head -c 3 "$RUN_DIR/raw.csv" | xxd -p)
if [ "$RAW_BOM" != "efbbbf" ]; then
    echo "❌ BOM missing in raw.csv (Found: $RAW_BOM)"
    exit 1
fi

# 3. Numeric Integrity in run.log (MUST NOT HAVE '-')
# Grep for "Export: -" etc in RUN SUMMARY section
if grep -E "(Export|Calc|ASIN):.*-" "$RUN_DIR/run.log"; then
    echo "❌ Invalid numeric values (Found '-') in run.log"
    exit 1
fi

# 4. Compatibility Folders Check (WARNING ONLY)
# Not strictly required by updated spec (0 rows might skip these)
# If missing, just warn. If present, recursive BOM check handles them below.
test -d "$RUN_DIR/amazon" || echo "⚠️  amazon/ directory missing"
test -d "$RUN_DIR/profit" || echo "⚠️  profit/ directory missing"
test -d "$RUN_DIR/asin" || echo "⚠️  asin/ directory missing"
test -d "$RUN_DIR/failed" || echo "⚠️  failed/ directory missing"

# 5. Universal BOM Check for all CSV/TSV (MUST BE VALID IF EXISTS)
echo "🔍 Checking BOM for all CSV/TSV files..."
find "$RUN_DIR" -name "*.csv" -o -name "*.tsv" | while read -r FILE; do
    BOM=$(head -c 3 "$FILE" | xxd -p)
    if [ "$BOM" != "efbbbf" ]; then
        echo "❌ BOM missing in $FILE"
        exit 1
    fi
done

echo "✅ ALL CHECKS PASSED for $RUN_DIR"
