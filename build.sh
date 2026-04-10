#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
APP="$ROOT/app"
OUT="$ROOT/build"

rm -rf "$OUT"
mkdir -p "$OUT"

cd "$APP"

# Chrome / Edge
npm run zip

# Firefox
npm run zip:firefox

# app/.output/ の *.zip を build/ にコピー
find "$APP/.output" -name "*.zip" | while read -r f; do
  cp "$f" "$OUT/"
  echo "  $(basename "$f")"
done

echo ""
echo "Built in $OUT"
ls -lh "$OUT/"*.zip 2>/dev/null | awk '{print "  " $5 "  " $9}'
