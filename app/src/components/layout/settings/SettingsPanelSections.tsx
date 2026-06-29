/**
 * 設定パネル内のセクション単位 UI（テーマ・ポータル専用・Web メール・フィードバック等）。
 */

import { THEMES } from '../../../themes';
import type { Settings } from '../../../context/settings';
import { beginKingLmsCourseListSync } from '../../../lib/king-lms-course-sync';
import {
  APP_LANGUAGES,
  APP_LANGUAGE_LABELS,
  themeDisplayName,
  useI18n,
} from '../../../i18n';
import {
  EXTENSION_FEEDBACK_FORM_URL,
  PORTAL_COMMUNITY_DISCORD_INVITE_URL,
} from '../../../shared/constants';
import { MascotDecorationSetting } from './MascotDecorationSetting';
import { SettingsSwitch } from './SettingsSwitch';

interface SettingsLanguageSectionProps {
  settings:        Settings;
  onSettingChange: <K extends keyof Settings>(key: K, value: Settings[K]) => void;
}

export function SettingsLanguageSection({
  settings,
  onSettingChange,
}: SettingsLanguageSectionProps) {
  const { t } = useI18n();
  return (
    <div className="p-settings-section">
      <div className="p-settings-section-title">{t.language.sectionTitle}</div>
      <label className="p-settings-row p-settings-row--select">
        <span>{t.language.selectLabel}</span>
        <select
          className="p-settings-select"
          value={settings.language}
          onChange={(e) => onSettingChange('language', e.target.value as Settings['language'])}
        >
          {APP_LANGUAGES.map((id) => (
            <option key={id} value={id}>
              {APP_LANGUAGE_LABELS[id]}
            </option>
          ))}
        </select>
      </label>
      <p className="p-settings-hint">{t.language.hint}</p>
    </div>
  );
}

interface SettingsThemeSectionProps {
  settings:      Settings;
  onThemeChange: (name: string) => void;
}

