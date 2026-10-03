import type { Config } from 'tailwindcss';

/**
 * CareLink Tailwind config. Brand colors are driven by CSS variables in
 * styles/tokens.css so light/dark themes work without duplicating palettes.
 * Fonts: Bricolage Grotesque (headings), Figtree (body) with system fallbacks.
 */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  darkMode: 'media',
  theme: {
    extend: {
      colors: {
        // Reference the token variables so themes flow through automatically.
        primary: 'var(--cl-primary)',
        teal: 'var(--cl-teal)',
        'screened-green': 'var(--cl-screened-green)',
        'monitor-amber': 'var(--cl-monitor-amber)',
        'needs-referral-red': 'var(--cl-needs-referral-red)',
        bg: 'var(--cl-bg)',
        surface: 'var(--cl-surface)',
        'text-main': 'var(--cl-text)',
        'text-muted': 'var(--cl-text-muted)',
        border: 'var(--cl-border)',
      },
      fontFamily: {
        heading: ['Bricolage Grotesque', 'system-ui', 'sans-serif'],
        body: ['Figtree', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        cl: 'var(--cl-radius)',
      },
      minHeight: {
        touch: '44px',
      },
      minWidth: {
        touch: '44px',
      },
    },
  },
  plugins: [],
} satisfies Config;
