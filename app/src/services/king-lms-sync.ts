import { TIMING } from '../contract/timing';
import { SK } from '../contract/storage-keys';
import { storageRepo } from '../platform/storage/repo';
import {
  initialSyncMachine,
  transitionSyncMachine,
  type SyncMachineContext,
} from '../domain/king-lms/sync-machine';

/** King LMS 同期オーケストレーション（F-029〜F-033） */
export function createKingLmsSyncSession(): SyncMachineContext {
  return initialSyncMachine();
}

export function advanceKingLmsSync(
  ctx: SyncMachineContext,
  event: Parameters<typeof transitionSyncMachine>[1],
  kind?: Parameters<typeof transitionSyncMachine>[2],
): SyncMachineContext {
  return transitionSyncMachine(ctx, event, kind);
}

export const kingLmsSyncSafetyMs = TIMING.kingLmsSyncSafetyMs;

export async function setPortalScrollToAssignmentOnce(value: boolean): Promise<void> {
  await storageRepo.setPortalScrollToAssignmentOnce(value);
}

export async function readPortalScrollToAssignmentOnce(): Promise<boolean> {
  return storageRepo.getPortalScrollToAssignmentOnce();
}

export { SK };
