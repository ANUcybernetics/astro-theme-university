import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";
import universityTheme from "astro-theme-university";
import { astromotion, deckRemarkPlugins } from "astromotion";

const themeLight = JSON.parse(
  readFileSync(new URL("../shiki/theme-light.json", import.meta.url), "utf-8"),
);
const themeDark = JSON.parse(
  readFileSync(new URL("../shiki/theme-dark.json", import.meta.url), "utf-8"),
);

export default defineConfig({
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH,
  integrations: [
    // Every image on this site is an SVG, and Astro 7 refuses to rasterise one
    // into the theme's default webp unless `image.dangerouslyProcessSVG` lets
    // sharp loose on it. Passing them through unchanged is both the safe
    // option and the better output: these are vector hero illustrations, so
    // rasterising them was only ever a downgrade.
    universityTheme({
      llmsTxt: true,
      extraRemarkPlugins: deckRemarkPlugins,
      imageFormat: "svg",
    }),
    astromotion({
      theme: "./src/decks/theme.css",
      fontVariables: ["--font-public-sans"],
      shikiConfig: { themes: { light: themeLight, dark: themeDark }, defaultColor: false },
    }),
  ],
});
