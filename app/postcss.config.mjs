import postcss from 'postcss';
import tailwindcss from 'tailwindcss';
import autoprefixer from 'autoprefixer';
import { legacyOverlayCss } from './tailwind.legacy-overlay.mjs';

function legacyOverlayCompatibility() {
  return {
    postcssPlugin: 'kcg-legacy-overlay-compatibility',
    Once(root) {
      const inputFile = root.source?.input.file ?? '';
      if (!inputFile.endsWith('tailwind-overlay.css')) return;
      root.prepend(postcss.parse(legacyOverlayCss, { from: 'tailwind.legacy-overlay.mjs' }));
    },
  };
}

legacyOverlayCompatibility.postcss = true;

export default {
  plugins: [
    legacyOverlayCompatibility(),
    tailwindcss(),
    autoprefixer(),
  ],
};
