/** @type {import('tailwindcss').Config} */
const appleFont = ['-apple-system', 'BlinkMacSystemFont', '"SF Pro Display"', '"SF Pro Text"', 'Inter', '"Segoe UI"', 'Roboto', 'Helvetica Neue', 'Arial', 'sans-serif']

export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Identidade Grupo Le Belle: preto, prata e azul vivo
        ink: '#0B0B0D',                                                   // preto
        sand: '#F2F3F5',                                                  // fundo prata claro
        line: '#DCDFE4',                                                  // bordas prata
        silver: { DEFAULT: '#A9AFB8', light: '#E6E8EC', dark: '#6B717B' }, // prata
        blue: { DEFAULT: '#007AFF', light: '#E5F1FF', dark: '#0058CC' },   // azul vivo
        leaf: '#1E7B45',                                                  // verde só para mensagens de sucesso
      },
      fontFamily: { sans: appleFont, display: appleFont },
    },
  },
  plugins: [],
}
