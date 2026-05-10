/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Match the portfolio's palette so the two sites feel like a family.
        ink: {
          900: '#0f2027',
          800: '#142a4e',
          700: '#1d3a6f',
        },
        accent: {
          DEFAULT: '#4a9eff',
          bright: '#7ab8ff',
          cyan: '#00b4db',
          deep: '#0083b0',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
