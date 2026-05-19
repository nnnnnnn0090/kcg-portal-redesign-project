/**
 * 設定パネル内のセクション単位 UI（テーマ・ポータル専用・Web メール・フィードバック等）。
 */

import { THEMES } from '../../../themes';
import type { Settings } from '../../../context/settings';
import { beginKingLmsCourseListSync } from '../../../lib/king-lms-course-sync';
import {
  EXTENSION_FEEDBACK_FORM_URL,
  PORTAL_COMMUNITY_DISCORD_INVITE_URL,
} from '../../../shared/constants';

interface SettingsThemeSectionProps {
  settings:      Settings;
  onThemeChange: (name: string) => void;
}

export function SettingsThemeSection({ settings, onThemeChange }: SettingsThemeSectionProps) {
  return (
    <div className="p-settings-section">
      <div className="p-settings-section-title">カラーテーマ</div>
      <div className="p-theme-picker" id="p-theme-picker">
        {Object.entries(THEMES).map(([key, meta]) => (
          <button
            key={key}
            type="button"
            className={`p-theme-btn${settings.theme === key ? ' is-active' : ''}`}
            data-theme={key}
            onClick={() => onThemeChange(key)}
          >
            <span className="p-theme-btn-swatches" aria-hidden>
              <span className="p-theme-btn-swatch" style={{ background: meta.bg }} />
              <span className="p-theme-btn-swatch" style={{ background: meta.accent }} />
            </span>
            <span className="p-theme-btn-label">{meta.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}

interface SettingsPortalOnlySectionsProps {
  settings:           Settings;
  onSettingChange:    <K extends keyof Settings>(key: K, value: Settings[K]) => void;
  onReplayGuidedTour: () => void;
  onOpenChangelog:    () => void;
}

export function SettingsPortalOnlySections({
  settings,
  onSettingChange,
  onReplayGuidedTour,
  onOpenChangelog,
}: SettingsPortalOnlySectionsProps) {
  return (
    <>
      <div className="p-settings-section">
        <div className="p-settings-section-title">ホームの装飾</div>
        <label className="p-settings-row">
          <input
            type="checkbox"
            checked={settings.showKogiCalMascot}
            onChange={(e) => onSettingChange('showKogiCalMascot', e.target.checked)}
          />
          <span>授業カレンダーにマスコットを表示する</span>
        </label>
      </div>

      <div className="p-settings-section">
        <div className="p-settings-section-title">表示設定</div>

        <label className="p-settings-row">
          <input
            type="checkbox"
            checked={settings.hideProfileName}
            onChange={(e) => onSettingChange('hideProfileName', e.target.checked)}
          />
          <span>ヘッダーに名前を表示しない</span>
        </label>

        <label className="p-settings-row">
          <input
            type="checkbox"
            checked={settings.kinoEmptyForce}
            onChange={(e) => onSettingChange('kinoEmptyForce', e.target.checked)}
          />
          <span>お知らせを、内容がなくても表示する</span>
        </label>

        <label className="p-settings-row">
          <input
            type="checkbox"
            checked={settings.hoshuCalForce}
            onChange={(e) => onSettingChange('hoshuCalForce', e.target.checked)}
          />
          <span>補修カレンダーを、予定がなくても表示する</span>
        </label>

        <label className="p-settings-row">
          <input
            type="checkbox"
            checked={settings.campusCalForce}
            onChange={(e) => onSettingChange('campusCalForce', e.target.checked)}
          />
          <span>キャンパスカレンダーを、予定がなくても表示する</span>
        </label>

        <label className="p-settings-row">
          <input
            type="checkbox"
            checked={settings.hideAssignmentCalendar}
            onChange={(e) => onSettingChange('hideAssignmentCalendar', e.target.checked)}
          />
          <span>課題カレンダーを表示しない</span>
        </label>

        <fieldset className="p-settings-fieldset">
          <legend className="p-settings-row-label">カレンダーの週の始まり</legend>
          <label className="p-settings-row">
            <input
              type="radio"
              name="portal-calendar-week-start"
              checked={settings.calendarWeekStart === 'monday'}
              onChange={() => onSettingChange('calendarWeekStart', 'monday')}
            />
            <span>月曜〜日曜</span>
          </label>
          <label className="p-settings-row">
            <input
              type="radio"
              name="portal-calendar-week-start"
              checked={settings.calendarWeekStart === 'sunday'}
              onChange={() => onSettingChange('calendarWeekStart', 'sunday')}
            />
            <span>日曜〜土曜</span>
          </label>
        </fieldset>

        <div className="p-settings-row p-settings-row-actions p-settings-tour-replay">
          <button type="button" className="p-settings-tour-replay-btn" onClick={onReplayGuidedTour}>
            はじめの案内をもう一度見る
          </button>
        </div>

        <div className="p-settings-row p-settings-row-actions p-settings-tour-replay p-settings-changelog-after-tour">
          <button type="button" className="p-settings-tour-replay-btn" onClick={onOpenChangelog}>
            チェンジログを確認
          </button>
        </div>

        <div className="p-settings-row p-settings-row-actions p-settings-king-lms-sync">
          <button
            type="button"
            className="p-settings-resync-btn"
            onClick={() => void beginKingLmsCourseListSync({ toastQuiet: true })}
          >
            コース一覧を再取得
          </button>
          <p className="p-settings-hint">
            講義のクリックで King LMS のコースへ移動するために使用します。一覧取得のため一度 King LMS へ移動します（終了後にポータルへ戻ります）。
          </p>
        </div>
      </div>
    </>
  );
}

interface SettingsWebMailSectionProps {
  settings:        Settings;
  variant:         'portal' | 'home2';
  onSettingChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export function SettingsWebMailSection({
  settings,
  variant,
  onSettingChange,
}: SettingsWebMailSectionProps) {
  return (
    <div className="p-settings-section">
      <div className="p-settings-section-title">Web メール</div>
      <label className="p-settings-row">
        <input
          type="checkbox"
          checked={settings.home2WebMailOverlay}
          onChange={(e) => {
            const next = e.target.checked;
            onSettingChange('home2WebMailOverlay', next);
            if (variant === 'home2' && !next) window.location.reload();
          }}
        />
        <span>拡張のオーバーレイを表示する</span>
      </label>
      <p className="p-settings-hint">オフにしたあと反映するにはページを再読み込みしてください。</p>
    </div>
  );
}

export function SettingsFeedbackSection() {
  const feedbackFormUrl = EXTENSION_FEEDBACK_FORM_URL;
  const discordInviteUrl = PORTAL_COMMUNITY_DISCORD_INVITE_URL;
  const hasFeedbackForm = feedbackFormUrl.length > 0;
  const hasDiscordCommunity = discordInviteUrl.length > 0;
  const showFeedbackSection = hasFeedbackForm || hasDiscordCommunity;
  const feedbackSectionTitle = hasFeedbackForm && hasDiscordCommunity
    ? 'フィードバック・コミュニティ'
    : hasFeedbackForm
      ? 'フィードバック'
      : 'コミュニティ';

  if (!showFeedbackSection) return null;

  return (
    <div className="p-settings-section">
      <div className="p-settings-section-title">{feedbackSectionTitle}</div>
      {hasFeedbackForm ? (
        <div className="p-settings-row p-settings-row-actions p-settings-tour-replay">
          <a
            className="p-settings-tour-replay-btn"
            href={feedbackFormUrl}
            target="_blank"
            rel="noopener noreferrer"
          >
            {hasDiscordCommunity ? 'バグ報告 / 機能リクエスト（フォーム）' : 'バグ報告 / 機能リクエスト'}
          </a>
        </div>
      ) : null}
      {hasDiscordCommunity ? (
        <>
          {hasFeedbackForm ? (
            <p className="p-settings-hint p-settings-hint--tight">
              Discord からもバグ報告・機能リクエストを受け付けています。
            </p>
          ) : null}
          <div className="p-settings-row p-settings-row-actions p-settings-tour-replay">
            <a
              className="p-settings-tour-replay-btn p-settings-discord-btn"
              href={discordInviteUrl}
              target="_blank"
              rel="noopener noreferrer"
            >
              <svg
                className="p-settings-discord-icon"
                width={20}
                height={20}
                viewBox="0 0 24 24"
                aria-hidden={true}
                focusable="false"
              >
                <path
                  fill="currentColor"
                  d="M20.317 4.37a19.791 19.791 0 0 0-4.885-1.515.074.074 0 0 0-.079.037c-.21.375-.444.864-.608 1.25a18.27 18.27 0 0 0-5.487 0 12.64 12.64 0 0 0-.617-1.25.077.077 0 0 0-.079-.037A19.736 19.736 0 0 0 3.677 4.37a.07.07 0 0 0-.032.027C.533 9.046-.32 13.58.099 18.057a.082.082 0 0 0 .031.057 19.9 19.9 0 0 0 5.993 3.03.078.078 0 0 0 .084-.028 14.09 14.09 0 0 0 1.226-1.994.076.076 0 0 0-.041-.106 13.107 13.107 0 0 1-1.872-.892.077.077 0 0 1-.008-.128 10.2 10.2 0 0 0 .372-.292.074.074 0 0 1 .077-.01c3.928 1.793 8.18 1.793 12.062 0a.074.074 0 0 1 .078.01c.12.098.246.198.373.292a.077.077 0 0 1-.006.127 12.299 12.299 0 0 1-1.873.892.077.077 0 0 0-.041.107c.36.698.772 1.362 1.225 1.993a.076.076 0 0 0 .084.028 19.839 19.839 0 0 0 6.002-3.03.077.077 0 0 0 .032-.054c.5-5.177-.838-9.674-3.549-13.66a.061.061 0 0 0-.031-.03zM8.02 15.33c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.956-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.956 2.418-2.157 2.418zm7.975 0c-1.183 0-2.157-1.085-2.157-2.419 0-1.333.955-2.419 2.157-2.419 1.21 0 2.176 1.096 2.157 2.42 0 1.333-.946 2.418-2.157 2.418z"
                />
              </svg>
              <span>Discord サーバーへ</span>
            </a>
          </div>
        </>
      ) : null}
    </div>
  );
}

interface SettingsHome2ChangelogSectionProps {
  onOpenChangelog: () => void;
}

export function SettingsHome2ChangelogSection({ onOpenChangelog }: SettingsHome2ChangelogSectionProps) {
  return (
    <div className="p-settings-section p-settings-section-changelog-only">
      <div className="p-settings-row p-settings-row-actions p-settings-tour-replay">
        <button type="button" className="p-settings-tour-replay-btn" onClick={onOpenChangelog}>
          チェンジログを確認
        </button>
      </div>
    </div>
  );
}
