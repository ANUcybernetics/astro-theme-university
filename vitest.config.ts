import { getViteConfig } from "astro/config";
import { svelte } from "@sveltejs/vite-plugin-svelte";
import icon from "astro-icon";

export default getViteConfig(
  {
    plugins: [
      svelte(),
      // Container tests render BaseLayout outside the integration, so the
      // fonts virtual module (normally provided by universityTheme()) is
      // stubbed empty — no <Font> rendering, matching a fonts: false setup.
      {
        name: "test:astro-theme-university-fonts-stub",
        resolveId(id: string) {
          if (id === "virtual:astro-theme-university/fonts") {
            return "\0virtual:astro-theme-university/fonts";
          }
          return null;
        },
        load(id: string) {
          if (id === "\0virtual:astro-theme-university/fonts") {
            return "export const fontVariables = [];\n";
          }
          return null;
        },
      },
    ],
    test: {
      server: {
        deps: {
          inline: ["@astro-community/astro-embed-youtube", "lite-youtube-embed"],
        },
      },
    },
  },
  // Run astro-icon's integration during tests so component tests that import
  // from astro-icon/components can resolve the `virtual:astro-icon` module.
  { integrations: [icon()] },
);
