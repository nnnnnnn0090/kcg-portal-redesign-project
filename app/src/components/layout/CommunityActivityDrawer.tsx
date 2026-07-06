import type { AppLanguage } from '../../i18n/messages';
import { CommunityShell } from '../../features/community/CommunityShell';
import { CommunityProvider } from '../../features/community/state/CommunityProvider';
import '../../styles/tailwind-overlay.css';

export function CommunityActivityDrawer({
  language,
  apiOrigin,
  onClose,
}: {
  language: AppLanguage;
  apiOrigin: string;
  onClose: () => void;
}) {
  return (
    <CommunityProvider language={language} apiOrigin={apiOrigin} onClose={onClose}>
      <CommunityShell />
    </CommunityProvider>
  );
}
