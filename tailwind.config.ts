import type { Config } from "tailwindcss";

// Design tokens for the LinkedIn Growth Agent.
// Palette: a "professional workshop" feel — deep ink for authority/focus,
// a warm brass accent (evokes a printed business card / professional stamp,
// not a generic SaaS gradient), and a calm paper background for the
// research/writing screens where the user reads and edits a lot of text.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#12161C",
          900: "#1B212B",
          700: "#3A4353",
          500: "#5C6675",
          300: "#9AA3B0",
          100: "#E4E7EC",
        },
        paper: {
          DEFAULT: "#F7F5F0",
          raised: "#FFFFFF",
        },
        brass: {
          600: "#8A6A2F",
          500: "#A9823D",
          400: "#C6A15C",
          100: "#F1E6CC",
        },
        signal: {
          good: "#2F6F4E",
          warn: "#B4772B",
          bad: "#B4462F",
        },
      },
      fontFamily: {
        display: ["'Fraunces'", "serif"],
        body: ["'Inter'", "sans-serif"],
      },
      maxWidth: {
        prose: "68ch",
      },
      borderRadius: {
        card: "10px",
      },
    },
  },
  plugins: [],
};

export default config;
