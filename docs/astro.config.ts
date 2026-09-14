import { defineConfig } from "astro/config";
import { readFileSync } from "node:fs";
import universityTheme from "astro-theme-university";

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
    universityTheme({
      llmsTxt: true,
      decks: {
        shikiConfig: { themes: { light: themeLight, dark: themeDark }, defaultColor: false },
      },
    }),
  ],
});
