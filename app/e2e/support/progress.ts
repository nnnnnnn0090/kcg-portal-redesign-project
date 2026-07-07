function timestamp(): string {
  return new Date().toISOString().slice(11, 19);
}

export function logE2e(message: string): void {
  console.log(`[e2e ${timestamp()}] ${message}`);
}

export function logStepStart(index: number, total: number, label: string): void {
  console.log(`[${timestamp()}] (${index}/${total}) ▶ ${label}`);
}

export function logStepDone(index: number, total: number, label: string, elapsedMs: number): void {
  console.log(`[${timestamp()}] (${index}/${total}) ✓ ${label} (${(elapsedMs / 1000).toFixed(1)}s)`);
}
