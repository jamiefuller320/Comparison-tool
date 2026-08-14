/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ["./src/**/*.{js,ts,jsx,tsx,mdx}"],
  theme: {
    extend: {
      fontFamily: {
        display: ["var(--font-display)", "Fraunces", "Georgia", "serif"],
        sans: ["var(--font-sans)", "Figtree", "system-ui", "sans-serif"],
      },
      colors: {
        ink: "var(--ink)",
        sea: "var(--sea)",
        foam: "var(--foam)",
        paper: "var(--paper)",
        sand: "var(--sand)",
        pin: "var(--pin)",
        coral: "var(--coral)",
      },
    },
  },
  plugins: [],
};
