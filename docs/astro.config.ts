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
    universityTheme({ llmsTxt: true, extraRemarkPlugins: deckRemarkPlugins }),
    astromotion({
      theme: "./src/decks/theme.css",
      fontVariables: ["--font-public-sans"],
      shikiConfig: { themes: { light: themeLight, dark: themeDark }, defaultColor: false },
    }),
  ],
});
