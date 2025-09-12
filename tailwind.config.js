/** @type {import('tailwindcss').Config} */
export default {
  content: [
    './index.html',
    './src/**/*.{ts,tsx}',
  ],
  theme: {
    extend: {
      colors: {
        csgo: {
          bg: '#1A1A1A',
          panel: '#2C2C2C',
          blue: '#00A2FF',
          orange: '#FF9900',
        },
        rarity: {
          blue: '#4B69FF',
          purple: '#8847FF',
          pink: '#D32CE6',
          red: '#EB4B4B',
          gold: '#FFD700',
        },
      },
    },
  },
  plugins: [],
}