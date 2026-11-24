/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        bg: {
          dark: '#05070D',
          navy: '#080F1E',
          secondary: '#101A2C',
          card: 'rgba(16, 26, 44, 0.7)',
        },
        cyber: {
          cyan: '#00E5FF',
          blue: '#2979FF',
          purple: '#9D4EDD',
          green: '#00F5A0',
          yellow: '#FFD166',
          red: '#FF3864',
        }
      },
      boxShadow: {
        'cyan-glow': '0 0 15px rgba(0, 229, 255, 0.35)',
        'blue-glow': '0 0 15px rgba(41, 121, 255, 0.35)',
        'purple-glow': '0 0 15px rgba(157, 78, 221, 0.35)',
        'red-glow': '0 0 15px rgba(255, 56, 100, 0.4)',
        'green-glow': '0 0 15px rgba(0, 245, 160, 0.35)',
      },
      fontFamily: {
        mono: ['Fira Code', 'JetBrains Mono', 'Consolas', 'monospace'],
        display: ['Rajdhani', 'Orbitron', 'Inter', 'sans-serif'],
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'spin-slow': 'spin 12s linear infinite',
      }
    },
  },
  plugins: [],
}
