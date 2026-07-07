import { HOME_SHORTCUT_EXTRAS } from '../contract/origins';
import { MSG } from '../contract/messages';
import type { ShortcutConfig } from '../platform/storage/parsers';

export interface ShortcutLink {
  midashi: string;
  url: string;
  id?: string;
}

const USER_HTML_LINK_ID = MSG.userHtmlLink;

/** shortcutConfig のマージ規則（F-025）: order/hidden/custom + 固定 extras */
export function mergeShortcutLinks(
  apiLinks: ShortcutLink[],
  config: ShortcutConfig | undefined,
): ShortcutLink[] {
  const byId = new Map<string, ShortcutLink>();
  for (const link of apiLinks) {
    const id = link.id ?? link.url;
    byId.set(id, { ...link, id });
  }

  const custom = config?.custom ?? [];
  for (const entry of custom) {
    byId.set(entry.id, { id: entry.id, midashi: entry.midashi, url: entry.url });
  }

  const hidden = new Set(config?.hidden ?? []);
  const order = config?.order ?? [];
  const ordered: ShortcutLink[] = [];
  const seen = new Set<string>();

  for (const id of order) {
    if (hidden.has(id) || seen.has(id)) continue;
    const link = byId.get(id);
    if (link) {
      ordered.push(link);
      seen.add(id);
    }
  }

  for (const [id, link] of byId) {
    if (hidden.has(id) || seen.has(id)) continue;
    ordered.push(link);
    seen.add(id);
  }

  const extras: ShortcutLink[] = HOME_SHORTCUT_EXTRAS.map((e) => ({
    midashi: e.midashi,
    url: e.url,
    id: e.url,
  }));

  const result = [...ordered];
  for (const extra of extras) {
    if (!result.some((link) => link.url === extra.url)) result.push(extra);
  }

  return result;
}

export function defaultShortcutConfigFromApi(apiLinks: ShortcutLink[]): ShortcutConfig {
  const order = apiLinks.map((link) => link.id ?? link.url);
  if (!order.includes(USER_HTML_LINK_ID)) order.unshift(USER_HTML_LINK_ID);
  return { order, hidden: [], custom: [] };
}
