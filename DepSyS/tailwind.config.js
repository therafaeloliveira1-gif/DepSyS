/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        mendes: {
          red: '#e60000',
          darkRed: '#cc0000',
          lightRed: '#ff3333',
          dark: '#09090b',
          card: '#121215',
          elevated: '#18181c',
          border: '#27272a'
        }
      },
      fontFamily: {
        heading: ['Outfit', 'sans-serif'],
        sans: ['Inter', 'sans-serif'],
        mono: ['JetBrains Mono', 'monospace']
      },
      keyframes: {
        shake: {
          '0%, 100%': { transform: 'translateX(0)' },
          '20%, 60%': { transform: 'translateX(-8px)' },
          '40%, 80%': { transform: 'translateX(8px)' }
        }
      },
      animation: {
        shake: 'shake 0.4s ease-in-out'
      }
    },
  },
  plugins: [],
}
