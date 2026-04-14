/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        bg: {
          primary: '#0a0a0f',
          secondary: '#111118',
          elevated: '#18181f',
          card: '#13131a',
        },
        border: {
          DEFAULT: '#252530',
          subtle: '#1a1a25',
        },
        accent: {
          DEFAULT: '#7c5cfc',
          hover: '#9b7ffe',
          muted: '#7c5cfc33',
          glow: '#7c5cfc66',
        },
        text: {
          primary: '#e8eaf6',
          secondary: '#8b8fa8',
          muted: '#4d5066',
        },
      },
      boxShadow: {
        'glow-accent': '0 0 24px 0 rgba(124, 92, 252, 0.35)',
        'glow-sm': '0 0 12px 0 rgba(124, 92, 252, 0.2)',
        card: '0 2px 16px 0 rgba(0,0,0,0.5)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'Fira Code', 'monospace'],
      },
    },
  },
  plugins: [],
}
