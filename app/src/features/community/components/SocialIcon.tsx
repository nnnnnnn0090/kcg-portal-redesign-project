import { SOCIAL_ICON_PATHS } from '../constants';
import type { SocialPlatform } from '../types';

export function SocialIcon({ platform }: { platform: SocialPlatform }) {
  if (platform === 'unityroom') {
    return (
      <span className="community-social-icon is-unityroom" aria-hidden="true">
        <svg viewBox="0 0 100 142" focusable="false">
          <g transform="translate(-465 -316)">
            <g transform="translate(93.4661 -54.75)">
              <g transform="matrix(1.14612 0 0 1.14612 -59.1453 -78.6245)">
                <g transform="matrix(.87251 0 0 .87251 -29.9452 116.371)">
                  <path
                    className="community-unityroom-door"
                    d="M564.867 339.624c0-3.314-2.044-6.285-5.139-7.471l-39.482-15.124a8 8 0 0 0-10.862 7.471V450a8 8 0 0 0 10.862 7.471l39.482-15.124a8 8 0 0 0 5.139-7.471v-95.252Zm-34.472 39.626a8 8 0 1 1 0 16 8 8 0 0 1 0-16Z"
                  />
                </g>
                <g transform="matrix(.798724 0 0 1.0024 74.5112 10.6876)">
                  <path
                    className="community-unityroom-frame"
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
    <span className={`community-social-icon is-${platform}`} aria-hidden="true">
      <svg viewBox="0 0 24 24" focusable="false">
        <path d={SOCIAL_ICON_PATHS[platform]} />
      </svg>
    </span>
  );
}
