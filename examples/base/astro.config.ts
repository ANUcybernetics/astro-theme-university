import { defineConfig, fontProviders } from "astro/config";
import universityTheme from "astro-theme-university";

export default defineConfig({
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH,
  // A site-registered font on top of the theme pair; the example build test
  // asserts the theme emits and preloads it (site-registered fonts used to be
  // silently dropped by BaseLayout).
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
      preloadFonts: ["--font-public-sans", "--font-lora"],
    }),
  ],
});
