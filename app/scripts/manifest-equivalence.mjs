#!/usr/bin/env node
import { readFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { readJson } from './_freeze-utils.mjs';

const SCRIPT_DIR = dirname(fileURLToPath(import.meta.url));
const APP_ROOT = join(SCRIPT_DIR, '..');

/** @param {string[]} argv */
function parseArgs(argv) {
  /** @type {Record<string, string>} */
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const token = argv[i];
    if (token.startsWith('--')) {
      const key = token.slice(2);
      const next = argv[i + 1];
      if (next && !next.startsWith('--')) {
        args[key] = next;
        i += 1;
      }
    }
  }
  return args;
}

/**
 * @param {unknown} value
 * @returns {unknown}
 */
function sortDeep(value) {
  if (Array.isArray(value)) {
    return value.map(sortDeep);
  }
  if (value && typeof value === 'object') {
    /** @type {Record<string, unknown>} */
    const sorted = {};
    for (const key of Object.keys(value).sort()) {
      sorted[key] = sortDeep(value[key]);
    }
    return sorted;
  }
  return value;
}

/**
 * @param {string} path
 * @param {unknown} expected
 * @param {unknown} actual
 * @returns {string[]}
 */
function diffObjects(path, expected, actual) {
  /** @type {string[]} */
  const diffs = [];

  if (Array.isArray(expected) && Array.isArray(actual)) {
    if (expected.length !== actual.length) {
      diffs.push(`${path}: array length ${expected.length} != ${actual.length}`);
    }
    const len = Math.min(expected.length, actual.length);
    for (let i = 0; i < len; i += 1) {
      diffs.push(...diffObjects(`${path}[${i}]`, expected[i], actual[i]));
    }
    return diffs;
  }

  if (
    expected &&
    actual &&
    typeof expected === 'object' &&
    typeof actual === 'object' &&
    !Array.isArray(expected) &&
    !Array.isArray(actual)
  ) {
    const expectedObj = /** @type {Record<string, unknown>} */ (expected);
    const actualObj = /** @type {Record<string, unknown>} */ (actual);
    const keys = new Set([...Object.keys(expectedObj), ...Object.keys(actualObj)]);
    for (const key of [...keys].sort()) {
      if (!(key in expectedObj)) {
        diffs.push(`${path}.${key}: unexpected key in target`);
        continue;
      }
      if (!(key in actualObj)) {
        diffs.push(`${path}.${key}: missing key in target`);
        continue;
      }
      diffs.push(...diffObjects(`${path}.${key}`, expectedObj[key], actualObj[key]));
    }
    return diffs;
  }

  if (expected !== actual) {
    diffs.push(`${path}: ${JSON.stringify(expected)} != ${JSON.stringify(actual)}`);
  }

  return diffs;
}

/**
 * @param {unknown} manifest
 * @param {string} version
 */
function normalizeVersion(manifest, version) {
  const clone = structuredClone(manifest);
  if (clone && typeof clone === 'object') {
    /** @type {Record<string, unknown>} */ (clone).version = version;
  }
  return clone;
}

function main() {
  const args = parseArgs(process.argv);
  const goldenPath = args.golden;
  const targetPath = args.target;
  const versionSource = args['version-source'];

  if (!goldenPath || !targetPath) {
    console.error(
      'Usage: node scripts/manifest-equivalence.mjs --golden <path> --target <path> [--version-source version.json]',
    );
    process.exit(2);
  }

  const golden = sortDeep(readJson(goldenPath));
  let target = sortDeep(JSON.parse(readFileSync(targetPath, 'utf8')));

  if (versionSource) {
    const versionFile = join(APP_ROOT, versionSource);
    const { version } = readJson(versionFile);
    target = sortDeep(normalizeVersion(target, version));
    const goldenNormalized = sortDeep(normalizeVersion(golden, version));
    const diffs = diffObjects('manifest', goldenNormalized, target);
    if (diffs.length > 0) {
      console.error(`manifest-equivalence FAILED (${goldenPath} vs ${targetPath})`);
      for (const line of diffs.slice(0, 50)) {
        console.error(`  ${line}`);
      }
      if (diffs.length > 50) {
        console.error(`  ... and ${diffs.length - 50} more`);
      }
      process.exit(1);
    }
    console.log(`manifest-equivalence OK (${goldenPath})`);
    return;
  }

  const diffs = diffObjects('manifest', golden, target);
  if (diffs.length > 0) {
    console.error(`manifest-equivalence FAILED (${goldenPath} vs ${targetPath})`);
    for (const line of diffs.slice(0, 50)) {
      console.error(`  ${line}`);
    }
    process.exit(1);
  }

  console.log(`manifest-equivalence OK (${goldenPath})`);
}

main();
