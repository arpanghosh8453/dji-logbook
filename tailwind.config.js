/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // DJI-inspired color scheme
        dji: {
          primary: '#00A0DC',
          secondary: '#1a1a2e',
          accent: '#00D4AA',
          dark: '#0f0f1a',
          surface: '#16213e',
          muted: '#4a4e69',
        },
      },
      animation: {
        'pulse-slow': 'pulse 3s cubic-bezier(0.4, 0, 0.6, 1) infinite',
      },
    },
  },
  plugins: [],
}
