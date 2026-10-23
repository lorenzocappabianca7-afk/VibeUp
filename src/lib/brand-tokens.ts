import tailwindConfig from "../../tailwind.config.js";

type ThemeColors = {
  background: string;
  "primary-black": string;
  surface: string;
  "surface-2": string;
  "ink-inverse": string;
  paper: string;
  "brand-teal": string;
  "brand-pink": string;
};

const colors = (
  tailwindConfig as { theme: { extend: { colors: ThemeColors } } }
).theme.extend.colors;

/** Colors from tailwind.config.js, available before globals.css loads. */
export const brandTokens = {
  background: colors.background,
  text: colors["primary-black"],
  surface: colors.surface,
  surface2: colors["surface-2"],
  ink: colors["ink-inverse"],
  paper: colors.paper,
  teal: colors["brand-teal"],
  pink: colors["brand-pink"],
} as const;
