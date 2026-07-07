#!/usr/bin/env node
import { existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { basename, dirname, join } from 'node:path';
import prettier from 'prettier';
import { APP_ROOT, sha256, writeJson } from './_freeze-utils.mjs';

const BROWSERS = ['chrome', 'firefox'];
const BROWSER_DIRS = {
  chrome: 'chrome-mv3',
  firefox: 'firefox-mv3',
};

const PRIMARY_ENTRIES = ['portal', 'home2', 'cplan'];

/** @param {string} css */
function stripNonBannerComments(css) {
  return css.replace(/\/\*(?!\!)([\s\S]*?)\*\//g, '');
}

/** @param {string} css */
async function normalizeCss(css) {
  const stripped = stripNonBannerComments(css);
  try {
    return await prettier.format(stripped, { parser: 'css' });
  } catch {
    return stripped.trim();
  }
}

/** @param {string} filePath */
function readText(filePath) {
  return readFileSync(filePath, 'utf8');
}

/**
 * @param {string} jsPath
 * @returns {string}
 */
function logicalEntryFromJs(jsPath) {
  const base = basename(jsPath).replace(/\.js$/i, '');
  const normalized = base.replace(/-[A-Za-z0-9_-]{6,}$/u, '');

  for (const entry of PRIMARY_ENTRIES) {
    if (normalized.includes(`${entry}.content`) || normalized.startsWith(`${entry}.`)) {
      return entry;
    }
  }

  if (normalized.includes('portal.content')) return 'portal';
  if (normalized.includes('home2.content')) return 'home2';
  if (normalized.includes('cplan.content')) return 'cplan';

  return normalized;
}

/**
 * @param {string} outputRoot
 * @param {'chrome' | 'firefox'} browser
 */
function resolveManifestCssEntries(outputRoot, browser) {
  const manifestPath = join(outputRoot, BROWSER_DIRS[browser], 'manifest.json');
  if (!existsSync(manifestPath)) {
    throw new Error(`Manifest not found: ${manifestPath}`);
  }

  const manifest = JSON.parse(readText(manifestPath));
  const bundleRoot = dirname(manifestPath);
  /** @type {Record<string, { cssPaths: string[], jsPaths: string[] }>} */
  const entries = {};

  for (const script of manifest.content_scripts ?? []) {
    const jsPaths = script.js ?? [];
    const cssPaths = script.css ?? [];
    if (cssPaths.length === 0) continue;

    const logical = logicalEntryFromJs(jsPaths[0] ?? cssPaths[0]);
    if (!PRIMARY_ENTRIES.includes(logical)) continue;

    entries[logical] = {
      jsPaths: jsPaths.map((rel) => join(bundleRoot, rel)),
      cssPaths: cssPaths.map((rel) => join(bundleRoot, rel)),
    };
  }

  return entries;
}

/** @param {string[]} cssPaths */
async function bundleNormalizedCss(cssPaths) {
  const chunks = [];
  for (const cssPath of cssPaths) {
    if (!existsSync(cssPath)) {
      throw new Error(`CSS file not found: ${cssPath}`);
    }
    chunks.push(await normalizeCss(readText(cssPath)));
  }
  return chunks.join('\n');
}

/** @param {string} css */
function extractSelectors(css) {
  const selectors = new Set();
  const re = /([^{@][^{]*)\{/g;
  let match;
  while ((match = re.exec(css)) !== null) {
    const raw = match[1].trim();
    if (!raw || raw.startsWith('@')) continue;
    for (const part of raw.split(',')) {
      const selector = part.trim();
      if (selector) selectors.add(selector);
    }
  }
  return selectors;
}

/** @param {string} css */
function extractKeyframes(css) {
  const names = new Set();
  const re = /@keyframes\s+([^\s{]+)/g;
  let match;
  while ((match = re.exec(css)) !== null) {
    names.add(match[1]);
  }
  return names;
}

/** @param {Set<string>} a @param {Set<string>} b */
function setDiff(a, b) {
  return [...a].filter((value) => !b.has(value)).sort();
}

/** @param {string} left @param {string} right */
function unifiedDiff(left, right, label) {
  const leftLines = left.split('\n');
  const rightLines = right.split('\n');
  const out = [`--- golden/${label}`, `+++ target/${label}`];
  const max = Math.max(leftLines.length, rightLines.length);
  for (let i = 0; i < max; i += 1) {
    const l = leftLines[i];
    const r = rightLines[i];
    if (l === r) continue;
    if (l !== undefined) out.push(`- ${l}`);
    if (r !== undefined) out.push(`+ ${r}`);
  }
  return out.join('\n');
}

/**
 * @param {string} outputRoot
 * @param {'chrome' | 'firefox'} browser
 */
async function collectBrowserHashes(outputRoot, browser) {
  const resolved = resolveManifestCssEntries(outputRoot, browser);
  /** @type {Record<string, string>} */
  const hashes = {};
  /** @type {Record<string, string>} */
  const normalized = {};

  for (const entry of PRIMARY_ENTRIES) {
    const bundle = resolved[entry];
    if (!bundle) {
      throw new Error(`Missing CSS bundle for ${browser}/${entry}`);
    }
    const css = await bundleNormalizedCss(bundle.cssPaths);
    normalized[entry] = css;
    hashes[entry] = sha256(css);
  }

  return { hashes, normalized, resolved };
}

function parseArgs(argv) {
  /** @type {Record<string, string | boolean>} */
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      } else {
        args[key] = true;
      }
    }
  }
  return args;
}

async function snapshot(from, outDir) {
  mkdirSync(outDir, { recursive: true });

  for (const browser of BROWSERS) {
    const { hashes, normalized } = await collectBrowserHashes(from, browser);
    writeJson(join(outDir, `${browser}.json`), hashes);

    const browserCssDir = join(outDir, browser);
    mkdirSync(browserCssDir, { recursive: true });
    for (const [entry, css] of Object.entries(normalized)) {
      writeFileSync(join(browserCssDir, `${entry}.css`), css, 'utf8');
    }

    console.log(`Wrote ${browser} CSS hashes (${PRIMARY_ENTRIES.join(', ')})`);
  }
}

async function check(goldenDir, targetDir) {
  const artifactsDir = join(APP_ROOT, 'artifacts/css-diff');
  mkdirSync(artifactsDir, { recursive: true });

  let failed = false;

  for (const browser of BROWSERS) {
    const goldenPath = join(goldenDir, `${browser}.json`);
    if (!existsSync(goldenPath)) {
      console.error(`Missing golden manifest: ${goldenPath}`);
      failed = true;
      continue;
    }

    const expected = JSON.parse(readText(goldenPath));
    const actual = await collectBrowserHashes(targetDir, browser);

    for (const entry of PRIMARY_ENTRIES) {
      const expectedHash = expected[entry];
      const actualHash = actual.hashes[entry];

      if (expectedHash !== actualHash) {
        failed = true;
        console.error(`MISMATCH ${browser}/${entry}: expected ${expectedHash}, got ${actualHash}`);

        const goldenCssPath = join(goldenDir, browser, `${entry}.css`);
        const goldenCss = existsSync(goldenCssPath)
          ? readText(goldenCssPath)
          : '(golden css file missing)';
        const diff = unifiedDiff(goldenCss, actual.normalized[entry], `${browser}/${entry}.css`);
        const diffPath = join(artifactsDir, `${browser}-${entry}.diff`);
        writeFileSync(diffPath, diff, 'utf8');
        console.error(`  diff written to ${diffPath}`);

        const goldenSelectors = extractSelectors(goldenCss);
        const actualSelectors = extractSelectors(actual.normalized[entry]);
        const onlyGolden = setDiff(goldenSelectors, actualSelectors);
        const onlyActual = setDiff(actualSelectors, goldenSelectors);
        if (onlyGolden.length || onlyActual.length) {
          writeJson(join(artifactsDir, `${browser}-${entry}-selectors.json`), {
            onlyGolden,
            onlyActual,
          });
        }

        const goldenKeyframes = extractKeyframes(goldenCss);
        const actualKeyframes = extractKeyframes(actual.normalized[entry]);
        const kfGolden = setDiff(goldenKeyframes, actualKeyframes);
        const kfActual = setDiff(actualKeyframes, goldenKeyframes);
        if (kfGolden.length || kfActual.length) {
          writeJson(join(artifactsDir, `${browser}-${entry}-keyframes.json`), {
            onlyGolden: kfGolden,
            onlyActual: kfActual,
          });
        }
      }
    }
  }

  if (failed) {
    console.error('css-equivalence --check FAILED');
    process.exit(1);
  }

  console.log('css-equivalence --check OK');
}

async function main() {
  const args = parseArgs(process.argv);

  if (args.snapshot) {
    const from = typeof args.from === 'string' ? args.from : join(APP_ROOT, '.output');
    const out = typeof args.out === 'string' ? args.out : join(APP_ROOT, '../golden/css');
    await snapshot(from, out);
    return;
  }

  if (args.check) {
    const golden = typeof args.golden === 'string' ? args.golden : join(APP_ROOT, '../golden/css');
    const target = typeof args.target === 'string' ? args.target : join(APP_ROOT, '.output');
    await check(golden, target);
    return;
  }

  console.error(
    'Usage: node scripts/css-equivalence.mjs --snapshot [--from .output] [--out ../golden/css]',
  );
  console.error(
    '       node scripts/css-equivalence.mjs --check [--golden ../golden/css] [--target .output]',
  );
  process.exit(2);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
