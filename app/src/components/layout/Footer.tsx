/**
 * フッターコンポーネント。
 * 既存のポータル DOM からフッターのコンテンツを取り込んで表示する。
 * また、カレンダーの tooltip / コンテキストメニュー用の DOM 要素と
 * FAB ボタン群もここに置く（#portal-overlay の末尾に配置したいため）。
 */

import { useEffect, useRef } from 'react';
import { EXTENSION_PROMO_PAGE_URL } from '../../shared/constants';
import { useCalendarOverlayUiRefs } from '../../context/calendarOverlayUi';
import { usePortalDom } from '../../context/portalDom';

interface FooterProps {
  onShareClick: () => void;
}

export function Footer({ onShareClick }: FooterProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const { overlayRoot } = usePortalDom();
  const { hoverPopRef, ctxMenuRef, btnSylRef, btnKingRef } = useCalendarOverlayUiRefs();

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    // ポータル元 DOM のフッターコンテナを探す
    const selectors = [
      'body > footer .container',
      'footer .container',
      '#footer .container',
      '.footer .container',
    ];
    const src = selectors.reduce<Element | null>((found, sel) => {
      if (found) return found;
      try {
        return [...document.querySelectorAll(sel)]
          .find((c) => !c.closest('#portal-overlay') && c.querySelector('small')) ?? null;
      } catch { return null; }
    }, null);

    if (!src) return;

    // 子要素をコピーして配置（script は除外）
    mount.replaceChildren();
    for (const child of src.children) {
      if (child.tagName !== 'SCRIPT') mount.appendChild(child.cloneNode(true));
    }

    // 制作クレジットを追加
    const creditEl  = document.createElement('small');
    creditEl.className = 'p-footer-credit';
    creditEl.appendChild(document.createTextNode('Redesigned by '));
    const creditLink = document.createElement('a');
    creditLink.href    = 'https://x.com/nnnnnnn0090';
    creditLink.target  = '_blank';
    creditLink.rel     = 'noopener noreferrer';
    creditLink.textContent = 'nnnnnnn0090';
    creditEl.appendChild(creditLink);

    const copyrightSm = mount.querySelector('small');
    if (copyrightSm) copyrightSm.after(creditEl);
    else mount.appendChild(creditEl);

    // ページトップへのリンクは自前ボタンで代替するため除去
    mount.querySelectorAll('.pageTop, a[href="#top"], a[href="#Top"]').forEach((el) => el.remove());
  }, []);

  function scrollTop() {
    overlayRoot.scrollTo({ top: 0, behavior: 'smooth' });
  }

  return (
    <>
      <footer className="p-site-footer" id="p-site-footer" aria-label="フッター">
        <div className="container" ref={mountRef} />
      </footer>

      {/* カレンダー tooltip（委譲イベントで操作） */}
      <div
        ref={hoverPopRef}
        id="p-cal-hover-pop"
        className="p-cal-hover-pop"
        hidden
        role="tooltip"
      />

      <div
        ref={ctxMenuRef}
        id="p-cal-ctx-menu"
        className="p-cal-ctx-menu"
        hidden
        role="menu"
        aria-label="講義リンク先"
      >
        <button
          type="button"
          ref={btnSylRef}
          id="p-cal-ctx-syllabus"
          className="p-cal-ctx-item"
          role="menuitem"
        >
          シラバスを開く
        </button>
        <button
          type="button"
          ref={btnKingRef}
          id="p-cal-ctx-kinglms"
          className="p-cal-ctx-item"
          role="menuitem"
        >
          King LMS を開く
        </button>
      </div>

      {/* FAB ボタン群 */}
      <div className="p-fab-cluster" role="group" aria-label="ページ末尾の操作">
        <button
          type="button"
          className="p-share-ext-btn"
          id="p-share-extension"
          aria-label="拡張機能の紹介ページのURLをコピー"
          title={`拡張機能の紹介ページ (${EXTENSION_PROMO_PAGE_URL}) の URL をコピー`}
          onClick={onShareClick}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71"/>
            <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71"/>
          </svg>
          <span>拡張機能を紹介</span>
        </button>
        <button
          type="button"
          className="p-scroll-top-btn"
          aria-label="ページ先頭へ"
          title="ページ先頭へ"
          onClick={scrollTop}
        >
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor"
               strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M18 15l-6-6-6 6"/>
          </svg>
        </button>
      </div>
    </>
  );
}
