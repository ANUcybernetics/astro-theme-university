import { defineConfig } from "astro/config";
import universityTheme from "astro-theme-university";

export default defineConfig({
  site: process.env.SITE_URL,
  base: process.env.BASE_PATH,
  integrations: [universityTheme({ defaultLayout: "src/layouts/PageLayout.astro" })],
});
