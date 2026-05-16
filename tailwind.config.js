/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      colors: {
        ink: {
          900: '#0b1722',
          800: '#112b46',
          700: '#1a3766',
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
