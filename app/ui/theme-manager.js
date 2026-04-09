/**
 * ui/theme-manager.js — テーマ管理
 *
 * ロード順: document_idle（ui/context-menu.js の後）。
 *
 * テーマの適用（CSS 変数の書き込み）と現在テーマ名の管理を行う。
 * テーマ定義は early/theme.js の P.THEMES を使う。
 *
 * 公開: P.createThemeManager(themeStyleEl) → { apply, getCurrent }
 */
(function (G) {
  'use strict';

  const P = (G.P = G.P || {});

  /**
   * テーマ管理オブジェクトを作成する。
   *
   * @param {HTMLStyleElement} themeStyleEl - テーマ CSS を書き込む <style> 要素
   * @returns {{ apply: (name: string) => void, getCurrent: () => string }}
   */
  function createThemeManager(themeStyleEl) {
    let current = 'dark';

    /**
     * 指定のテーマを適用する。
     * 未知のテーマ名は 'dark' にフォールバックする。
     *
     * @param {string} name - テーマ名（P.THEMES のキー）
     */
    function apply(name) {
      const resolved = P.THEMES[name] ? name : 'dark';
      const theme    = P.THEMES[resolved];
      current = resolved;
      themeStyleEl.textContent = P.getThemeCss(theme);
    }

    /** @returns {string} 現在適用中のテーマ名 */
    function getCurrent() {
      return current;
    }

    return { apply, getCurrent };
  }

  // ────────────────────────────────────────────
  // グローバルに公開
  // ────────────────────────────────────────────

  P.createThemeManager = createThemeManager;

})(typeof globalThis !== 'undefined' ? globalThis : window);
