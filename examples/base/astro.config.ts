import { defineConfig, fontProviders } from "astro/config";
import universityTheme from "astro-theme-university";

export default defineConfig({
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH,
  // Fonts registered here are emitted alongside the theme's own pair (Public
  // Sans and Roboto Mono). Lora shows the pattern: register it, then use
  // `var(--font-lora)` in your CSS and list it in `preloadFonts` if it's
  // above the fold. Delete both if you don't need a third font.
  fonts: [
    {
      name: "Lora",
      cssVariable: "--font-lora",
      provider: fontProviders.google(),
      weights: ["400"],
      styles: ["normal"],
      fallbacks: ["serif"],
    },
  ],
  integrations: [
    universityTheme({
      defaultLayout: "src/layouts/PageLayout.astro",
      // Generates /llms.txt from src/llms.md plus the page index.
      llmsTxt: true,
      preloadFonts: ["--font-public-sans", "--font-lora"],
      // Registers astromotion for src/decks/*.deck.mdx, with the theme's
      // deck stylesheet as the default theme.
      decks: true,
    }),
  ],
});
