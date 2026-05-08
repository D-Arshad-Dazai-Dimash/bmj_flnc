import type { Config } from 'tailwindcss'

const config: Config = {
  darkMode: 'class',
  content: [
    './src/pages/**/*.{js,ts,jsx,tsx,mdx}',
    './src/components/**/*.{js,ts,jsx,tsx,mdx}',
    './src/app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        bg: {
          base:    'var(--bg-base)',
          surface: 'var(--bg-surface)',
          card:    'var(--bg-card)',
          hover:   'var(--bg-hover)',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle:  'var(--border-subtle)',
          bright:  'var(--border-bright)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          dim:     'var(--accent-dim)',
          glow:    'var(--accent-glow)',
          light:   'var(--accent-light)',
          bright:  'var(--accent-bright)',
        },
        neon: {
          purple: '#7a58ac',
          cyan:   '#4898bc',
          pink:   '#c98fb1',
        },
        brand: {
          blue:   '#638ad4',
          navy:   '#050830',
          royal:  '#376fb1',
          teal:   '#4898bc',
          pink:   '#c98fb1',
          violet: '#7a58ac',
          purple: '#4947ab',
          dark:   '#4c3f96',
          rose:   '#a46c84',
        },
        text: {
          base:    'var(--text-base)',
          muted:   'var(--text-muted)',
          faint:   'var(--text-faint)',
          accent:  'var(--text-accent)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        'glow-sm':     '0 0 12px rgba(73, 71, 171, 0.25)',
        'glow-md':     '0 0 30px rgba(73, 71, 171, 0.35)',
        'glow-lg':     '0 0 60px rgba(73, 71, 171, 0.4)',
        'glow-cyan':   '0 0 30px rgba(72, 152, 188, 0.3)',
        'glow-pink':   '0 0 30px rgba(201, 143, 177, 0.25)',
        'inner-glow':  'inset 0 0 30px rgba(73, 71, 171, 0.1)',
        'card':        '0 1px 0 rgba(255,255,255,0.04), 0 8px 32px rgba(0,0,0,0.5)',
        'card-hover':  '0 0 0 1px rgba(73,71,171,0.4), 0 12px 48px rgba(73,71,171,0.15)',
      },
      backgroundImage: {
        'gradient-radial':   'radial-gradient(var(--tw-gradient-stops))',
        'gradient-conic':    'conic-gradient(from 180deg at 50% 50%, var(--tw-gradient-stops))',
        'grid-pattern':
          'linear-gradient(rgba(99,138,212,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(99,138,212,0.06) 1px, transparent 1px)',
        'noise':
          "url(\"data:image/svg+xml,%3Csvg viewBox='0 0 200 200' xmlns='http://www.w3.org/2000/svg'%3E%3Cfilter id='n'%3E%3CfeTurbulence type='fractalNoise' baseFrequency='0.75' numOctaves='4' stitchTiles='stitch'/%3E%3C/filter%3E%3Crect width='100%25' height='100%25' filter='url(%23n)' opacity='0.025'/%3E%3C/svg%3E\")",
        'portal-purple':     'linear-gradient(145deg, #07092d 0%, #030619 100%)',
        'portal-cyan':       'linear-gradient(145deg, #06142a 0%, #030d1f 100%)',
      },
      animation: {
        'glow-pulse':  'glow-pulse 3s ease-in-out infinite',
        'float':       'float 6s ease-in-out infinite',
        'shimmer':     'shimmer 2.5s linear infinite',
        'scan':        'scan 8s linear infinite',
      },
      keyframes: {
        'glow-pulse': {
          '0%, 100%': { opacity: '0.4' },
          '50%':      { opacity: '0.8' },
        },
        'float': {
          '0%, 100%': { transform: 'translateY(0px)' },
          '50%':      { transform: 'translateY(-10px)' },
        },
        'shimmer': {
          '0%':   { backgroundPosition: '-200% center' },
          '100%': { backgroundPosition: '200% center' },
        },
        'scan': {
          '0%':   { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100vh)' },
        },
      },
      backgroundSize: {
        'grid': '40px 40px',
      },
    },
  },
  plugins: [],
}

export default config
