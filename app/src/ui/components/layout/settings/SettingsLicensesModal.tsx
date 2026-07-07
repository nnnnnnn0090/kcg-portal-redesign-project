/**
 * 設定パネルから開くサードパーティライセンス一覧モーダル。
 */

import { createPortal } from 'react-dom';
import type { RefObject } from 'react';
import { useI18n } from '../../../../i18n';

interface ThirdPartyLicense {
  name: string;
  license: string;
  copyright: string;
  url: string;
}

const THIRD_PARTY_LICENSES: ThirdPartyLicense[] = [
  {
    name: 'KCG Portal Redesign Project',
    license: 'MIT',
    copyright: 'Copyright (c) 2026 nnnnnnn0090',
    url: 'https://github.com/nnnnnnn0090/kcg-portal-redesign-project/blob/main/LICENSE',
  },
  {
    name: 'DOMPurify',
    license: 'MPL-2.0 OR Apache-2.0',
    copyright: 'Copyright 2015 Mario Heiderich',
    url: 'https://github.com/cure53/DOMPurify/blob/3.4.11/LICENSE',
  },
  {
    name: 'marked',
    license: 'MIT',
    copyright: 'Copyright (c) 2018+, MarkedJS; Copyright (c) 2011-2018, Christopher Jeffrey',
    url: 'https://github.com/markedjs/marked/blob/v18.0.5/LICENSE.md',
  },
  {
    name: 'React',
    license: 'MIT',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
    url: 'https://github.com/facebook/react/blob/v19.2.5/LICENSE',
  },
  {
    name: 'React DOM',
    license: 'MIT',
    copyright: 'Copyright (c) Meta Platforms, Inc. and affiliates.',
    url: 'https://github.com/facebook/react/blob/v19.2.5/LICENSE',
  },
];

export interface SettingsLicensesModalProps {
  overlayEl:      HTMLElement | null;
  mounted:        boolean;
  closing:        boolean;
  modalRootRef:   RefObject<HTMLDivElement | null>;
  closeButtonRef: RefObject<HTMLButtonElement | null>;
  onRequestClose: () => void;
}

export function SettingsLicensesModal({
  overlayEl,
  mounted,
  closing,
  modalRootRef,
  closeButtonRef,
  onRequestClose,
}: SettingsLicensesModalProps) {
  const { t } = useI18n();
  if (!mounted || !overlayEl) return null;
  return createPortal(
    <div
      ref={modalRootRef}
      id="p-licenses-modal-root"
      className={`p-changelog-modal-root${closing ? ' is-closing' : ''}`}
      role="presentation"
    >
      <button
        type="button"
        className="p-changelog-modal-backdrop"
        aria-label={t.common.close}
        onClick={onRequestClose}
      />
      <div
        className="p-changelog-modal-panel"
        role="dialog"
        aria-modal="true"
        aria-labelledby="p-licenses-modal-title"
      >
        <div className="p-changelog-modal-head">
          <h2 id="p-licenses-modal-title">{t.settings.licensesTitle}</h2>
          <button
            ref={closeButtonRef}
            type="button"
            className="p-changelog-modal-close"
            aria-label={t.common.close}
            onClick={onRequestClose}
          >
            ×
          </button>
        </div>
        <div className="p-changelog-modal-body">
          <p className="p-licenses-intro">{t.settings.licensesIntro}</p>
          <div className="p-licenses-list">
            {THIRD_PARTY_LICENSES.map((item) => (
              <article className="p-license-item" key={item.name}>
                <h3 className="p-license-name">
                  <a href={item.url} target="_blank" rel="noopener noreferrer">
                    {item.name}
                  </a>
                </h3>
                <dl className="p-license-meta">
                  <div>
                    <dt>{t.settings.licenseType}</dt>
                    <dd>{item.license}</dd>
                  </div>
                  <div>
                    <dt>{t.settings.licenseCopyright}</dt>
                    <dd>{item.copyright}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        </div>
      </div>
    </div>,
    overlayEl,
  );
}
