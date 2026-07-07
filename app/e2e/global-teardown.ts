import { stopCommunityServerIfStarted } from './support/community-server';
import { disposeSharedExtensionContext } from './support/shared-extension';

export default async function globalTeardown(): Promise<void> {
  await disposeSharedExtensionContext();
  await stopCommunityServerIfStarted();
}
