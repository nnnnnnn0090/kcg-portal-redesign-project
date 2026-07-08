import { Glyph } from './Glyph';

type IntroGlyph = 'image' | 'impression' | 'heart' | 'user' | 'comment';

type IntroItem = {
  glyph: IntroGlyph;
  title: string;
  body: string;
};

export function communityActivityIntroItems(ja: boolean): IntroItem[] {
  if (ja) {
    return [
      {
        glyph: 'image',
        title: '作品',
        body: '授業で作ったもの、ゲームや映像、ポートフォリオ',
      },
      {
        glyph: 'impression',
        title: 'イベント・展示',
        body: '11月祭、作品展、オープンキャンパスなど',
      },
      {
        glyph: 'heart',
        title: 'サークル',
        body: '活動の共有',
      },
      {
        glyph: 'user',
        title: '募集・勧誘',
        body: 'メンバー募集、新入生向けの案内',
      },
      {
        glyph: 'comment',
        title: 'その他',
        body: '制作の進捗、学内の話題',
      },
    ];
  }
  return [
    {
      glyph: 'image',
      title: 'Work and assignments',
      body: 'Class projects, games, videos, and portfolios',
    },
    {
      glyph: 'impression',
      title: 'Events and showcases',
      body: 'Festivals, exhibitions, and open campus',
    },
    {
      glyph: 'heart',
      title: 'Clubs and circles',
      body: 'Practice, competitions, and activity logs',
    },
    {
      glyph: 'user',
      title: 'Recruitment',
      body: 'Member search and welcome posts',
    },
    {
      glyph: 'comment',
      title: 'Other topics',
      body: 'Workshops, internships, progress updates',
    },
  ];
}

export function CommunityActivityIntroPanel({
  ja,
  id,
  className = '',
}: {
  ja: boolean;
  id?: string;
  className?: string;
}) {
  const items = communityActivityIntroItems(ja);

  return (
    <section
      id={id}
      className={`community-activity-guide tw-rounded-2xl tw-border tw-border-community-border tw-bg-community-bg2 tw-p-4 max-[620px]:tw-p-3 ${className}`.trim()}
      aria-labelledby={id ? `${id}-title` : undefined}
    >
      <header
        className={
          'community-section-heading tw-mb-4 [&_small]:tw-block [&_small]:tw-text-xs [&_small]:tw-font-bold [&_small]:tw-tracking-[.08em] [&_small]:tw-text-community-accent-light [&_h2]:tw-m-0 [&_h2]:tw-mt-1 [&_h2]:tw-text-lg [&_h2]:tw-text-community-bright [&_p]:tw-m-0 [&_p]:tw-mt-2 [&_p]:tw-max-w-[640px] [&_p]:tw-text-sm [&_p]:tw-leading-7 [&_p]:tw-text-community-muted'
        }
      >
        <small>{ja ? 'GUIDE' : 'GUIDE'}</small>
        <h2 id={id ? `${id}-title` : undefined}>
          {ja ? 'この場所でできること' : 'What you can post here'}
        </h2>
        <p>
          {ja
            ? '学習成果の共有、イベントの記録、サークル活動、メンバー募集などを投稿できます。'
            : 'Share coursework, event photos, club updates, recruitment posts, and more.'}
        </p>
      </header>

      <ul className="tw-m-0 tw-grid tw-list-none tw-gap-3 tw-p-0 sm:tw-grid-cols-2">
        {items.map((item) => (
          <li
            key={item.title}
            className="tw-group tw-flex tw-items-center tw-gap-3 tw-rounded-xl tw-border tw-border-community-border tw-bg-community-bg3 tw-px-3 tw-py-2.5 tw-shadow-community-card tw-transition-[transform,border-color,box-shadow] tw-duration-200 hover:tw-translate-y-[-2px] hover:tw-border-community-accent hover:tw-shadow-[0_12px_28px_color-mix(in_srgb,#000_18%,transparent)]"
          >
            <span
              className="tw-grid tw-h-9 tw-w-9 tw-flex-none tw-place-items-center tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg2 tw-text-community-accent-light tw-transition-transform tw-duration-200 group-hover:tw-scale-105 [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-fill-none [&_svg]:tw-stroke-current [&_svg]:tw-stroke-[1.9]"
              aria-hidden="true"
            >
              <Glyph name={item.glyph} />
            </span>
            <div className="tw-flex tw-min-w-0 tw-flex-col tw-gap-0.5">
              <strong className="tw-text-[13px] tw-font-bold tw-leading-5 tw-text-community-bright">
                {item.title}
              </strong>
              <span className="tw-text-xs tw-leading-5 tw-text-community-muted">
                {item.body}
              </span>
            </div>
          </li>
        ))}
      </ul>

      <p className="tw-m-0 tw-mt-4 tw-border-t tw-border-community-border tw-pt-3 tw-text-[13px] tw-leading-6 tw-text-community-muted">
        {ja
          ? '他の人の投稿にいいね・コメント・フォローができます。公開前に審査があります。'
          : 'You can like, comment, and follow other posts. Everything is reviewed before publishing.'}
      </p>
    </section>
  );
}
