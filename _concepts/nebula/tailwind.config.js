const defaultTheme = require('tailwindcss/defaultTheme');

/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    './src/**/*.{ts,tsx,js,jsx}',
    './src/app/**/*.{ts,tsx,js,jsx}'
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Space Grotesk', ...defaultTheme.fontFamily.sans]
      },
      colors: {
        nebula: {
          50: '#f3f6ff',
          100: '#d2d9ff',
          200: '#a5b7ff',
          300: '#7a95ff',
          400: '#5e7bff',
          500: '#405bff',
          600: '#2f3ccf',
          700: '#1f2a97',
          800: '#141c62',
          900: '#0d1241'
        } 
      },
      boxShadow: {
        neon: '0 0 30px rgba(66, 153, 225, 0.4), 0 0 60px rgba(56, 189, 248, 0.25)'
      }
    }
  },
  plugins: []
};
