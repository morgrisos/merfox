#!/bin/bash
RUNS_DIR="$HOME/Library/Application Support/merfox/MerFox/runs"
[ -d "$RUNS_DIR" ] || RUNS_DIR="$HOME/Library/Application Support/MerFox/MerFox/runs"
LATEST=$(ls -dt "$RUNS_DIR"/* | head -n 1)
TSV="$LATEST/amazon_upload.tsv"
echo "== Checking TSV in: $LATEST =="
if [ -f "$TSV" ]; then
  SIZE=$(wc -c < "$TSV" | xargs)
  LINES=$(wc -l < "$TSV" | xargs)
  echo "[PASS] amazon_upload.tsv FOUND. Size: $SIZE bytes, Lines: $LINES"
  
  # [REQ 5] Empty Column Check
  # Col 2: product-id, 3: type, 4: price, 8: quantity
  EMPTY=$(awk -F '\t' 'NR>1 { if($2=="" || $3=="" || $4=="" || $8=="") count++ } END { print count+0 }' "$TSV")
  if [ "$EMPTY" -eq "0" ]; then
    echo "[PASS] Mandatory Cols Check: OK (0 empty rows)"
  else
    echo "[FAIL] Mandatory Cols Check: FAILED ($EMPTY empty rows)"
  fi

else
  echo "[FAIL] amazon_upload.tsv MISSING"
fi
