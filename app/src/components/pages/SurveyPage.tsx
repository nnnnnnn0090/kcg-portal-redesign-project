/**
 * 授業評価アンケート回答ページ。
 * 未回答絞り込み・講義名/担当教員キーワード絞り込みに対応する。
 */

import { useState, useCallback, useEffect } from 'react';
import { urls, pageFetch } from '../../lib/api';
import { currentNendo } from '../../lib/date';
import { usePortalMessage, type PortalCapturedMessage } from '../../hooks/usePortalMessage';
import {
  type SurveyPortalState,
  reduceSurveyPortalMessage,
  pick,
} from '../../lib/portal-messages-pages';
import { PageShell } from '../layout/PageShell';
import { KinoPanel } from '../ui/KinoPanel';

// ─── 型 ───────────────────────────────────────────────────────────────────

type Row = Record<string, unknown>;

interface SurveyPageProps {
  kinoForce: boolean;
}

// ─── ヘルパー ─────────────────────────────────────────────────────────────

/** null も含めて最初に存在するフィールドを文字列で返す（回答状態フラグ用） */
function pickRaw(obj: Row | null, keys: string[]): string {
  if (!obj) return '';
  for (const k of keys) {
    if (obj[k] != null) return String(obj[k]);
  }
  return '';
}

function formatDeadline(raw: string): string {
  const s = String(raw).trim();
  const m = s.match(/^(\d{4})-(\d{2})-(\d{2})[ T](\d{2}):(\d{2})(?::\d{2})?/);
  return m ? `${m[1]}年${m[2]}月${m[3]}日 ${m[4]}:${m[5]}` : s;
}

/** アンケート一覧行を一度だけ pick して束ねる（API 確定キー） */
function parseSurveyRow(row: Row) {
  return {
    nendo:           pick(row, ['nendo']),
    questionnaireCd: pick(row, ['questionnaireCd']),
    kogiCd:          pick(row, ['kogiCd']),
    periodCd:        pick(row, ['periodCd']),
    periodNo:        pick(row, ['periodNo']),
    kogi:            pick(row, ['kogi']),
    yobiRNm:         pick(row, ['yobiRNm']),
    jigenRNm:        pick(row, ['jigenRNm']),
    kyoinFullNm:     pick(row, ['kyoinFullNm']),
    dispEndDateTime: pick(row, ['dispEndDateTime']),
  };
}

/** 現行ポータル: /Questionnaire/Detail/{nendo}/{questionnaireCd}/{kogiCd}/{periodCd}/{periodNo} */
function buildDetailHrefParsed(s: ReturnType<typeof parseSurveyRow>): string {
  const { nendo, questionnaireCd, kogiCd, periodCd, periodNo } = s;
  if (nendo && questionnaireCd && kogiCd && periodCd && periodNo) {
    try {
      return new URL(
        `/portal/Questionnaire/Detail/${encodeURIComponent(nendo)}/${encodeURIComponent(questionnaireCd)}/${encodeURIComponent(kogiCd)}/${encodeURIComponent(periodCd)}/${encodeURIComponent(periodNo)}`,
        location.origin,
      ).href;
    } catch { /* skip */ }
  }
  return '';
}

/** 一覧行の安定キー（フィルタ変更時の不要な再マウントを減らす） */
function surveyRowKey(row: Row): string {
  const s = parseSurveyRow(row);
  const href = buildDetailHrefParsed(s);
  if (href) return href;
  const composite = [
    s.nendo,
    s.questionnaireCd,
    s.kogiCd,
    s.periodCd,
    s.periodNo,
    s.kogi,
    s.dispEndDateTime,
    s.kyoinFullNm,
  ].join('|');
  if (composite.replace(/\|/g, '').length > 0) return composite;
  return JSON.stringify(row);
}

function applyFilters(raw: Row[], onlyUnanswered: boolean, kogiKw: string, kyoinKw: string): Row[] {
  let list = raw.slice();
  if (onlyUnanswered) {
    list = list.filter((row) => {
      const ex = pickRaw(row, ['existsAnswer']);
      return ex.length > 0 && ex.includes('未回答');
    });
  }
  const fk = kogiKw.trim();
  if (fk) {
    list = list.filter((row) =>
      pick(row, ['kogi']).includes(fk),
    );
  }
  const fe = kyoinKw.trim();
  if (fe) {
    list = list.filter((row) =>
      pick(row, ['kyoinFullNm']).includes(fe),
    );
  }
  return list;
}

// ─── 行コンポーネント ─────────────────────────────────────────────────────

