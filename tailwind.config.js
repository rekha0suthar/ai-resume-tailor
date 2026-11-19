/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      screens: {
        xs: '420px',
      },
      colors: {
        // App-shell ink. The full background gradient lives in index.css
        // as CSS variables (--grad-from/-via/-to).
        ink: {
          900: '#0b1722',
        },
        // ONE interactive/brand hue for the app shell. The four resume
        // TEMPLATES keep their own document palettes (ResumePreview.jsx).
        accent: {
          DEFAULT: '#4a9eff',
          bright: '#7ab8ff',
        },
        // Translucent surface tones for the dark-glass chrome:
        //   1 — cards, faint fills, idle chips
        //   2 — panels (score strip, collapsibles, chat)
        //   3 — inputs, hover fills, active chips
        surface: {
          1: 'rgba(255,255,255,0.03)',
          2: 'rgba(255,255,255,0.045)',
          3: 'rgba(255,255,255,0.06)',
        },
        // Semantic states: score deltas, importance chips, errors, warnings.
        // Solid hues — use opacity modifiers for fills/borders (bg-error/15).
        success: '#6ee7b7', // emerald-300
        warn: '#fcd34d', //    amber-300
        error: '#fda4af', //   rose-300
      },
      boxShadow: {
        // The hairline top highlight every glass panel carries.
        panel: 'inset 0 1px 0 rgba(255,255,255,0.04)',
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
