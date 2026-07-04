import type { Config } from 'tailwindcss';

export default {
  content: [
    './src/features/community/**/*.{ts,tsx}',
    './src/components/layout/CommunityActivityDrawer.tsx',
  ],
  important: '#portal-overlay',
  prefix: 'tw-',
  corePlugins: {
    preflight: false,
  },
  theme: {
    extend: {
      colors: {
        community: {
          bg: 'var(--p-bg)',
          bg2: 'var(--p-bg2)',
          bg3: 'var(--p-bg3)',
          border: 'var(--p-border)',
          'border-light': 'var(--p-border-light)',
          text: 'var(--p-text)',
          bright: 'var(--p-text-bright)',
          muted: 'var(--p-text-muted)',
          accent: 'var(--p-accent)',
          'accent-light': 'var(--p-accent-light)',
          'accent-bg': 'var(--p-accent-bg)',
          danger: 'var(--p-danger, #e54867)',
        },
      },
      fontFamily: {
        community: ['var(--p-font)'],
      },
      boxShadow: {
        'community-card': '0 8px 24px color-mix(in srgb, #000 13%, transparent)',
        'community-modal': '0 24px 80px color-mix(in srgb, #000 34%, transparent)',
      },
      keyframes: {
        'community-fade-in': { from: { opacity: '0' } },
        'community-fade-out': { to: { opacity: '0' } },
        'community-slide-in': { from: { transform: 'translateX(5%)' } },
        'community-slide-out': { to: { transform: 'translateX(5%)' } },
        'community-dialog-in': {
          from: { opacity: '0', transform: 'translateY(12px) scale(.985)' },
        },
      },
      animation: {
        'community-fade-in': 'community-fade-in 180ms ease both',
        'community-fade-out': 'community-fade-out 280ms ease both',
        'community-slide-in': 'community-slide-in 260ms cubic-bezier(.2,.8,.2,1) both',
        'community-slide-out': 'community-slide-out 280ms ease both',
        'community-dialog-in': 'community-dialog-in 180ms ease both',
      },
    },
  },
  plugins: [],
} satisfies Config;