function SurveyRow({ row }: { row: Row }) {
  const s        = parseSurveyRow(row);
  const href     = buildDetailHrefParsed(s);
  const deadline = formatDeadline(s.dispEndDateTime);
  const { kogi, yobiRNm: yobi, jigenRNm: jigen, kyoinFullNm: kyoin } = s;
  return (
    <tr>
      <td>{href ? <a href={href}>{kogi}</a> : kogi}</td>
      <td>{yobi}</td>
      <td>{jigen}</td>
      <td>{kyoin}</td>
      <td>{deadline}</td>
    </tr>
  );
}

// ─── コンポーネント ────────────────────────────────────────────────────────

export function SurveyPage({ kinoForce }: SurveyPageProps) {
  const nendo = String(currentNendo());

  const [portal, setPortal] = useState<SurveyPortalState>({ kinoData: null, raw: null });
  const { kinoData, raw } = portal;
  const [onlyUnanswered, setOnlyUnanswered] = useState(true);
  const [kogiKw,         setKogiKw]         = useState('');
  const [kyoinKw,        setKyoinKw]        = useState('');

  useEffect(() => { pageFetch(urls.questionnaireInfo()); }, []);

  const handleMessage = useCallback((msg: PortalCapturedMessage) => {
    setPortal((prev) => reduceSurveyPortalMessage(prev, msg));
  }, []);

  usePortalMessage(handleMessage);

  const filtered = raw !== null ? applyFilters(raw, onlyUnanswered, kogiKw, kyoinKw) : [];
  const noData   = raw !== null && raw.length === 0;

  const listTitle = raw === null || filtered.length > 0
    ? `${nendo}年度の回答期間中の授業評価アンケート一覧を表示しています。`
    : `${nendo}年度の条件に一致する回答期間中の授業評価アンケートはありません。`;

  let tableBody: React.ReactNode;
  if (raw === null) {
    tableBody = <tr><td colSpan={5}><p className="p-news-empty">読み込み中…</p></td></tr>;
  } else if (filtered.length === 0) {
    tableBody = <tr><td colSpan={5}><p className="p-news-empty">条件に一致するアンケートはありません。</p></td></tr>;
  } else {
    tableBody = filtered.map((row) => <SurveyRow key={surveyRowKey(row)} row={row} />);
  }

  return (
    <PageShell variant="news" title="授業評価アンケート回答">
      <KinoPanel data={kinoData} forceVisible={kinoForce} />

      <div className="p-news-page p-questionnaire-layout">
        <div className="p-news-primary">
          <section className="p-panel p-news-table-wrap" id="p-questionnaire-section">
            <span className="p-panel-head">アンケート一覧</span>
            <div className="p-questionnaire-subbar">
              <p className="p-questionnaire-list-title">{raw !== null ? listTitle : ''}</p>
            </div>
            {!noData && (
              <div className="p-news-table-scroll">
                <table className="p-news-table" aria-label="授業評価アンケート一覧">
                  <thead>
                    <tr>
                      <th scope="col">講義</th>
                      <th scope="col">曜日</th>
                      <th scope="col">時限</th>
                      <th scope="col">担当教員</th>
                      <th scope="col">締切</th>
                    </tr>
                  </thead>
                  <tbody>{tableBody}</tbody>
                </table>
              </div>
            )}
          </section>
        </div>

        {/* 絞り込みサイドバー */}
        <aside className="p-news-aside" aria-label="絞り込み">
          <h2 className="p-news-filter-page-title">絞り込み条件</h2>

          <div className="p-news-mat">
            <h3>表示</h3>
            <ul className="p-news-checklist">
              <li>
                <input
                  type="checkbox"
                  id="p-questionnaire-only-unanswer"
                  checked={onlyUnanswered}
                  onChange={(e) => setOnlyUnanswered(e.target.checked)}
                />
                <label htmlFor="p-questionnaire-only-unanswer">未回答のみ</label>
              </li>
            </ul>
          </div>

          <div className="p-news-mat">
            <h3>講義名</h3>
            <input
              type="search"
              className="p-news-kw"
              placeholder="キーワード"
              maxLength={40}
              autoComplete="off"
              value={kogiKw}
              onChange={(e) => setKogiKw(e.target.value)}
            />
          </div>

          <div className="p-news-mat">
            <h3>担当教員</h3>
            <input
              type="search"
              className="p-news-kw"
              placeholder="キーワード"
              maxLength={40}
              autoComplete="off"
              value={kyoinKw}
              onChange={(e) => setKyoinKw(e.target.value)}
            />
          </div>

          <div className="p-news-clear">
            <button
              type="button"
              className="p-news-clear-btn"
              onClick={() => { setOnlyUnanswered(true); setKogiKw(''); setKyoinKw(''); }}
            >
              条件クリア
            </button>
          </div>
        </aside>
      </div>
    </PageShell>
  );
}
