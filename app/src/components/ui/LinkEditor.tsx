/**
 * ホームページのショートカットリンクの表示・編集コンポーネント。
 * ドラッグ＆ドロップによる並べ替え、非表示設定、カスタムリンクの追加に対応する。
 */

import { useState, useRef, useEffect, useCallback } from 'react';
import { SK, HOME_SHORTCUT_EXTRAS } from '../../shared/constants';
import type { LinkConfig } from '../../shared/types';
import storage from '../../lib/storage';

export type { LinkConfig, CustomLink } from '../../shared/types';

interface ApiLink {
  midashi: string;
  url:     string;
  biko?:   string;
}

interface Row {
  key:       string;
  midashi:   string;
  url:       string;
  biko:      string;
  isCustom:  boolean;
  customId?: string;
}

// ─── ヘルパー ─────────────────────────────────────────────────────────────

/** URL の末尾スラッシュを除いたものをキーとして使う */
function linkKey(url: string): string { return String(url ?? '').replace(/\/+$/, ''); }

/** API リンク・固定リンク・カスタムリンクを統合して重複除去・順序適用する */
function buildRows(items: ApiLink[], extras: ApiLink[], config: LinkConfig): Row[] {
  const extraUrls = new Set(extras.filter((i) => i.midashi && i.url).map((i) => linkKey(i.url)));
  const fromApi   = items.filter((i) => i.midashi && i.url && !extraUrls.has(linkKey(i.url)));
  const customRows = (config.custom ?? []).filter((c) => c.midashi && c.url);

  const allRaw: Row[] = [
    ...extras.filter((i) => i.midashi && i.url).map((r) => ({ key: linkKey(r.url), midashi: r.midashi, url: r.url, biko: r.biko ?? '', isCustom: false })),
    ...fromApi.map((r) => ({ key: linkKey(r.url), midashi: r.midashi, url: r.url, biko: r.biko ?? '', isCustom: false })),
    ...customRows.map((r) => ({ key: linkKey(r.url), midashi: r.midashi, url: r.url, biko: '', isCustom: true, customId: r.id })),
  ];

  // 重複除去
  const seen = new Set<string>();
  const deduped = allRaw.filter((r) => { if (seen.has(r.key)) return false; seen.add(r.key); return true; });

  // 保存済み順序を適用
  const orderMap = new Map<string, number>();
  (config.order ?? []).forEach((k, i) => orderMap.set(k, i));
  return deduped.sort((a, b) => (orderMap.get(a.key) ?? 99999) - (orderMap.get(b.key) ?? 99999));
}

// ─── コンポーネント ────────────────────────────────────────────────────────

interface LinkEditorProps {
  items:          ApiLink[];
  config:         LinkConfig;
  onConfigChange: (cfg: LinkConfig) => void;
  editing:        boolean;
}

