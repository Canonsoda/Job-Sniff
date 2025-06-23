/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        dark: '#0f0f1c',
        primary: '#5f49f2',
      },
      fontFamily: {
      rubik: ['Rubik', 'sans-serif'],
    },
    },
  },
  plugins: [],
}