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
        sand: "var(--sand)",
        coral: "var(--coral)",
      },
    },
  },
  plugins: [],
};
