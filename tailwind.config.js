/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        maroon: { DEFAULT: "#6B0F2B", dark: "#4A0A1E", light: "#8E1E3F" },
        gold: { DEFAULT: "#C9A227", light: "#F3D97B", dark: "#8C6E0E" },
        ivory: "#FFF9F0"
      },
      fontFamily: { display: ["Georgia", "serif"] }
    }
  },
  plugins: []
};
