/** @type {import('tailwindcss').Config} */

export default {
  darkMode: "class",
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    container: {
      center: true,
    },
    extend: {
      colors: {
        wood: '#8B6914',
        cream: '#FFF8E7',
        bark: '#3E2723',
        ochre: '#C75B39',
        sand: '#F5E6C8',
      },
      fontFamily: {
        display: ['Playfair Display', 'serif'],
        body: ['Noto Sans SC', 'sans-serif'],
      },
    },
  },
  plugins: [],
};
