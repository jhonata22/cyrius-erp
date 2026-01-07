/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        // Cores do seu design
        primary: {
          light: '#F6993F', // Laranja
          dark: '#2D2E5F',  // Roxo Escuro
        },
        status: {
          green: '#2ecc71',
          orange: '#f39c12',
          red: '#e74c3c',
        }
      }
    },
  },
  plugins: [],
}