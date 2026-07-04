import type { ReactNode } from 'react';
import { Glyph } from './Glyph';

export function DialogHeader({ title, close }: { title: string; close: () => void }) {
  return (
    <header className="community-dialog-header">
      <h2>{title}</h2>
      <button type="button" onClick={close}>
        <Glyph name="close" />
      </button>
    </header>
  );
}
export function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="community-field">
      <span>{label}</span>
      {children}
    </label>
  );
}
export function ErrorMessage({ text }: { text: string }) {
  return text ? (
    <p className="community-form-error" role="alert">
      {text}
    </p>
  ) : null;
}
export function Busy() {
  return <span className="community-spinner" />;
}
