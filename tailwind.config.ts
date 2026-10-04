import type { Config } from 'tailwindcss';
import animate from 'tailwindcss-animate';

/**
 * Tailwind + shadcn/ui theme. Colors resolve to the HSL tokens in
 * src/styles/tokens.css so light/dark themes stay token-driven.
 * Dark mode follows the OS (`media`), matching the existing tokens.
 */
export default {
  darkMode: 'media',
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    container: {
      center: true,
      padding: '1.25rem',
      screens: { '2xl': '1400px' },
    },
    extend: {
      fontFamily: {
        heading: ['"Bricolage Grotesque"', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
        sans: ['Figtree', 'system-ui', '-apple-system', '"Segoe UI"', 'sans-serif'],
      },
      colors: {
        border: 'hsl(var(--border))',
        input: 'hsl(var(--input))',
        ring: 'hsl(var(--ring))',
        background: 'hsl(var(--background))',
        foreground: 'hsl(var(--foreground))',
        primary: {
          DEFAULT: 'hsl(var(--primary))',
          foreground: 'hsl(var(--primary-foreground))',
        },
        secondary: {
          DEFAULT: 'hsl(var(--secondary))',
          foreground: 'hsl(var(--secondary-foreground))',
        },
        destructive: {
          DEFAULT: 'hsl(var(--destructive))',
          foreground: 'hsl(var(--destructive-foreground))',
        },
        muted: {
          DEFAULT: 'hsl(var(--muted))',
          foreground: 'hsl(var(--muted-foreground))',
        },
        accent: {
          DEFAULT: 'hsl(var(--accent))',
          foreground: 'hsl(var(--accent-foreground))',
        },
        card: {
          DEFAULT: 'hsl(var(--card))',
          foreground: 'hsl(var(--card-foreground))',
        },
        // CareLink brand / status colors (steering core palette).
        heading: 'hsl(var(--heading))',
        'border-strong': 'hsl(var(--border-strong))',
        // Each status color has a fill (DEFAULT), a soft tint background and an
        // AA-contrast ink for text placed on the tint.
        teal: {
          DEFAULT: 'hsl(var(--teal))',
          soft: 'hsl(var(--teal-soft))',
          ink: 'hsl(var(--teal-ink))',
        },
        screened: {
          DEFAULT: 'hsl(var(--screened))',
          soft: 'hsl(var(--screened-soft))',
          ink: 'hsl(var(--screened-ink))',
        },
        monitor: {
          DEFAULT: 'hsl(var(--monitor))',
          soft: 'hsl(var(--monitor-soft))',
          ink: 'hsl(var(--monitor-ink))',
        },
        referral: {
          DEFAULT: 'hsl(var(--referral))',
          soft: 'hsl(var(--referral-soft))',
          ink: 'hsl(var(--referral-ink))',
        },

        // Legacy `--cl-*` names used by the role screens (staff, doctor,
        // citizen, admin). Same palette as above; kept so those screens render
        // unchanged. Prefer the shadcn names above in new code.
        bg: 'var(--cl-bg)',
        surface: 'var(--cl-surface)',
        'text-main': 'var(--cl-text)',
        'text-muted': 'var(--cl-text-muted)',
        'screened-green': 'var(--cl-screened-green)',
        'monitor-amber': 'var(--cl-monitor-amber)',
        'needs-referral-red': 'var(--cl-needs-referral-red)',
      },
      borderRadius: {
        lg: 'var(--radius)',
        md: 'calc(var(--radius) - 2px)',
        sm: 'calc(var(--radius) - 4px)',
        // Legacy radius for the role screens (see colors above).
        cl: 'var(--cl-radius)',
      },
      boxShadow: {
        soft: 'var(--shadow-sm)',
        lift: 'var(--shadow-md)',
      },
      backgroundImage: {
        brand: 'var(--brand-gradient)',
      },
      minHeight: { touch: '44px' },
      minWidth: { touch: '44px' },
    },
  },
  plugins: [animate],
} satisfies Config;
