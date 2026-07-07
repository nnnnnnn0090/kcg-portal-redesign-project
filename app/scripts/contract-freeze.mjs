#!/usr/bin/env node
import { createRequire } from 'node:module';
import { join } from 'node:path';
import {
  APP_ROOT,
  GOLDEN_ROOT,
  hashFileGroup,
  listContractFiles,
  listI18nLocaleFiles,
  readJson,
  readSourceFile,
  sha256,
  sha256File,
  writeJson,
} from './_freeze-utils.mjs';

const require = createRequire(import.meta.url);
const { createJiti } = require('jiti');

const STRINGS_LOCK = join(GOLDEN_ROOT, 'strings.lock.json');
const THEME_TOKENS = join(GOLDEN_ROOT, 'theme-tokens.json');

const THEME_SOURCE_FILES = [
  'src/domain/themes/definitions.ts',
  'src/domain/themes/additional-themes.ts',
  'src/domain/themes/custom-themes.ts',
  'src/domain/themes/theme-tokens.ts',
];

/** @param {boolean} verbose */
function loadThemeSnapshot(verbose) {
  const jiti = createJiti(import.meta.url, { interopDefault: true });
  const definitions = jiti(join(APP_ROOT, 'src/domain/themes/definitions.ts'));
  const customThemes = jiti(join(APP_ROOT, 'src/domain/themes/custom-themes.ts'));

  const themes = {};
  for (const [id, tokens] of Object.entries(definitions.THEMES)) {
    themes[id] = tokens;
  }

  const snapshot = {
    defaultTheme: definitions.DEFAULT_THEME,
    themes,
    customTheme: {
      schemaVersion: customThemes.CUSTOM_THEME_SCHEMA_VERSION,
      prefix: customThemes.CUSTOM_THEME_PREFIX,
      emptyCollection: customThemes.EMPTY_CUSTOM_THEMES,
      tokenKeys: customThemes.THEME_TOKEN_KEYS,
    },
  };

  if (verbose) {
    console.log(`theme tokens: ${Object.keys(themes).length} built-in themes`);
  }

  return snapshot;
}

function collectLockPayload() {
  const contractFiles = listContractFiles();
  const i18nFiles = listI18nLocaleFiles();
  const themeSnapshot = loadThemeSnapshot(false);
  const themeTokensCanonical = JSON.stringify(themeSnapshot);
  const themeSourceHashes = Object.fromEntries(
    THEME_SOURCE_FILES.map((relPath) => [relPath, sha256File(join(APP_ROOT, relPath))]),
  );

  const fileHashes = {
    ...Object.fromEntries(contractFiles.map((relPath) => [relPath, sha256File(join(APP_ROOT, relPath))])),
    ...Object.fromEntries(i18nFiles.map((relPath) => [relPath, sha256File(join(APP_ROOT, relPath))])),
    ...themeSourceHashes,
  };

  return {
    generatedAt: new Date().toISOString(),
    files: fileHashes,
    groups: {
      contract: hashFileGroup(contractFiles, 'contract'),
      i18n: hashFileGroup(i18nFiles, 'i18n'),
      themeSources: hashFileGroup(THEME_SOURCE_FILES, 'themeSources'),
    },
    themeTokensSha256: sha256(themeTokensCanonical),
    themeTokens: themeSnapshot,
  };
}

function snapshot() {
  const payload = collectLockPayload();
  const { themeTokens, ...lockPayload } = payload;

  writeJson(STRINGS_LOCK, lockPayload);
  writeJson(THEME_TOKENS, themeTokens);

  console.log(`Wrote ${STRINGS_LOCK}`);
  console.log(`Wrote ${THEME_TOKENS}`);
  console.log(`  contract files: ${listContractFiles().length}`);
  console.log(`  i18n locale files: ${listI18nLocaleFiles().length}`);
  console.log(`  themes: ${Object.keys(themeTokens.themes).length}`);
}

function check() {
  const expectedLock = readJson(STRINGS_LOCK);
  const expectedThemes = readJson(THEME_TOKENS);
  const actual = collectLockPayload();

  let failed = false;

  const compareField = (label, expected, actualValue) => {
    if (expected !== actualValue) {
      console.error(`MISMATCH ${label}`);
      console.error(`  expected: ${expected}`);
      console.error(`  actual:   ${actualValue}`);
      failed = true;
    }
  };

  for (const [relPath, expectedHash] of Object.entries(expectedLock.files)) {
    const actualHash = actual.files[relPath];
    if (!actualHash) {
      console.error(`MISSING file in current tree: ${relPath}`);
      failed = true;
      continue;
    }
    compareField(relPath, expectedHash, actualHash);
  }

  for (const relPath of Object.keys(actual.files)) {
    if (!(relPath in expectedLock.files)) {
      console.error(`UNEXPECTED file not in lock: ${relPath}`);
      failed = true;
    }
  }

  for (const [group, expectedHash] of Object.entries(expectedLock.groups)) {
    compareField(`group:${group}`, expectedHash, actual.groups[group]);
  }

  compareField('themeTokensSha256', expectedLock.themeTokensSha256, actual.themeTokensSha256);

  const actualThemeJson = JSON.stringify(actual.themeTokens);
  const expectedThemeJson = JSON.stringify(expectedThemes);
  if (actualThemeJson !== expectedThemeJson) {
    console.error('MISMATCH theme-tokens.json content');
    failed = true;
  }

  if (failed) {
    console.error('contract-freeze --check FAILED');
    process.exit(1);
  }

  console.log('contract-freeze --check OK');
}

function usage() {
  console.error('Usage: node scripts/contract-freeze.mjs --snapshot | --check');
  process.exit(2);
}

const mode = process.argv[2];
if (mode === '--snapshot') {
  snapshot();
} else if (mode === '--check') {
  check();
} else {
  usage();
}
