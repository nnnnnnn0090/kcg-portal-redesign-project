import type { SocialPlatform } from './types';

export const SOCIAL_PLATFORM_FORMATS: Record<
  SocialPlatform,
  { prefix: string; suffix?: string; maxLength: number; inputMode?: 'text' | 'numeric' }
> = {
  github: { prefix: 'https://github.com/', maxLength: 20 },
  x: { prefix: 'https://x.com/', maxLength: 15 },
  pixiv: { prefix: 'https://www.pixiv.net/users/', maxLength: 12, inputMode: 'numeric' },
  zenn: { prefix: 'https://zenn.dev/', maxLength: 20 },
  qiita: { prefix: 'https://qiita.com/', maxLength: 20 },
  hatena: { prefix: 'https://', suffix: '.hatenablog.com', maxLength: 20 },
  unityroom: { prefix: 'https://unityroom.com/users/', maxLength: 20 },
};

export function socialUrlToId(platform: SocialPlatform, value: string | undefined): string {
  const trimmed = (value ?? '').trim();
  if (!trimmed) return '';
  const format = SOCIAL_PLATFORM_FORMATS[platform];
  if (trimmed.startsWith(format.prefix) && (!format.suffix || trimmed.endsWith(format.suffix))) {
    return trimmed
      .slice(format.prefix.length, format.suffix ? -format.suffix.length : undefined)
      .replace(/^@/, '')
      .trim();
  }
  return trimmed.replace(/^@/, '');
}
