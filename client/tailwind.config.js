/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        display: ['Sora', 'sans-serif'],
        body: ['Inter', 'sans-serif'],
        mono: ['"IBM Plex Mono"', 'monospace'],
      },
      colors: {
        ink: { DEFAULT: '#1E2126', dark: '#E7E9EC' },
        canvas: { DEFAULT: '#F7F7F5', dark: '#12151A' },
        surface: { DEFAULT: '#FFFFFF', dark: '#1B1F26' },
        line: { DEFAULT: '#E4E4E1', dark: '#2A2F38' },
        accent: { DEFAULT: '#3452D9', soft: '#E8ECFC', dark: '#7B93F7' },
        priority: { low: '#2FA88E', medium: '#E2A93B', high: '#D9435E' },
        status: { todo: '#6B7280', progress: '#3452D9', done: '#2FA88E' },
      },
    },
  },
  plugins: [],
};
