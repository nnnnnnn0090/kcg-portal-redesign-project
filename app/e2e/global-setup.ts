import { ensureCommunityServerForE2e } from './support/community-server';
import { realServerReady } from './support/shared-extension';

export default async function globalSetup(): Promise<void> {
  if (!realServerReady()) {
    console.warn('Skipping E2E global setup: PORTAL_MS_EMAIL / PORTAL_MS_PASSWORD not set');
    return;
  }

  await ensureCommunityServerForE2e();
}
