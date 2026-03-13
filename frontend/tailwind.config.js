/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,jsx}"],
  theme: {
    extend: {
      colors: {
        slate: {
          950: "#050816",
        },
        ink: "#0b1220",
        panel: "#111a2b",
        panelSoft: "#172235",
        line: "#24324a",
        success: "#34d399",
        warning: "#fbbf24",
        danger: "#f87171",
        info: "#60a5fa",
      },
      boxShadow: {
        panel: "0 28px 80px rgba(0, 0, 0, 0.28)",
      },
      backgroundImage: {
        "fraud-gradient":
          "radial-gradient(circle at top left, rgba(96,165,250,0.18), transparent 24%), radial-gradient(circle at top right, rgba(52,211,153,0.14), transparent 18%), linear-gradient(180deg, #070c18 0%, #0b1220 100%)",
      },
    },
  },
  plugins: [],
};
