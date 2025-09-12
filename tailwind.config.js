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
      // 新增：优化全局无衬线字体栈，兼顾中英文字体与表情符号
      fontFamily: {
        sans: [
          'Inter var',
          'Inter',
          '-apple-system',
          'BlinkMacSystemFont',
          'Segoe UI',
          'Roboto',
          'Helvetica Neue',
          'Arial',
          'Noto Sans',
          'PingFang SC',
          'Hiragino Sans GB',
          'Microsoft YaHei',
          'sans-serif',
          'Apple Color Emoji',
          'Segoe UI Emoji',
          'Noto Color Emoji',
        ],
      },
    },
  },
  plugins: [],
}