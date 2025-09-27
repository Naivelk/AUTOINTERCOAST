export default {
  content: [
    "./index.html",
    "./index.tsx",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
    "./screens/**/*.{js,ts,jsx,tsx}",
    "./services/**/*.{js,ts,jsx,tsx}" // 👈 Necesario para incluir estilos usados en generación PDF
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
