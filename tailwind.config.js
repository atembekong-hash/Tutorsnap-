const { themeColors } = require("./theme.config");
const plugin = require("tailwindcss/plugin");

const tailwindColors = Object.fromEntries(
  Object.entries(themeColors).map(([name, swatch]) => [
    name,
    {
      DEFAULT: `var(--color-${name})`,
      light: swatch.light,
      dark: swatch.dark,
    },
  ]),
);

/** @type {import('tailwindcss').Config} */
module.exports = {
  // Use data-theme attribute for dark mode — matches ThemeProvider's root.dataset.theme assignment
  darkMode: ["selector", '[data-theme="dark"]'],
  // Scan all component and app files for Tailwind classes
  content: ["./app/**/*.{js,ts,tsx}", "./components/**/*.{js,ts,tsx}", "./lib/**/*.{js,ts,tsx}", "./hooks/**/*.{js,ts,tsx}"],

  presets: [require("nativewind/preset")],
  theme: {
    extend: {
      colors: tailwindColors,
      // Scale spacing by 1.4× so p-4, m-2, gap-3, etc. are 40% larger
      spacing: {
        "0.5": "0.175rem",
        "1":   "0.35rem",
        "1.5": "0.525rem",
        "2":   "0.7rem",
        "2.5": "0.875rem",
        "3":   "1.05rem",
        "3.5": "1.225rem",
        "4":   "1.4rem",
        "5":   "1.75rem",
        "6":   "2.1rem",
        "7":   "2.45rem",
        "8":   "2.8rem",
        "9":   "3.15rem",
        "10":  "3.5rem",
        "11":  "3.85rem",
        "12":  "4.2rem",
        "14":  "4.9rem",
        "16":  "5.6rem",
        "20":  "7rem",
        "24":  "8.4rem",
        "28":  "9.8rem",
        "32":  "11.2rem",
        "36":  "12.6rem",
        "40":  "14rem",
        "44":  "15.4rem",
        "48":  "16.8rem",
        "56":  "19.6rem",
        "64":  "22.4rem",
        "72":  "25.2rem",
        "80":  "28rem",
        "96":  "33.6rem",
      },
      // Scale font sizes by 1.4×
      fontSize: {
        xs:   ["0.98rem",  { lineHeight: "1.4rem"  }],
        sm:   ["1.225rem", { lineHeight: "1.75rem" }],
        base: ["1.4rem",   { lineHeight: "2.1rem"  }],
        lg:   ["1.575rem", { lineHeight: "2.275rem"}],
        xl:   ["1.75rem",  { lineHeight: "2.45rem" }],
        "2xl":["2.1rem",   { lineHeight: "2.8rem"  }],
        "3xl":["2.66rem",  { lineHeight: "3.15rem" }],
        "4xl":["3.15rem",  { lineHeight: "3.5rem"  }],
        "5xl":["4.2rem",   { lineHeight: "1"       }],
        "6xl":["5.04rem",  { lineHeight: "1"       }],
      },
      borderRadius: {
        sm:   "0.28rem",
        DEFAULT: "0.56rem",
        md:   "0.84rem",
        lg:   "1.12rem",
        xl:   "1.68rem",
        "2xl":"2.24rem",
        "3xl":"3.36rem",
        full: "9999px",
      },
    },
  },
  plugins: [
    plugin(({ addVariant }) => {
      addVariant("light", ':root:not([data-theme="dark"]) &');
      addVariant("dark", ':root[data-theme="dark"] &');
    }),
  ],
};
