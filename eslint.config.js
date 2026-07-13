// https://docs.expo.dev/guides/using-eslint/
import { defineConfig } from "eslint/config";
import expoConfig from "eslint-config-expo/flat.js";

export default defineConfig([
  expoConfig,
  {
    ignores: ["dist/*"],
  },
  {
    rules: {
      // React Native <Text> handles quotes/apostrophes natively; this rule is for web HTML only
      "react/no-unescaped-entities": "off",
      // Allow unused vars prefixed with _ and common patterns (Platform, type imports, catch vars)
      "@typescript-eslint/no-unused-vars": ["warn", {
        argsIgnorePattern: "^_",
        varsIgnorePattern: "^_|^Platform$|^Alert$|^Animated$|^BackHandler$|^View$",
        caughtErrorsIgnorePattern: "^_|^e$",
      }],
    },
  },
]);
