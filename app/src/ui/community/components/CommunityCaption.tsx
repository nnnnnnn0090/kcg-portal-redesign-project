import { useMemo, type MouseEvent } from 'react';
import { renderCommunityMarkdown } from '../community-markdown';
import { cn } from '../../../lib/cn';

export const COMMUNITY_CAPTION_MARKDOWN_CLASS =
  'community-caption-markdown tw-break-words [&_a]:tw-break-all [&_a]:tw-font-inherit [&_a]:tw-text-community-accent-light [&_a]:tw-underline [&_a]:tw-underline-offset-2 hover:[&_a]:tw-text-community-accent [&_blockquote]:tw-my-2 [&_blockquote]:tw-ml-0 [&_blockquote]:tw-mr-0 [&_blockquote]:tw-border-l-2 [&_blockquote]:tw-border-community-border [&_blockquote]:tw-pl-2 [&_blockquote]:tw-not-italic [&_blockquote]:tw-text-community-muted [&_blockquote_p]:tw-my-0 [&_blockquote_p+p]:tw-mt-2 [&_code]:tw-rounded [&_code]:tw-bg-community-bg3 [&_code]:tw-px-1 [&_code]:tw-py-0.5 [&_code]:tw-font-normal [&_code]:tw-text-[0.92em] [&_code]:tw-text-inherit [&_del]:tw-text-inherit [&_em]:tw-text-inherit [&_p]:tw-my-0 [&_p]:tw-leading-7 [&_p+p]:tw-mt-3 [&_pre]:tw-my-2 [&_pre]:tw-overflow-x-auto [&_pre]:tw-rounded-lg [&_pre]:tw-bg-community-bg3 [&_pre]:tw-p-3 [&_pre_code]:tw-bg-transparent [&_pre_code]:tw-p-0 [&_strong]:tw-text-inherit [&_.community-caption-plain-link]:tw-text-inherit';

export function CommunityCaption({
  caption,
  preview = false,
  className,
  onTagClick,
}: {
  caption: string;
  preview?: boolean;
  className?: string;
  onTagClick?: (tag: string) => void;
}) {
  const html = useMemo(
    () => renderCommunityMarkdown(caption, { preview }),
    [caption, preview],
  );

  if (!html) return null;

  const handleClick =
    preview || !onTagClick
      ? undefined
      : (event: MouseEvent<HTMLDivElement>) => {
          const tagButton = (event.target as HTMLElement).closest('[data-community-tag]');
          if (!(tagButton instanceof HTMLElement)) return;
          event.preventDefault();
          event.stopPropagation();
          const tag = tagButton.getAttribute('data-community-tag');
          if (tag) onTagClick(tag);
        };

  return (
    <div
      className={cn(COMMUNITY_CAPTION_MARKDOWN_CLASS, className)}
      onClick={handleClick}
      dangerouslySetInnerHTML={{ __html: html }}
    />
  );
}
