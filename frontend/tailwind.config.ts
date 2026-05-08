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
          panel:   'var(--bg-panel)',
          surface: 'var(--bg-surface)',
          card:    'var(--bg-card)',
          elevated:'var(--bg-elevated)',
          hover:   'var(--bg-hover)',
          active:  'var(--bg-active)',
        },
        border: {
          DEFAULT: 'var(--border)',
          subtle:  'var(--border-subtle)',
          bright:  'var(--border-bright)',
          focus:   'var(--border-focus)',
        },
        accent: {
          DEFAULT: 'var(--accent)',
          dim:     'var(--accent-dim)',
          glow:    'var(--accent-glow)',
          bright:  'var(--accent-bright)',
          hover:   'var(--accent-hover)',
          light:   'var(--accent-light)',
          vivid:   'var(--accent-vivid)',
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
          base:      'var(--text-base)',
          secondary: 'var(--text-secondary)',
          muted:     'var(--text-muted)',
          faint:     'var(--text-faint)',
          accent:    'var(--text-accent)',
        },
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'monospace'],
      },
      boxShadow: {
        /* Glow effects (Barnamaj brand) */
        'glow-sm':     '0 0 12px rgba(73, 71, 171, 0.25)',
        'glow-md':     '0 0 30px rgba(73, 71, 171, 0.35)',
        'glow-lg':     '0 0 60px rgba(73, 71, 171, 0.4)',
        'glow-cyan':   '0 0 30px rgba(72, 152, 188, 0.3)',
        'glow-pink':   '0 0 30px rgba(201, 143, 177, 0.25)',
        'inner-glow':  'inset 0 0 30px rgba(73, 71, 171, 0.1)',
        /* Linear-grade surface shadows */
        'card':        '0 1px 0 rgba(255,255,255,0.04) inset, 0 0 0 1px rgba(255,255,255,0.06), 0 8px 32px rgba(0,0,0,0.45)',
        'card-hover':  '0 0 0 1px rgba(113,112,255,0.35), 0 0 0 1px rgba(255,255,255,0.06), 0 12px 48px rgba(73,71,171,0.18)',
        'elevated':    'rgba(0,0,0,0.5) 0px 8px 32px, rgba(0,0,0,0.2) 0px 0px 0px 1px',
        'dialog':      '0 8px 2px rgba(0,0,0,0), 0 5px 2px rgba(0,0,0,0.01), 0 3px 2px rgba(0,0,0,0.04), 0 1px 1px rgba(0,0,0,0.07), 0 0 1px rgba(0,0,0,0.08)',
        'ring':        '0 0 0 1px rgba(255,255,255,0.08)',
        'focus':       '0 0 0 3px rgba(113,112,255,0.12), 0 0 0 1px rgba(113,112,255,0.30)',
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
      letterSpacing: {
        'display': '-0.066em',
        'h1':      '-0.022em',
        'h2':      '-0.018em',
        'h3':      '-0.012em',
        'body':    '-0.005em',
        'caption': '-0.008em',
        'tight':   '-0.01em',
        'tighter': '-0.02em',
      },
      fontWeight: {
        'signature': '510',  /* Linear's between-weight */
      },
    },
  },
  plugins: [],
}

export default config