export function LinkEditor({ items, config, onConfigChange, editing }: LinkEditorProps) {
  const extras: ApiLink[] = HOME_SHORTCUT_EXTRAS.map((e) => ({ midashi: e.midashi, url: e.url }));
  const [localCfg, setLocalCfg] = useState<LinkConfig>(config);
  const [addName,  setAddName]  = useState('');
  const [addUrl,   setAddUrl]   = useState('');
  const [rows,     setRows]     = useState<Row[]>(() => buildRows(items, extras, config));
  /** ドラッグ中の見た目（CSS .is-dragging / .is-drag-over） */
  const [dragUi, setDragUi]     = useState<{ from: number; over: number | null } | null>(null);
  const dragSrcIdx    = useRef(-1);
  const wasEditingRef = useRef(false);

  const save = useCallback((newRows: Row[], newCfg: LinkConfig): void => {
    const merged = { ...newCfg, order: newRows.map((r) => r.key) };
    setLocalCfg(merged);
    onConfigChange(merged);
    void storage.set({ [SK.shortcutConfig]: merged });
  }, [onConfigChange]);

  // 編集モードが終了したとき保存する
  useEffect(() => {
    if (wasEditingRef.current && !editing) save(rows, localCfg);
    wasEditingRef.current = editing;
  }, [editing, rows, localCfg, save]);

  // config が外部から変わった場合は同期する（編集中は無視）
  useEffect(() => { if (!editing) setLocalCfg(config); }, [config, editing]);

  // items または localCfg が変わったら行を再構築する（extras はモジュール定数）
  useEffect(() => { setRows(buildRows(items, extras, localCfg)); }, [items, localCfg, extras]);

  function toggleHidden(key: string): void {
    const hidden = localCfg.hidden.includes(key)
      ? localCfg.hidden.filter((k) => k !== key)
      : [...localCfg.hidden, key];
    save(rows, { ...localCfg, hidden });
  }

  function deleteCustom(customId: string): void {
    const newRows = rows.filter((r) => !(r.isCustom && r.customId === customId));
    save(newRows, { ...localCfg, custom: localCfg.custom.filter((c) => c.id !== customId) });
    setRows(newRows);
  }

  function addCustomLink(): void {
    const name = addName.trim();
    const url  = addUrl.trim();
    if (!name || !url) return;
    try { new URL(url); } catch { return; } // URL 形式バリデーション
    const id      = `custom-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const newRows = [...rows, { key: linkKey(url), midashi: name, url, biko: '', isCustom: true, customId: id }];
    save(newRows, { ...localCfg, custom: [...(localCfg.custom ?? []), { id, midashi: name, url }] });
    setRows(newRows);
    setAddName('');
    setAddUrl('');
  }

  function onDragStart(e: React.DragEvent, idx: number): void {
    dragSrcIdx.current = idx;
    setDragUi({ from: idx, over: null });
    e.dataTransfer.effectAllowed = 'move';
    e.dataTransfer.setData('text/plain', String(idx));
  }

  function onDragOver(e: React.DragEvent, idx: number): void {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    const src = dragSrcIdx.current;
    if (src < 0) return;
    setDragUi((d) => {
      if (!d) return { from: src, over: idx === src ? null : idx };
      return { ...d, over: idx === src ? null : idx };
    });
  }

  function onDragEnd(): void {
    dragSrcIdx.current = -1;
    setDragUi(null);
  }

  function onDrop(e: React.DragEvent, toIdx: number): void {
    e.preventDefault();
    const srcIdx = dragSrcIdx.current;
    if (srcIdx < 0 || srcIdx === toIdx) return;
    const newRows = [...rows];
    const [moved] = newRows.splice(srcIdx, 1);
    newRows.splice(toIdx, 0, moved);
    dragSrcIdx.current = -1;
    setDragUi(null);
    setRows(newRows);
    save(newRows, localCfg);
  }

  const isHidden = (key: string) => localCfg.hidden.includes(key);
  const visible  = rows.filter((r) => !isHidden(r.key));

  // ── 表示モード ──────────────────────────────────────────────────────────
  if (!editing) {
    return visible.length === 0
      ? <p className="p-empty">ショートカットがありません</p>
      : (
        <div className="p-link-list">
          {visible.map((r) => (
            <a
              key={r.key}
              className="p-link"
              href={r.url}
              target="_blank"
              rel="noopener noreferrer"
              id={r.midashi === '学生出欠登録' ? 'p-shortcut-attendance' : undefined}
            >
              <span className="p-link-title">{r.midashi}</span>
              {r.biko && <span className="p-link-meta">{r.biko}</span>}
            </a>
          ))}
        </div>
      );
  }

  // ── 編集モード ──────────────────────────────────────────────────────────
  return (
    <>
      <div className="p-link-edit-list">
        {rows.map((r, i) => (
          <div
            key={r.key}
            className={`p-link-edit-item${isHidden(r.key) ? ' is-hidden' : ''}${
              dragUi?.from === i ? ' is-dragging' : ''
            }${dragUi?.over === i ? ' is-drag-over' : ''}`}
            draggable
            onDragStart={(e) => onDragStart(e, i)}
            onDragOver={(e) => onDragOver(e, i)}
            onDragEnd={onDragEnd}
            onDrop={(e) => onDrop(e, i)}
          >
            <span className="p-link-edit-grip" aria-hidden="true" title="ドラッグで並べ替え">⋮⋮</span>
            <span className="p-link-edit-name">{r.midashi}</span>
            <button
              type="button"
              className="p-link-edit-vis"
              title={isHidden(r.key) ? 'ホームに表示する' : 'ホームで非表示にする'}
              onClick={() => toggleHidden(r.key)}
            >
              {isHidden(r.key) ? '表示' : '隠す'}
            </button>
            {r.isCustom && (
              <button
                type="button"
                className="p-link-edit-del"
                title="削除"
                onClick={() => deleteCustom(r.customId!)}
              >
                ×
              </button>
            )}
          </div>
        ))}
      </div>
      <div className="p-link-add-form">
        <input type="text"  className="p-link-add-input" placeholder="リンク名"        autoComplete="off" value={addName} onChange={(e) => setAddName(e.target.value)} />
        <input type="url"   className="p-link-add-input" placeholder="URL (https://…)" autoComplete="off" value={addUrl}  onChange={(e) => setAddUrl(e.target.value)} />
        <button type="button" className="p-link-add-btn" onClick={addCustomLink}>追加</button>
      </div>
    </>
  );
}
