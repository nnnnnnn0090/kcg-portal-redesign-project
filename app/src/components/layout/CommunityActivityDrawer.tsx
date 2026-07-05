import type { AppLanguage } from '../../i18n/messages';
import { CommunityShell } from '../../features/community/CommunityShell';
import { CommunityProvider } from '../../features/community/state/CommunityProvider';
import '../../styles/tailwind-overlay.css';

export function CommunityActivityDrawer({
  language,
  defaultAuthorName,
  apiOrigin,
  onClose,
}: {
  language: AppLanguage;
  defaultAuthorName: string;
  apiOrigin: string;
  onClose: () => void;
}) {
  return (
    <CommunityProvider
      language={language}
      defaultAuthorName={defaultAuthorName}
      apiOrigin={apiOrigin}
      onClose={onClose}
    >
      <CommunityShell />
    </CommunityProvider>
  );
}
