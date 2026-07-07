import { spawn, spawnSync, type ChildProcess } from 'node:child_process';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

export const DEFAULT_COMMUNITY_E2E_ORIGIN = 'http://127.0.0.1:8787';

const COMMUNITY_ROOT = path.resolve(process.cwd(), '../../portal-community-server');
const STATE_PATH = path.join(os.tmpdir(), 'kcg-portal-e2e-community-server.json');

interface CommunityServerState {
  startedBySetup: boolean;
  dataDir: string | null;
  pid: number | null;
}

function readState(): CommunityServerState {
  try {
    return JSON.parse(fs.readFileSync(STATE_PATH, 'utf8')) as CommunityServerState;
  } catch {
    return { startedBySetup: false, dataDir: null, pid: null };
  }
}

function writeState(state: CommunityServerState): void {
  fs.writeFileSync(STATE_PATH, `${JSON.stringify(state)}\n`, 'utf8');
}

async function waitForHealth(origin: string, timeoutMs: number): Promise<boolean> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const response = await fetch(`${origin}/api/health`, { cache: 'no-store' });
      if (response.ok) return true;
    } catch {
      // retry until timeout
    }
    await new Promise((resolve) => setTimeout(resolve, 500));
  }
  return false;
}

function ensureCommunityBuilt(): void {
  const nextDir = path.join(COMMUNITY_ROOT, '.next');
  if (fs.existsSync(nextDir)) return;
  console.log('[e2e setup] Building community server…');
  const result = spawnSync('npm', ['run', 'build'], {
    cwd: COMMUNITY_ROOT,
    stdio: 'inherit',
    env: process.env,
  });
  if (result.status !== 0) {
    throw new Error('Community server build failed');
  }
}

function spawnCommunityServer(origin: URL): ChildProcess {
  const dataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'kcg-community-e2e-'));
  const child = spawn('npm', ['run', 'start'], {
    cwd: COMMUNITY_ROOT,
    env: {
      ...process.env,
      DATA_DIR: dataDir,
      ADMIN_PASSWORD: process.env.CI_ADMIN_PASSWORD ?? process.env.ADMIN_PASSWORD ?? 'e2e-admin',
      ALLOWED_ORIGINS: 'https://home.kcg.ac.jp',
      PORT: origin.port || '8787',
    },
    stdio: 'ignore',
    shell: false,
  });

  writeState({
    startedBySetup: true,
    dataDir,
    pid: child.pid ?? null,
  });
  return child;
}

export async function ensureCommunityServerForE2e(): Promise<string> {
  const origin = process.env.COMMUNITY_E2E_API_ORIGIN?.trim() || DEFAULT_COMMUNITY_E2E_ORIGIN;
  process.env.COMMUNITY_E2E_API_ORIGIN = origin;

  if (await waitForHealth(origin, 2_000)) {
    console.log(`[e2e setup] Reusing community server at ${origin}`);
    writeState({ startedBySetup: false, dataDir: null, pid: null });
    return origin;
  }

  if (!fs.existsSync(path.join(COMMUNITY_ROOT, 'package.json'))) {
    throw new Error(
      `Community server not found at ${COMMUNITY_ROOT}. FL-11 requires ${origin} or run-tests.sh --with-e2e.`,
    );
  }

  ensureCommunityBuilt();
  console.log(`[e2e setup] Starting community server at ${origin}…`);
  spawnCommunityServer(new URL(origin));

  if (!(await waitForHealth(origin, 60_000))) {
    throw new Error(`Community server failed to start at ${origin}`);
  }

  console.log('[e2e setup] Community server ready');
  return origin;
}

export async function stopCommunityServerIfStarted(): Promise<void> {
  const state = readState();
  if (!state.startedBySetup) return;

  if (state.pid) {
    try {
      process.kill(state.pid, 'SIGTERM');
    } catch {
      // already stopped
    }
  }

  if (state.dataDir && fs.existsSync(state.dataDir)) {
    fs.rmSync(state.dataDir, { recursive: true, force: true });
  }

  writeState({ startedBySetup: false, dataDir: null, pid: null });
}
