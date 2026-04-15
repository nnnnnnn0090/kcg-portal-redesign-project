/**
 * 教室変更 API（KyoshitsuChangeInfo）と一覧 UI のスキーマ。
 *
 * 行オブジェクトの確定キー（例）: `kcDate`, `kcYobi`, `kcJigen`, `kcKogiNm`,
 * `kcKyoinNms`, `_kcKyoinNms`, `kyoshitsuNmsOld`, `kyoshitsuNmsNew`, `kcBiko`,
 * `kcKyoinCds`, `_kcKyoinCds`, `gakuseiRishuFlgKc`, `_gakuseiRishuFlgKc`
 *
 * 履修絞り込みは `arrayFilter(kcListData, …)` と同じく `gakuseiRishuFlgKc` / `_gakuseiRishuFlgKc`
 * と `kcKyoinCds` / `_kcKyoinCds` を参照する。
 */

/** ポータル「自分の履修講義のみ」と同じ条件に使うキー（`arrayFilter(kcListData, …)` と一致） */
export const PORTAL_KYOSHITSU_CHANGE_RISHU_KEYS = {
  rishu: ['gakuseiRishuFlgKc', '_gakuseiRishuFlgKc'],
  kyoin: ['kcKyoinCds', '_kcKyoinCds'],
} as const;

/** 休講一覧: `arrayFilter(kkListData, …)` と一致 */
export const PORTAL_KYUKO_RISHU_KEYS = {
  rishu: ['gakuseiRishuFlgKyuko', '_gakuseiRishuFlgKyuko'],
  kyoin: ['kyoinCds', '_kyoinCds'],
} as const;

/** 補講一覧: `arrayFilter(hkListData, …)` と一致 */
export const PORTAL_HOKO_RISHU_KEYS = {
  rishu: ['gakuseiRishuFlgHoko', '_gakuseiRishuFlgHoko'],
  kyoin: ['hokoKyoinCds', '_hokoKyoinCds'],
} as const;
