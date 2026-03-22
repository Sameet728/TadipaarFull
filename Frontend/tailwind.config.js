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
          blue:  '#1E3A8A',
          navy:  '#0F172A',
          gold:  '#D4AF37',
          gray:  '#F8FAFC',
          slate: '#475569',
          // keep numeric scale so existing components don't break
          900: '#0F172A',
          800: '#1b2838',
          700: '#1e3a5f',
          600: '#1E3A8A',
          500: '#1976D2',
          400: '#42A5F5',
        }
      }
    },
  },
  plugins: [],
}
