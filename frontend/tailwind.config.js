/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Sidebar / dark background — pure black and dark grays
        navy: {
          900: '#000000',
          800: '#1a1a1a',
          700: '#333333',
          600: '#4d4d4d',
        },
        // Accent — gold (#FFD700) and its shades
        teal: {
          50:  '#FFFDE7',
          100: '#FFF9C4',
          200: '#FFF176',
          300: '#FFE033',
          400: '#FFDB00',
          500: '#FFD700',
          600: '#CCB000',
          700: '#998400',
          800: '#665800',
          900: '#332C00',
        },
      }
    }
  },
  plugins: []
};
