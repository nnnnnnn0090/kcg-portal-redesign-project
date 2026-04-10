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

function buildDetailHref(row: Row): string {
  // 直接 URL が指定されていればそちらを優先
  const direct = pick(row, ['detailUrl','DetailUrl','url','Url','href','Href','link','Link']);
  if (direct) {
    try {
      return /^https?:\/\//i.test(direct) ? direct : new URL(direct, location.origin).href;
    } catch { /* skip */ }
  }

  // 単一 ID 形式
  const singleId = pick(row, ['detailId','DetailId','questionnaireId','QuestionnaireId','id','Id']);
  if (singleId && /^[0-9A-Za-z-]+$/.test(singleId)) {
    try {
      return new URL(`/portal/Questionnaire/Detail/${encodeURIComponent(singleId)}`, location.origin).href;
    } catch { /* skip */ }
  }

  // 複合キー形式
  const nendo  = pick(row, ['nendo','Nendo']);
  const jisshi = pick(row, ['jisshiKikanCd','JisshiKikanCd','jisshiKikanCD','JissiKikanCd','jissiKikanCd']);
  const renban = pick(row, ['renban','Renban','seq','Seq','renBan']);
  const cd     = pick(row, ['questionnaireCd','QuestionnaireCd','anketoCd','AnketoCd','anketoCD']);
  if (nendo && jisshi && renban && cd) {
    try {
      return new URL(
        `/portal/Questionnaire/Detail/${encodeURIComponent(nendo)}/${encodeURIComponent(jisshi)}/${encodeURIComponent(renban)}/${encodeURIComponent(cd)}`,
        location.origin,
      ).href;
    } catch { /* skip */ }
  }

  return '';
}

/** 一覧行の安定キー（フィルタ変更時の不要な再マウントを減らす） */
function surveyRowKey(row: Row): string {
  const href = buildDetailHref(row);
  if (href) return href;
  const composite = [
    pick(row, ['nendo', 'Nendo']),
    pick(row, ['jisshiKikanCd', 'JisshiKikanCd', 'jisshiKikanCD', 'JissiKikanCd', 'jissiKikanCd']),
    pick(row, ['renban', 'Renban', 'seq', 'Seq', 'renBan']),
    pick(row, ['questionnaireCd', 'QuestionnaireCd', 'anketoCd', 'AnketoCd', 'anketoCD']),
    pick(row, ['detailId', 'DetailId', 'questionnaireId', 'QuestionnaireId', 'id', 'Id']),
    pick(row, ['kogi', 'Kogi', 'kogiNm', 'KogiNm', 'kogiName', 'KogiName']),
    pick(row, ['summaryDatetime', 'SummaryDatetime', 'shimekiri', 'Shimekiri']),
    pick(row, ['kyoinFullNm', 'KyoinFullNm', 'tantoKyoinNm', 'TantoKyoinNm']),
  ].join('|');
  if (composite.replace(/\|/g, '').length > 0) return composite;
  return JSON.stringify(row);
}

function applyFilters(raw: Row[], onlyUnanswered: boolean, kogiKw: string, kyoinKw: string): Row[] {
  let list = raw.slice();
  if (onlyUnanswered) {
    list = list.filter((row) => {
      const ex = pickRaw(row, ['existsAnswer','ExistsAnswer']);
      return ex.length > 0 && ex.includes('未回答');
    });
  }
  const fk = kogiKw.trim();
  if (fk) {
    list = list.filter((row) =>
      pick(row, ['kogi','Kogi','kogiNm','KogiNm','kogiName','KogiName']).includes(fk),
    );
  }
  const fe = kyoinKw.trim();
  if (fe) {
    list = list.filter((row) =>
      pick(row, ['kyoinFullNm','KyoinFullNm','tantoKyoinNm','TantoKyoinNm','kyoinNm','KyoinNm','kyoinNms','KyoinNms']).includes(fe),
    );
  }
  return list;
}

// ─── 行コンポーネント ─────────────────────────────────────────────────────

function SurveyRow({ row }: { row: Row }) {
  const kogi     = pick(row, ['kogi','Kogi','kogiNm','KogiNm','kogiName','KogiName']);
  const yobi     = pick(row, ['yobiNm','YobiNm','yobi','Yobi']);
  const jigen    = pick(row, ['jigenNm','JigenNm','jigen','Jigen']);
  const kyoin    = pick(row, ['kyoinFullNm','KyoinFullNm','tantoKyoinNm','TantoKyoinNm','kyoinNm','KyoinNm','kyoinNms','KyoinNms']);
  const deadline = formatDeadline(pick(row, ['summaryDatetime','SummaryDatetime','shimekiri','Shimekiri']));
  const href     = buildDetailHref(row);
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
