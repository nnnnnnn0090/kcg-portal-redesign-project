import { useEffect, useRef } from 'react';
import { clearRuntimeElementCss, setRuntimeElementCss } from '../../lib/runtime-element-style';

interface ColorSwatchProps {
  color: string;
  className?: string;
}

export function ColorSwatch({ color, className }: ColorSwatchProps) {
  const ref = useRef<HTMLSpanElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    setRuntimeElementCss(el, 'swatch-color', `background:${color}`);
    return () => clearRuntimeElementCss(el, 'swatch-color');
  }, [color]);

  return <span ref={ref} className={className} />;
}
