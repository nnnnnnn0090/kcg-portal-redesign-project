#!/bin/bash
set -euo pipefail
ROOT="$(cd "$(dirname "$0")" && pwd)"
APP="$ROOT/app"
OUT="$ROOT/build"

rm -rf "$OUT"
mkdir -p "$OUT"

cd "$APP"

if [[ ! -d node_modules ]] || [[ ! -f node_modules/.package-lock.json ]]; then
  echo "Installing dependencies..."
  npm ci
fi

npm run zip:all

VERSION="$(node -p "require('./version.json').version")"
NAME="kcg-portal-redesign-project-${VERSION}"
for zip in \
  "${NAME}-dev-chrome.zip" \
  "${NAME}-dev-firefox.zip" \
  "${NAME}-chrome.zip" \
  "${NAME}-firefox.zip"
do
  cp "$APP/.output/$zip" "$OUT/"
  echo "  $zip"
done

echo ""
echo "Built in $OUT"
ls -lh "$OUT/"*.zip | awk '{print "  " $5 "  " $9}'
