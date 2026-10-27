import type { Config } from "tailwindcss";

// Яркая палитра: зелёный и мята (главные кнопки), циан и небо (акценты), тёмный сине-бирюзовый фон.
const config: Config = {
  darkMode: "class",
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}", "./lib/**/*.{ts,tsx}"],
  theme: {
    extend: {
      fontFamily: { sans: ["var(--font-inter)", "system-ui", "sans-serif"] },
      colors: {
        ink: { 950: "#06141f", 900: "#0a1c2c", 800: "#0e2233", 700: "#143049" },
        brand: { 400: "#55dff3", 500: "#22d8f0", 600: "#1cb0f6", violet: "#1899d6" },
        emerald: { 300: "#a6e86b", 400: "#8bdd36", 500: "#58cc02", 600: "#46a302", 700: "#3a8602", 900: "#1b3a00" },
        violet: { 100: "#d9f7fc", 200: "#b6f0f9", 300: "#8fe9f7", 400: "#55dff3", 500: "#22d8f0", 600: "#12b8d4", 700: "#0e92aa", 800: "#0c6f82", 900: "#0b3b57" },
      },
      borderRadius: { xl2: "20px" },
      boxShadow: { soft: "0 10px 40px -12px rgba(5,20,40,.55)", glow: "0 0 40px -8px rgba(34,216,240,.5)" },
    },
  },
  plugins: [],
};
export default config;
