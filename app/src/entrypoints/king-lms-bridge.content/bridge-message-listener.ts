/** king-lms-hooks からの postMessage で storage を更新する */

import { KING_LMS_HOOK, KING_LMS_ORIGIN } from '../../shared/constants';
import {
  cancelPendingForLoginRedirect,
  saveAssignmentDue,
  saveCourses,
} from './bridge-storage-sync';

export function installMessageListener(): void {
  window.addEventListener('message', (e) => {
    if (e.source !== window) return;
    if (e.origin !== KING_LMS_ORIGIN) return;
    if (!e.data) return;

    if (e.data.type === KING_LMS_HOOK.syncAbortType && e.data.source === KING_LMS_HOOK.source) {
      void cancelPendingForLoginRedirect();
      return;
    }

    if (e.data.type === KING_LMS_HOOK.streamsDuePostType && e.data.source === KING_LMS_HOOK.source) {
      if (e.data.captureState === 'error') { void saveAssignmentDue([], Date.now(), 'error'); return; }
      if (!Array.isArray(e.data.items)) return;
      const capturedAt = typeof e.data.capturedAt === 'number' ? e.data.capturedAt : Date.now();
      void saveAssignmentDue(e.data.items, capturedAt);
      return;
    }

    if (e.data.type === KING_LMS_HOOK.coursesPostType && e.data.source === KING_LMS_HOOK.source) {
      if (!Array.isArray(e.data.courses)) return;
      void saveCourses(e.data.courses);
    }
  });
}
