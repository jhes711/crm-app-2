/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    extend: {
      colors: {
        // Sidebar / dark background — warm near-black matching brand #11100E
        navy: {
          900: '#11100E',
          800: '#1C1A17',
          700: '#2B2825',
          600: '#3B3733',
        },
        // Primary brand orange — replaces all previous teal usage
        teal: {
          50:  '#FFF4EE',
          100: '#FFE4D3',
          200: '#FFC5A0',
          300: '#FF9E6B',
          400: '#F07540',
          500: '#EA501A',
          600: '#C73F13',
          700: '#A0320F',
          800: '#7A2609',
          900: '#531A06',
        },
        // Brand accent palette — available as `brand-*` utilities
        brand: {
          orange: '#EA501A',
          gray:   '#686666',
          black:  '#11100E',
          yellow: '#FCEA00',
          purple: '#632E84',
          green:  '#008B3D',
        },
      }
    }
  },
  plugins: []
};
