module.exports = {
  content: ["./src/**/*.{js,jsx,ts,tsx}"],
  theme: {
    extend: {
      animation: {
        shine: "shine 1.5s ease-in-out infinite",
      },
      keyframes: {
        shine: {
          "0%": { transform: "translateX(-100%)", opacity: 0 },
          "50%": { opacity: 0.5 },
          "100%": { transform: "translateX(100%)", opacity: 0 },
        },
      },
    },
  },
  plugins: [],
};
