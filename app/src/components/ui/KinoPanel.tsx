/**
 * キノメッセージ（ポータルお知らせ）パネルです。
 * 公式ポータルホームの該当パネルと同様の情報構造で表示します。
 */

import { formatMessageBody } from '../../lib/dom';
import { useI18n } from '../../i18n';

interface KinoPanelProps {
  data:         { title?: string; message?: string } | null;
  forceVisible: boolean;
}

export function KinoPanel({ data, forceVisible }: KinoPanelProps) {
  const { t } = useI18n();
  const title   = data ? String(data.title ?? '').trim() : '';
  const message = data ? String(data.message ?? '').trim() : '';
  const hasContent = !!(title && message);
  const hidden = !hasContent && !forceVisible;

  return (
    <section className="p-panel p-panel-kino" id="p-kino-panel" hidden={hidden}>
      <span className="p-panel-head" id="p-kino-title">
        {hidden ? '' : hasContent ? title : t.kino.defaultTitle}
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
            {!hidden ? <p className="p-empty">{t.kino.empty}</p> : null}
          </div>
        )}
      </div>
    </section>
  );
}
