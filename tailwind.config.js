/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
        display: ['"Space Grotesk"', 'Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#05070f',
          900: '#0a0e1a',
          850: '#0d1220',
          800: '#111829',
          700: '#1a2236',
          600: '#252f47',
          500: '#3a4663',
          400: '#5b6788',
          300: '#8792b0',
          200: '#b4bdd4',
          100: '#dde2ef',
        },
        electric: '#3b82f6',
        violet: '#8b5cf6',
        cyan: '#22d3ee',
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(99,102,241,0.25), 0 8px 32px -8px rgba(59,130,246,0.35)',
        card: '0 1px 0 0 rgba(255,255,255,0.04) inset, 0 12px 40px -12px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
