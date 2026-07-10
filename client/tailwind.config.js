/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['"Space Grotesk"', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      colors: {
        // Navy / indigo design system. The token NAMES are unchanged from the
        // original theme (ink/canvas/surface/line/accent/priority/status), so
        // every existing component re-themes automatically; only the values
        // moved to a cohesive blue palette. `surface2` and `accent2/3` are new.
        ink: { DEFAULT: '#161A33', dark: '#E9ECFF' },
        canvas: { DEFAULT: '#E6E9F8', dark: '#080B1C' },
        surface: { DEFAULT: '#FFFFFF', dark: '#0F1330' },
        surface2: { DEFAULT: '#F2F4FC', dark: '#141834' },
        line: { DEFAULT: '#D7DAEE', dark: '#262B48' },
        accent: { DEFAULT: '#2C40C0', soft: '#E3E6FA', dark: '#8A9BFF' },
        accent2: { DEFAULT: '#7A4FE0', dark: '#B7A6FF' }, // violet
        accent3: { DEFAULT: '#3E5AE0', dark: '#7C93FF' }, // indigo
        // Semantic tokens kept under their existing names, revalued to sit in
        // the navy palette. (Deliberately NOT named amber/rose/emerald/slate so
        // Tailwind's built-in scales like `amber-400` keep working.)
        priority: { low: '#12B886', medium: '#E08A00', high: '#F0416B' },
        status: { todo: '#6A71A8', progress: '#2C40C0', done: '#12B886' },
      },
      boxShadow: {
        card: '0 1px 2px rgba(16,19,48,0.05), 0 10px 30px -16px rgba(16,19,48,0.22)',
        elevated: '0 24px 60px -20px rgba(16,19,48,0.45)',
        glow: '0 8px 26px -8px rgba(44,64,192,0.55)',
      },
      backgroundImage: {
        'accent-gradient': 'linear-gradient(135deg, #3E5AE0 0%, #2C40C0 55%, #7A4FE0 100%)',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(6px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        'pop-in': {
          '0%': { opacity: '0', transform: 'scale(0.97)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
      },
      animation: {
        'fade-up': 'fade-up 0.35s cubic-bezier(0.22,1,0.36,1)',
        'pop-in': 'pop-in 0.22s cubic-bezier(0.22,1,0.36,1)',
      },
    },
  },
  plugins: [],
};
