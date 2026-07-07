# Golden baseline (rewrite)

This directory holds frozen reference artifacts for the KCG Portal extension rewrite verification gates.

**Do not edit these files during normal development.** Update only when the baseline commits in `BASELINE` change.

## Contents

| Path | Purpose |
|---|---|
| `BASELINE` | Baseline git SHAs for extension, community server, and web repos |
| `strings.lock.json` | SHA-256 checksums for `contract/`, i18n locales, and theme sources |
| `theme-tokens.json` | Frozen built-in theme token values (64 themes) |
| `css/` | Normalized output CSS hashes for portal, home2, and cplan (chrome + firefox) |
| `manifest.chrome.json` / `manifest.firefox.json` | Expected generated manifests (version normalized via `version.json`) |

## Verify locally

```bash
cd app
npm ci && npm run build && npm run build:firefox
node scripts/contract-freeze.mjs --check
node scripts/manifest-equivalence.mjs --golden ../golden/manifest.chrome.json --target .output/chrome-mv3/manifest.json --version-source version.json
node scripts/manifest-equivalence.mjs --golden ../golden/manifest.firefox.json --target .output/firefox-mv3/manifest.json --version-source version.json
node scripts/css-equivalence.mjs --check --golden ../golden/css --target .output
npm test
```

## Regenerate (baseline change only)

```bash
cd app && npm run build && npm run build:firefox
node scripts/contract-freeze.mjs --snapshot
node scripts/css-equivalence.mjs --snapshot --from .output --out ../golden/css
cp .output/chrome-mv3/manifest.json ../golden/manifest.chrome.json
cp .output/firefox-mv3/manifest.json ../golden/manifest.firefox.json
```
