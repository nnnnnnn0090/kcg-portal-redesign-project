import { SOCIAL_ICON_PATHS } from '../constants';
import type { SocialPlatform } from '../types';
import { cn } from '../classNames';

export function SocialIcon({ platform }: { platform: SocialPlatform }) {
  if (platform === 'unityroom') {
    return (
      <span
        className={
          'community-social-icon tw-inline-grid tw-h-[22px] tw-w-[22px] tw-flex-none tw-place-items-center tw-rounded-full tw-bg-community-bright tw-text-community-bg [&_svg]:tw-block [&_svg]:tw-h-3.5 [&_svg]:tw-w-3.5 [&_svg]:tw-fill-current [&.is-x]:tw-bg-[#111] [&.is-x]:tw-text-white [&.is-pixiv]:tw-bg-[#0096fa] [&.is-pixiv]:tw-text-white [&.is-zenn]:tw-bg-[#3ea8ff] [&.is-zenn]:tw-text-white [&.is-qiita]:tw-bg-[#55c500] [&.is-qiita]:tw-text-white [&.is-hatena]:tw-bg-[#00a4de] [&.is-hatena]:tw-text-white [&.is-unityroom]:tw-border [&.is-unityroom]:tw-border-[#d9e0e8] [&.is-unityroom]:tw-bg-white [&.is-unityroom_svg]:tw-h-[21px] [&.is-unityroom_svg]:tw-w-[15px] is-unityroom'
        }
        aria-hidden="true"
      >
        <svg viewBox="0 0 100 142" focusable="false">
          <g transform="translate(-465 -316)">
            <g transform="translate(93.4661 -54.75)">
              <g transform="matrix(1.14612 0 0 1.14612 -59.1453 -78.6245)">
                <g transform="matrix(.87251 0 0 .87251 -29.9452 116.371)">
                  <path
                    className={'community-unityroom-door tw-fill-[#2e93ff]'}
                    d="M564.867 339.624c0-3.314-2.044-6.285-5.139-7.471l-39.482-15.124a8 8 0 0 0-10.862 7.471V450a8 8 0 0 0 10.862 7.471l39.482-15.124a8 8 0 0 0 5.139-7.471v-95.252Zm-34.472 39.626a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z"
                  />
                </g>
                <g transform="matrix(.798724 0 0 1.0024 74.5112 10.6876)">
                  <path
                    className={'community-unityroom-frame tw-fill-[#2a68c5]'}
                    d="M411.739 400c0-3.846-3.913-6.963-8.739-6.963h-16c-4.826 0-8.739 3.117-8.739 6.963v85c0 3.846 3.913 6.963 8.739 6.963h16c4.826 0 8.739-3.117 8.739-6.963v-85Z"
                  />
                </g>
              </g>
            </g>
          </g>
        </svg>
      </span>
    );
  }

  return (
    <span
      className={cn(
        'community-social-icon tw-inline-grid tw-h-[22px] tw-w-[22px] tw-flex-none tw-place-items-center tw-rounded-full tw-bg-community-bright tw-text-community-bg [&_svg]:tw-block [&_svg]:tw-h-3.5 [&_svg]:tw-w-3.5 [&_svg]:tw-fill-current [&.is-x]:tw-bg-[#111] [&.is-x]:tw-text-white [&.is-pixiv]:tw-bg-[#0096fa] [&.is-pixiv]:tw-text-white [&.is-zenn]:tw-bg-[#3ea8ff] [&.is-zenn]:tw-text-white [&.is-qiita]:tw-bg-[#55c500] [&.is-qiita]:tw-text-white [&.is-hatena]:tw-bg-[#00a4de] [&.is-hatena]:tw-text-white [&.is-unityroom]:tw-border [&.is-unityroom]:tw-border-[#d9e0e8] [&.is-unityroom]:tw-bg-white [&.is-unityroom_svg]:tw-h-[21px] [&.is-unityroom_svg]:tw-w-[15px]',
        `is-${platform}`,
      )}
      aria-hidden="true"
    >
      <svg viewBox="0 0 24 24" focusable="false">
        <path d={SOCIAL_ICON_PATHS[platform]} />
      </svg>
    </span>
  );
}
