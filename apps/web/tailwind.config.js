/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#202C39',
          900: '#283845',
          850: '#2D3F4F',
          800: '#324555',
          700: '#3D5365',
        },
        brand: {
          200: '#FBE6CD',
          300: '#F7D7AC',
          400: '#F2D492',
          500: '#F29559',
          600: '#DD7A3D',
          700: '#B95F2B',
        },
        azure: {
          300: '#D6D0B7',
          400: '#C8C1A5',
          500: '#B8B08D',
          600: '#9A9272',
        },
        mint: {
          300: '#F7D7AC',
          400: '#F2D492',
          500: '#9A9272',
        },
        cream: '#F2D492',
        mist: '#BDB68F',
        ash: '#B9B293',
      },
      maxWidth: {
        content: '1240px',
      },
      // Full 1-100 opacity scale so every slash modifier resolves deterministically.
      opacity: Object.fromEntries(
        Array.from({ length: 101 }, (_, index) => [String(index), String(index / 100)]),
      ),
      fontFamily: {
        display: ['"Space Grotesk"', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        sans: ['Inter', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 0 1px rgba(242,149,89,0.35), 0 24px 70px -24px rgba(242,149,89,0.45)',
        card: '0 32px 80px -40px rgba(0,0,0,0.95)',
        panel: '0 40px 140px -50px rgba(242,149,89,0.35)',
      },
      animation: {
        float: 'float 9s ease-in-out infinite',
        'float-slow': 'float 14s ease-in-out infinite',
        'spin-slow': 'spin 30s linear infinite',
        'spin-reverse': 'spinReverse 44s linear infinite',
        'pulse-soft': 'pulseSoft 5s ease-in-out infinite',
        'dash-flow': 'dashFlow 3s linear infinite',
        shimmer: 'shimmer 6s linear infinite',
      },
      keyframes: {
        float: {
          '0%, 100%': { transform: 'translate3d(0,0,0)' },
          '50%': { transform: 'translate3d(0,-14px,0)' },
        },
        pulseSoft: {
          '0%, 100%': { opacity: '0.3' },
          '50%': { opacity: '0.75' },
        },
        dashFlow: {
          to: { strokeDashoffset: '-60' },
        },
        spinReverse: {
          to: { transform: 'rotate(-360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '0% 50%' },
          '100%': { backgroundPosition: '200% 50%' },
        },
      },
    },
  },
  plugins: [],
}
