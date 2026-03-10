/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      colors: {
        'kumaran-red': '#e31e24', // Matching the shop sign
      },
    },
  },
  plugins: [],
}