export function SettingsThemeSection({ settings, onThemeChange }: SettingsThemeSectionProps) {
  const { language, t } = useI18n();
  return (
    <div className="p-settings-section">
      <div className="p-settings-section-title">{t.settings.colorTheme}</div>
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
            <span className="p-theme-btn-label">
              {themeDisplayName(key, meta.name, language)}
            </span>
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
  const { t } = useI18n();
  return (
    <>
      <div className="p-settings-section">
        <div className="p-settings-section-title">{t.settings.homeDecoration}</div>
        <MascotDecorationSetting
          artwork="calendar"
          checked={settings.showKogiCalMascot}
          label={t.settings.showKogiCalMascot}
          onChange={(checked) => onSettingChange('showKogiCalMascot', checked)}
        />
        <MascotDecorationSetting
          artwork="homeCorner"
          checked={settings.showHomeCornerCharacter}
          label={t.settings.showHomeCornerCharacter}
          onChange={(checked) => onSettingChange('showHomeCornerCharacter', checked)}
        />
      </div>

      <div className="p-settings-section">
        <div className="p-settings-section-title">{t.settings.display}</div>

        <SettingsSwitch checked={settings.hideProfileName} label={t.settings.hideProfileName} onChange={(checked) => onSettingChange('hideProfileName', checked)} />
        <SettingsSwitch checked={settings.kinoEmptyForce} label={t.settings.kinoEmptyForce} onChange={(checked) => onSettingChange('kinoEmptyForce', checked)} />
        <SettingsSwitch checked={settings.hoshuCalForce} label={t.settings.hoshuCalForce} onChange={(checked) => onSettingChange('hoshuCalForce', checked)} />
        <SettingsSwitch checked={settings.campusCalForce} label={t.settings.campusCalForce} onChange={(checked) => onSettingChange('campusCalForce', checked)} />
        <SettingsSwitch checked={settings.hideAssignmentCalendar} label={t.settings.hideAssignmentCalendar} onChange={(checked) => onSettingChange('hideAssignmentCalendar', checked)} />

        <fieldset className="p-settings-fieldset">
          <legend className="p-settings-row-label">{t.settings.calendarWeekStart}</legend>
          <div className="p-settings-segmented">
            <label>
              <input
                type="radio"
                name="portal-calendar-week-start"
                checked={settings.calendarWeekStart === 'monday'}
                onChange={() => onSettingChange('calendarWeekStart', 'monday')}
              />
              <span>{t.settings.weekStartMonday}</span>
            </label>
            <label>
              <input
                type="radio"
                name="portal-calendar-week-start"
                checked={settings.calendarWeekStart === 'sunday'}
                onChange={() => onSettingChange('calendarWeekStart', 'sunday')}
              />
              <span>{t.settings.weekStartSunday}</span>
            </label>
          </div>
        </fieldset>
      </div>

      <div className="p-settings-section">
        <div className="p-settings-section-title">{t.settings.help}</div>
        <div className="p-settings-row p-settings-row-actions p-settings-tour-replay">
          <button type="button" className="p-settings-tour-replay-btn" onClick={onReplayGuidedTour}>
            {t.settings.replayTour}
          </button>
        </div>

        <div className="p-settings-row p-settings-row-actions p-settings-tour-replay p-settings-changelog-after-tour">
          <button type="button" className="p-settings-tour-replay-btn" onClick={onOpenChangelog}>
            {t.settings.openChangelog}
          </button>
        </div>
      </div>

      <div className="p-settings-section">
        <div className="p-settings-section-title">{t.settings.dataIntegration}</div>
        <div className="p-settings-row p-settings-row-actions p-settings-king-lms-sync">
          <button
            type="button"
            className="p-settings-resync-btn"
            onClick={() => void beginKingLmsCourseListSync({ toastQuiet: true })}
          >
            {t.settings.resyncCourses}
          </button>
          <p className="p-settings-hint">
            {t.settings.resyncCoursesHint}
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
  const { t } = useI18n();
  return (
    <div className="p-settings-section">
      <div className="p-settings-section-title">{t.settings.webMail}</div>
      <SettingsSwitch
        checked={settings.home2WebMailOverlay}
        label={t.settings.webMailOverlay}
        onChange={(next) => {
            onSettingChange('home2WebMailOverlay', next);
            if (variant === 'home2' && !next) window.location.reload();
        }}
      />
      <p className="p-settings-hint">{t.settings.webMailReloadHint}</p>
    </div>
  );
}

export function SettingsCplanSection({
  settings,
  onSettingChange,
}: SettingsLanguageSectionProps) {
  const { t } = useI18n();
  return (
    <div className="p-settings-section">
      <div className="p-settings-section-title">{t.settings.campusPlan}</div>
      <SettingsSwitch checked={settings.cplanOverlay} label={t.settings.campusPlanOverlay} onChange={(checked) => onSettingChange('cplanOverlay', checked)} />
      <p className="p-settings-hint">{t.settings.campusPlanReloadHint}</p>
    </div>
  );
}

export function SettingsFeedbackSection() {
  const { t } = useI18n();
  const feedbackFormUrl = EXTENSION_FEEDBACK_FORM_URL;
  const discordInviteUrl = PORTAL_COMMUNITY_DISCORD_INVITE_URL;
  const hasFeedbackForm = feedbackFormUrl.length > 0;
  const hasDiscordCommunity = discordInviteUrl.length > 0;
  const showFeedbackSection = hasFeedbackForm || hasDiscordCommunity;
  const feedbackSectionTitle = hasFeedbackForm && hasDiscordCommunity
    ? t.settings.feedbackCommunity
    : hasFeedbackForm
      ? t.settings.feedback
      : t.settings.community;

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
            {hasDiscordCommunity ? t.settings.feedbackFormWithCommunity : t.settings.feedbackForm}
          </a>
        </div>
      ) : null}
      {hasDiscordCommunity ? (
        <>
          {hasFeedbackForm ? (
            <p className="p-settings-hint p-settings-hint--tight">
              {t.settings.discordHint}
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
              <span>{t.settings.discordServer}</span>
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
  const { t } = useI18n();
  return (
    <div className="p-settings-section p-settings-section-changelog-only">
      <div className="p-settings-row p-settings-row-actions p-settings-tour-replay">
        <button type="button" className="p-settings-tour-replay-btn" onClick={onOpenChangelog}>
          {t.settings.openChangelog}
        </button>
      </div>
    </div>
  );
}
