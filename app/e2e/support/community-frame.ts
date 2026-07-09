import type { FrameLocator, Page } from '@playwright/test';

/** コミュニティUI iframe（portal-community-server /app）へのロケータ */
export function communityFrame(page: Page): FrameLocator {
  return page.frameLocator('#p-community-activity-drawer');
}
