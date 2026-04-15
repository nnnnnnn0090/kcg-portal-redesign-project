/**
 * ポータル素 HTML の「絞り込み条件」ブロックから配信元・カテゴリ一覧を抽出する。
 * （拡張オーバーレイ外の section / div.mat / ul.checkList 構造を参照）
 */

import { PORTAL_DOM } from './constants';

export interface NewsListFilterOption {
  readonly value: string;
  readonly label: string;
}

export interface ParsedNewsListFilters {
  readonly senders: NewsListFilterOption[];
  readonly categories: NewsListFilterOption[];
}

function isOutsideOverlay(el: Element | null): boolean {
  if (!el) return false;
  return !el.closest(`#${PORTAL_DOM.overlayRoot}`);
}

/** 素ページ側の「絞り込み条件」セクションを返す。 */
function findPortalNewsFilterSection(root: Document | Element = document): HTMLElement | null {
  for (const sec of root.querySelectorAll('section')) {
    if (!isOutsideOverlay(sec)) continue;
    const h2 = sec.querySelector(':scope > h2.title') ?? sec.querySelector(':scope > h2');
    const t = h2?.textContent?.replace(/\s+/g, ' ').trim() ?? '';
    if (t === '絞り込み条件') return sec as HTMLElement;
  }
  return null;
}

function parseMatCheckboxes(
  section: HTMLElement,
  headingIncludes: string,
  inputName: 'sender' | 'category',
): NewsListFilterOption[] {
  const mats = section.querySelectorAll('div.mat');
  for (const mat of mats) {
    const h3 = mat.querySelector('h3');
    if (!h3?.textContent?.includes(headingIncludes)) continue;
    const out: NewsListFilterOption[] = [];
    for (const input of mat.querySelectorAll<HTMLInputElement>(
      `input[type="checkbox"][name="${inputName}"]`,
    )) {
      const value = String(input.value ?? '').trim();
      if (!value) continue;
      const li = input.closest('li');
      const label =
        (li?.querySelector('label')?.textContent ?? '').replace(/\s+/g, ' ').trim() || value;
      out.push({ value, label });
    }
    return out;
  }
  return [];
}

/** ポータル DOM から絞り込み用オプションを読む。見つからないときは空配列。 */
export function parsePortalNewsListFilters(doc: Document = document): ParsedNewsListFilters {
  const section = findPortalNewsFilterSection(doc);
  if (!section) {
    return { senders: [], categories: [] };
  }
  return {
    senders: parseMatCheckboxes(section, '配信元', 'sender'),
    categories: parseMatCheckboxes(section, 'カテゴリ', 'category'),
  };
}
