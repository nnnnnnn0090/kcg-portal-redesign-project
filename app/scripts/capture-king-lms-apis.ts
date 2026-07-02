/**
 * Capture King LMS `/learn/api/` responses (sessionStorage dump via AppleScript).
 * Run: cd app && npx tsx scripts/capture-king-lms-apis.ts
 */
import { spawnSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { KING_LMS_API_CAPTURE_KEY, type KingLmsApiCaptureRow } from '../src/lib/king-lms-api-capture';
import { buildKingLmsSamlLoginUrl, KING_LMS_ASSIGNMENT_SYNC_TARGET_URL } from '../src/shared/king-lms-url';

const ROOT = path.resolve(import.meta.dirname, '../..');
const OUT_DIR = path.join(ROOT, 'app/.king-lms-api-capture');
const CHROME_DEV = path.join(ROOT, 'scripts/chrome-dev.sh');
const captureTarget = new URL(KING_LMS_ASSIGNMENT_SYNC_TARGET_URL);
captureTarget.searchParams.set('kcg_capture', '1');
const TARGET_URL = buildKingLmsSamlLoginUrl(captureTarget.href);

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

function runJs(js: string): string {
  const script = `
tell application "Google Chrome"
  set js to ${JSON.stringify(js)}
  return execute active tab of front window javascript js
end tell`;
  const result = spawnSync('osascript', ['-e', script], { encoding: 'utf8' });
  if (result.status !== 0) {
    throw new Error(result.stderr || result.stdout || 'osascript failed');
  }
  return (result.stdout ?? '').trim();
}

function reloadChromeTab() {
  spawnSync('osascript', ['-e', 'tell application "Google Chrome" to reload active tab of front window']);
}

function readSessionCaptures(): KingLmsApiCaptureRow[] {
  const raw = runJs(`sessionStorage.getItem(${JSON.stringify(KING_LMS_API_CAPTURE_KEY)}) || "[]"`);
  try {
    const parsed = JSON.parse(raw) as KingLmsApiCaptureRow[];
    return Array.isArray(parsed) ? parsed : [];
  } catch {
    return [];
  }
}

function clearSessionCaptures() {
  runJs(`sessionStorage.removeItem(${JSON.stringify(KING_LMS_API_CAPTURE_KEY)}); sessionStorage.setItem("kcgKingLmsCapture","1");`);
}

function summarizeRow(row: KingLmsApiCaptureRow) {
  const raw = row.raw;
  let itemCount: number | null = null;
  if (Array.isArray(raw)) itemCount = raw.length;
  else if (raw && typeof raw === 'object') {
    const o = raw as Record<string, unknown>;
    if (Array.isArray(o.results)) itemCount = o.results.length;
  }
  return {
    pathname: row.pathname,
    search: row.search,
    itemCount,
    href: row.href,
    capturedAt: row.capturedAt,
  };
}

async function main() {
  fs.rmSync(OUT_DIR, { recursive: true, force: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log('build + open King LMS calendar page…');
  spawnSync('npm', ['run', 'build'], { cwd: path.join(ROOT, 'app'), stdio: 'inherit' });
  const launch = spawnSync('bash', [CHROME_DEV], {
    env: {
      ...process.env,
      CHROME_USE_SYSTEM_PROFILE: '1',
      CHROME_DEV_URL: TARGET_URL,
      NO_BUILD: '1',
    },
    encoding: 'utf8',
  });
  process.stdout.write(launch.stdout ?? '');
  process.stderr.write(launch.stderr ?? '');
  if (launch.status !== 0) throw new Error('chrome-dev.sh failed');

  console.log('wait first load…');
  await sleep(15_000);
  try { clearSessionCaptures(); } catch {}
  await sleep(2_000);

  console.log('reload calendar page…');
  reloadChromeTab();
  await sleep(20_000);

  const captures = readSessionCaptures();
  console.log(`captures after reload: ${captures.length}`);

  captures.forEach((row, index) => {
    const summary = summarizeRow(row);
    console.log(`#${index} ${summary.pathname}${summary.search} items=${summary.itemCount ?? '?'}`);
    const safeName = `${index}-${row.pathname.replace(/\//g, '_')}.json`;
    fs.writeFileSync(path.join(OUT_DIR, safeName), JSON.stringify(row, null, 2));
  });

  const byPath = new Map<string, number>();
  for (const row of captures) {
    byPath.set(row.pathname, (byPath.get(row.pathname) ?? 0) + 1);
  }

  fs.writeFileSync(path.join(OUT_DIR, 'summary.json'), JSON.stringify({
    targetUrl: TARGET_URL,
    total: captures.length,
    byPath: Object.fromEntries(byPath),
    rows: captures.map((c, index) => ({ index, ...summarizeRow(c) })),
  }, null, 2));

  console.log(`done: ${captures.length} captures -> ${OUT_DIR}`);
  if (captures.length === 0) process.exitCode = 1;
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
