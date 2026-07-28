/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/pages/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/components/**/*.{js,ts,jsx,tsx,mdx}",
    "./src/app/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {
      colors: {
        /* Night canvas — user swatch */
        background: "#0F1115",
        /* Primary ink (text / icons) — kept name for codebase compatibility */
        "primary-black": "#F5F5F7",
        /* Elevated surfaces (cards, sheets, chips) */
        surface: "#1A1C21",
        "surface-2": "#2A2C33",
        /* Text on solid light CTAs */
        "ink-inverse": "#0F1115",
        /* Soft paper surfaces (buttons/banners) — less bright than #fff */
        paper: "#ececef",
        "paper-deep": "#e4e5e9",
        /* Brand accents — use sparingly */
        "brand-teal": "#3ECFCF",
        "brand-teal-strong": "#32B4B4",
        "brand-pink": "#F091B2",
      },
    },
  },
  plugins: [],
};
