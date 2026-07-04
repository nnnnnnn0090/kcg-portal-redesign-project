import { removeRuntimeCss, upsertRuntimeCss } from '../themes/runtime-style';

let runtimeElementSeq = 0;

function escapeId(id: string): string {
  if (typeof CSS !== 'undefined' && typeof CSS.escape === 'function') return CSS.escape(id);
  return id.replace(/[^A-Za-z0-9_-]/g, '\\$&');
}

function ensureRuntimeElementId(el: HTMLElement): string {
  if (el.id) return el.id;
  runtimeElementSeq += 1;
  el.id = `kcg-runtime-style-${runtimeElementSeq}`;
  return el.id;
}

export function setRuntimeElementCss(el: HTMLElement, scope: string, declarations: string): void {
  const id = ensureRuntimeElementId(el);
  upsertRuntimeCss(`runtime-element:${id}:${scope}`, `#${escapeId(id)}{${declarations}}`);
}

export function clearRuntimeElementCss(el: HTMLElement, scope: string): void {
  if (!el.id) return;
  removeRuntimeCss(`runtime-element:${el.id}:${scope}`);
}
