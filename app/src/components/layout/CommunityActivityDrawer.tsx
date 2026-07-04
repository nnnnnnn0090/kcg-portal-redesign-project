import type { AppLanguage } from '../../i18n/messages';
import { CommunityShell } from '../../features/community/CommunityShell';
import { CommunityProvider } from '../../features/community/state/CommunityProvider';
import '../../styles/community-tailwind.css';

export function CommunityActivityDrawer({
  language,
  defaultAuthorName,
  onClose,
}: {
  language: AppLanguage;
  defaultAuthorName: string;
  onClose: () => void;
}) {
  return (
    <CommunityProvider language={language} defaultAuthorName={defaultAuthorName} onClose={onClose}>
      <CommunityShell />
    </CommunityProvider>
  );
}
