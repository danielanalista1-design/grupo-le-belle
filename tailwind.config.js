/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        ink: '#17140F',
        sand: '#F6F2EA',
        line: '#E6DFD1',
        gold: { DEFAULT: '#B8862E', light: '#E9CB7E', dark: '#8A6410' },
        leaf: '#2F7A34',
      },
      fontFamily: { sans: ['Inter', 'system-ui', 'sans-serif'], display: ['Montserrat', 'system-ui', 'sans-serif'] },
    },
  },
  plugins: [],
}
