/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        police: {
          blue: '#1E3A8A',
          navy: '#0F172A',
          gold: '#D4AF37',
          gray: '#F8FAFC',
          slate: '#475569'
        }
      }
    },
  },
  plugins: [],
}