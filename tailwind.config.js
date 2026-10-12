/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}'],
  presets: [require('nativewind/preset')],
  theme: {
    extend: {
      colors: {
        primary: { DEFAULT: '#3B7A70', light: '#EBF5F3', dark: '#2A5C54' },
        accent: '#D96B4F', background: '#F7F6F2', surface: '#FFFFFF',
        ink: '#1C1C2A', muted: '#6B6B7C', border: '#E3E1DC',
        success: '#2D8A4E', danger: '#B83232', warning: '#7A5500'
      },
      borderRadius: { nf: '10px', 'nf-sm': '6px' },
      fontFamily: { sans: ['DMSans'], serif: ['Lora'] }
    }
  },
  plugins: []
};
