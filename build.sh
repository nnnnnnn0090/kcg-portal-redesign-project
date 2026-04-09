#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
OUT="$ROOT/build"
MANIFEST_SRC="$ROOT/app/manifest.json"
rm -rf "$OUT"
mkdir -p "$OUT"

read -r PKG_SLUG VERSION <<< "$(python3 -c "
import json, re, sys

def slugify(s):
    s = re.sub(r'[^a-z0-9]+', '-', str(s).lower()).strip('-')
    return re.sub(r'-+', '-', s) or 'extension'

path = sys.argv[1]
with open(path, encoding='utf-8') as f:
    meta = json.load(f)
ver = meta.get('version') or '0.0.0'
slug = meta.get('package_slug')
if slug:
    slug = slugify(slug)
else:
    slug = slugify(meta.get('name', 'extension'))
print(slug, ver)
" "$MANIFEST_SRC")"

TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT
cp -a "$ROOT/app/." "$TMP/"

export STAGE="$TMP"
python3 -c "
import json, os
path = os.path.join(os.environ['STAGE'], 'manifest.json')
with open(path, encoding='utf-8') as f:
    m = json.load(f)
m.pop('package_slug', None)
with open(path, 'w', encoding='utf-8') as f:
    json.dump(m, f, indent='\t', ensure_ascii=False)
    f.write('\n')
"

CHROME_ZIP="$OUT/${PKG_SLUG}-chrome-${VERSION}.zip"
(cd "$TMP" && zip -r -q "$CHROME_ZIP" .)

EDGE_ZIP="$OUT/${PKG_SLUG}-edge-${VERSION}.zip"
(cd "$TMP" && zip -r -q "$EDGE_ZIP" .)

FX_NAME="${PKG_SLUG}-firefox-${VERSION}.zip"
if command -v web-ext >/dev/null 2>&1; then
	web-ext build --source-dir "$TMP" --artifacts-dir "$OUT" --filename "$FX_NAME" --overwrite-dest
else
	(cd "$TMP" && zip -r -q "$OUT/$FX_NAME" .)
	echo "web-ext not found: wrote $OUT/$FX_NAME"
fi

echo "Built $OUT"
