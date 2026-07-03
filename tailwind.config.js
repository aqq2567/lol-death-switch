/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{js,jsx,ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        'lol-blue': '#0A1428',
        'lol-gold': '#C89B3C',
        'lol-dark-blue': '#010A13',
        'lol-light-blue': '#1E2328',
        'lol-accent': '#9FBEAD',
        'lol-secondary': '#AABEE0',
      },
      fontFamily: {
        'lol': ['Spiegel', 'Segoe UI', 'sans-serif'],
      },
    },
  },
  plugins: [],
  prefix: 'tw-',
  corePlugins: {
    preflight: false,
  },
};
