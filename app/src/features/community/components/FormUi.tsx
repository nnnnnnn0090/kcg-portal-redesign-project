import type { ReactNode } from 'react';
import { Glyph } from './Glyph';

export function DialogHeader({ title, close }: { title: string; close: () => void }) {
  return (
    <header
      className={
        'community-dialog-header tw-flex tw-min-h-16 tw-items-center tw-justify-between tw-gap-3 tw-border-b tw-border-community-border tw-bg-community-bg2 tw-px-4 tw-py-3 [&_h2]:tw-m-0 [&_h2]:tw-text-xl [&_h2]:tw-text-community-bright [&_button]:tw-grid [&_button]:tw-h-10 [&_button]:tw-w-10 [&_button]:tw-flex-none [&_button]:tw-place-items-center [&_button]:tw-rounded-lg [&_button]:tw-border [&_button]:tw-border-community-border [&_button]:tw-bg-community-bg3 [&_button]:tw-p-0 [&_button]:tw-cursor-pointer [&_svg]:tw-h-[18px] [&_svg]:tw-w-[18px] [&_svg]:tw-fill-none [&_svg]:tw-stroke-current'
      }
    >
      <h2>{title}</h2>
      <button type="button" onClick={close}>
        <Glyph name="close" />
      </button>
    </header>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label
      className={
        'community-field tw-grid tw-gap-2 [&>span]:tw-text-[13px] [&>span]:tw-font-bold [&>span]:tw-text-community-bright [&>label]:tw-text-[13px] [&>label]:tw-font-bold [&>label]:tw-text-community-bright [&_input]:tw-min-h-10 [&_input]:tw-w-full [&_input]:tw-rounded-lg [&_input]:tw-border [&_input]:tw-border-community-border [&_input]:tw-bg-community-bg2 [&_input]:tw-px-3 [&_input]:tw-py-2 [&_input]:tw-text-sm [&_input]:tw-text-community-text [&_input]:tw-outline-none focus:[&_input]:tw-border-community-accent focus:[&_input]:tw-ring-2 focus:[&_input]:tw-ring-community-accent-bg [&_textarea]:tw-min-h-28 [&_textarea]:tw-w-full [&_textarea]:tw-resize-y [&_textarea]:tw-rounded-lg [&_textarea]:tw-border [&_textarea]:tw-border-community-border [&_textarea]:tw-bg-community-bg2 [&_textarea]:tw-px-3 [&_textarea]:tw-py-2 [&_textarea]:tw-text-sm [&_textarea]:tw-leading-relaxed [&_textarea]:tw-text-community-text [&_textarea]:tw-outline-none focus:[&_textarea]:tw-border-community-accent [&_select]:tw-min-h-10 [&_select]:tw-w-full [&_select]:tw-rounded-lg [&_select]:tw-border [&_select]:tw-border-community-border [&_select]:tw-bg-community-bg2 [&_select]:tw-px-3 [&_select]:tw-text-sm [&_select]:tw-text-community-text [&_select]:tw-outline-none'
      }
    >
      <span>{label}</span>
      {children}
    </label>
  );
}
export function ErrorMessage({ text }: { text: string }) {
  return text ? (
    <p
      className={
        'community-form-error tw-m-0 tw-rounded-lg tw-bg-[color-mix(in_srgb,var(--p-danger,#e54867)_12%,var(--p-bg2))] tw-p-3 tw-text-[13px] tw-text-community-danger'
      }
      role="alert"
    >
      {text}
    </p>
  ) : null;
}
export function Busy() {
  return (
    <svg
      className={
        'community-spinner tw-block tw-h-[18px] tw-w-[18px] tw-flex-none tw-animate-spin tw-overflow-visible tw-text-current'
      }
      width="18"
      height="18"
      viewBox="0 0 24 24"
      aria-hidden="true"
    >
      <circle
        cx="12"
        cy="12"
        r="9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        opacity="0.24"
      />
      <path
        d="M21 12a9 9 0 0 0-9-9"
        fill="none"
        stroke="currentColor"
        strokeWidth="2.5"
        strokeLinecap="round"
      />
    </svg>
  );
}
