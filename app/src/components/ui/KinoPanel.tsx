/**
 * キノメッセージ（ポータルお知らせ）パネル。
 * 旧 app/pages/home.js の #p-kino-panel 構造と renderers/kino.js の表示ロジックに合わせる。
 */

import { formatMessageBody } from '../../lib/dom';

interface KinoPanelProps {
  data:         { title?: string; message?: string } | null;
  forceVisible: boolean;
}

export function KinoPanel({ data, forceVisible }: KinoPanelProps) {
  const title   = data ? String(data.title ?? '').trim() : '';
  const message = data ? String(data.message ?? '').trim() : '';
  const hasContent = !!(title && message);
  const hidden = !hasContent && !forceVisible;

  return (
    <section className="p-panel p-panel-kino" id="p-kino-panel" hidden={hidden}>
      <span className="p-panel-head" id="p-kino-title">
        {hidden ? '' : hasContent ? title : 'お知らせ'}
      </span>
      <div className="p-panel-body">
        {hasContent ? (
          <div
            className="p-kino-message"
            id="p-kino-body"
            dangerouslySetInnerHTML={{ __html: formatMessageBody(message) }}
          />
        ) : (
          <div className="p-kino-message" id="p-kino-body">
            {!hidden ? <p className="p-empty">お知らせはありません</p> : null}
          </div>
        )}
      </div>
    </section>
  );
}
