export type NewsTab = 'general' | 'lostProperty';

interface NewsTabsProps {
  activeTab: NewsTab;
  generalLabel: string;
  lostPropertyLabel: string;
  onChange: (tab: NewsTab) => void;
}

export function NewsTabs({ activeTab, generalLabel, lostPropertyLabel, onChange }: NewsTabsProps) {
  return (
    <div className="p-news-tabs" role="tablist" aria-label={generalLabel}>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'general'}
        className={activeTab === 'general' ? 'is-active' : ''}
        onClick={() => onChange('general')}
      >
        {generalLabel}
      </button>
      <button
        type="button"
        role="tab"
        aria-selected={activeTab === 'lostProperty'}
        className={activeTab === 'lostProperty' ? 'is-active' : ''}
        onClick={() => onChange('lostProperty')}
      >
        {lostPropertyLabel}
      </button>
    </div>
  );
}
