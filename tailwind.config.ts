import type { Config } from "tailwindcss";

// Design tokens for the LinkedIn Growth Agent.
// Palette: matches LinkedIn's own brand colors — LinkedIn Blue for the
// accent (still keyed as `brass` throughout the app; only the hex values
// changed, not the token names, so no component needed to change), near-
// black/gray for text, and LinkedIn's actual feed gray for the page
// background with white for raised cards/inputs.
const config: Config = {
  content: ["./app/**/*.{ts,tsx}", "./components/**/*.{ts,tsx}"],
  theme: {
    extend: {
      colors: {
        ink: {
          950: "#000000",
          900: "#191919",
          700: "#38434F",
          500: "#666666",
          300: "#A6A6A6",
          100: "#E0DFDC",
        },
        paper: {
          DEFAULT: "#F3F2EF",
          raised: "#FFFFFF",
        },
        brass: {
          600: "#004182",
          500: "#0A66C2",
          400: "#378FE9",
          100: "#EBF4FD",
        },
        signal: {
          good: "#057642",
          warn: "#915907",
          bad: "#CC1016",
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
