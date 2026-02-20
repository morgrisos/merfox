set -eu

REPO="${REPO:-yuga/merfox}"

if ! command -v gh >/dev/null 2>&1; then
  echo "ERROR: gh not found"
  exit 1
fi

gh release view --repo "$REPO" --json tagName,publishedAt,assets > /tmp/merfox_release.json

python3 - <<'PY'
import json
d=json.load(open("/tmp/merfox_release.json","r",encoding="utf-8"))
assets=[a["name"] for a in d.get("assets",[])]
print("tagName=",d.get("tagName"))
print("publishedAt=",d.get("publishedAt"))
print("assets_count=",len(assets))
need=[".dmg",".zip",".exe"]
hit={k:any(n.endswith(k) for n in assets) for k in need}
print("asset_suffix_hit=",hit)
PY
