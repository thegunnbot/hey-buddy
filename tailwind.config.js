/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', '-apple-system', 'BlinkMacSystemFont', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        hx: {
          navy:     '#0f1924',
          'navy-mid': '#1c2c3b',
          'navy-light': '#28323f',
          'navy-border': '#505862',
          teal:     '#59bbb7',
          'teal-dark': '#01514e',
          'teal-muted': 'rgba(89,187,183,0.15)',
          coral:    '#ee6c5b',
          'coral-dark': '#400a20',
          'coral-muted': 'rgba(238,108,91,0.12)',
          cyan:     '#49deff',
          blue:     '#4e70f8',
          gray:     '#848d9a',
          border:   '#28323f',
        },
      },
    },
  },
  plugins: [],
}
