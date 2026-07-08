import {
  forwardRef,
  useLayoutEffect,
  useMemo,
  useRef,
  useState,
  type InputHTMLAttributes,
  type TextareaHTMLAttributes,
  type UIEvent,
} from 'react';
import { renderInputTagHighlightHtml } from '../tag-highlight';
import { cn } from '../../../lib/cn';

type TagHighlightFieldProps = {
  multiline?: boolean;
  wrapperClassName?: string;
} & (
  | ({ multiline: true } & TextareaHTMLAttributes<HTMLTextAreaElement>)
  | ({ multiline?: false } & InputHTMLAttributes<HTMLInputElement>)
);

// The transparent control and the highlight backdrop must share identical text
// metrics (font, size, spacing, padding), otherwise the caret drifts from the
// visible text. `tw-font-community` pins an explicit font-family because form
// controls do not inherit the app font on their own.
const SHARED_BOX =
  'tw-m-0 tw-w-full tw-min-w-0 tw-border-0 tw-px-3 tw-py-2 tw-font-community tw-text-sm tw-leading-relaxed tw-tracking-normal tw-[font-kerning:none] tw-[font-variant-ligatures:none]';

export const TagHighlightField = forwardRef<
  HTMLTextAreaElement | HTMLInputElement,
  TagHighlightFieldProps
>(function TagHighlightField(
  { multiline = false, className, wrapperClassName, value, onScroll, ...props },
  ref,
) {
  const innerRef = useRef<HTMLTextAreaElement | HTMLInputElement | null>(null);
  const [scroll, setScroll] = useState({ top: 0, left: 0 });
  const text = String(value ?? '');
  const html = useMemo(() => renderInputTagHighlightHtml(text), [text]);

  const setRefs = (node: HTMLTextAreaElement | HTMLInputElement | null) => {
    innerRef.current = node;
    if (typeof ref === 'function') ref(node);
    else if (ref) ref.current = node;
  };

  // Typing can scroll the control without firing onScroll; resync after each value change.
  useLayoutEffect(() => {
    const node = innerRef.current;
    if (node) setScroll({ top: node.scrollTop, left: node.scrollLeft });
  }, [text]);

  const wrapperClass = cn(
    'community-tag-highlight-field tw-relative tw-min-w-0 tw-overflow-hidden tw-rounded-lg tw-border tw-border-community-border tw-bg-community-bg2 focus-within:tw-border-community-accent focus-within:tw-ring-2 focus-within:tw-ring-community-accent-bg',
    wrapperClassName,
  );

  const controlClass = cn(
    SHARED_BOX,
    'tw-relative tw-z-[1] tw-block tw-appearance-none tw-bg-transparent tw-text-transparent tw-caret-community-text tw-outline-none',
    'placeholder:tw-text-community-muted',
    'selection:tw-bg-[color-mix(in_srgb,var(--p-accent)_32%,transparent)] selection:tw-text-transparent',
    multiline ? 'tw-min-h-28 tw-resize-y tw-whitespace-pre-wrap tw-break-words' : 'tw-h-10 tw-resize-none',
    className,
  );

  const backdropInnerClass = cn(
    SHARED_BOX,
    'community-tag-highlight-backdrop-inner tw-text-community-text',
    multiline
      ? 'tw-min-h-28 tw-whitespace-pre-wrap tw-break-words'
      : 'tw-h-10 tw-whitespace-pre tw-overflow-hidden',
    '[&_.community-input-tag-highlight]:tw-text-community-accent-light',
  );

  const handleScroll = (event: UIEvent<HTMLTextAreaElement | HTMLInputElement>) => {
    setScroll({ top: event.currentTarget.scrollTop, left: event.currentTarget.scrollLeft });
  };

  const backdrop = (
    <div
      className="community-tag-highlight-backdrop tw-pointer-events-none tw-absolute tw-inset-0 tw-z-0 tw-overflow-hidden"
      aria-hidden="true"
    >
      <div
        className={backdropInnerClass}
        style={{ transform: `translate(${-scroll.left}px, ${-scroll.top}px)` }}
        dangerouslySetInnerHTML={{ __html: html || '&#8203;' }}
      />
    </div>
  );

  if (multiline) {
    return (
      <div className={wrapperClass}>
        {backdrop}
        <textarea
          {...(props as TextareaHTMLAttributes<HTMLTextAreaElement>)}
          ref={setRefs}
          value={value}
          className={controlClass}
          onScroll={(event) => {
            handleScroll(event);
            (onScroll as TextareaHTMLAttributes<HTMLTextAreaElement>['onScroll'])?.(event);
          }}
        />
      </div>
    );
  }

  return (
    <div className={wrapperClass}>
      {backdrop}
      <input
        {...(props as InputHTMLAttributes<HTMLInputElement>)}
        ref={setRefs}
        value={value}
        className={controlClass}
        onScroll={(event) => {
          handleScroll(event);
          (onScroll as InputHTMLAttributes<HTMLInputElement>['onScroll'])?.(event);
        }}
      />
    </div>
  );
});
