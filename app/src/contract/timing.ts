/** タイミング契約（§4.4.5）。 */

export const TIMING = {
  bootCoverRafDefault: 3,
  bootCoverRafWithToast: 5,
  toastDefaultMs: 3200,
  toastSyncLongMs: 5800,
  toastUpdateMs: 5200,
  toastCloseFallbackMs: 420,
  calendarHoverHideMs: 60,
  calendarWatchdogMs: 15000,
  kingLmsSyncSafetyMs: 120000,
  kingLmsCalendarFlushDebounceMs: 700,
  pageFetchPollMs: 200,
  pageFetchDeadlineMs: 15000,
  pageFetchMaxAttempts: 10,
  pageFetchRetryBaseMs: 100,
  pageFetchRetryStepMs: 200,
  pageFetchRetryMaxMs: 2200,
  newsSenderPollMs: 100,
  newsSenderPollMaxAttempts: 50,
  cplanSnapshotPollMs: 100,
  cplanSnapshotMaxAttempts: 20,
  assignmentCapturedLabelMs: 1000,
  gradebookFetchRetryCount: 3,
  gradebookFetchRetryDelayMs: 400,
  gradebookConcurrency: 8,
} as const;

/** pageFetch 401 リトライ遅延: `min(100+attempt*200, 2200)` */
export function pageFetchRetryDelayMs(attempt: number): number {
  return Math.min(
    TIMING.pageFetchRetryBaseMs + attempt * TIMING.pageFetchRetryStepMs,
    TIMING.pageFetchRetryMaxMs,
  );
}
