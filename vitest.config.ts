import { getViteConfig } from "astro/config";
import icon from "astro-icon";

export default getViteConfig(
  {
    plugins: [
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
            return "export const fontVariables = [];\nexport const preloadFontVariables = [];\n";
          }
          return null;
        },
      },
      // Likewise stub the llms virtual module. null href matches an
      // llmsTxt: false setup, so BaseLayout emits no llms.txt <link>.
      {
        name: "test:astro-theme-university-llms-stub",
        resolveId(id: string) {
          if (id === "virtual:astro-theme-university/llms") {
            return "\0virtual:astro-theme-university/llms";
          }
          return null;
        },
        load(id: string) {
          if (id === "\0virtual:astro-theme-university/llms") {
            return "export const llmsTxtHref = null;\n";
          }
          return null;
        },
      },
      // And the images virtual module. "webp" matches the integration
      // default, so Card and Hero render the same srcset a site that never
      // sets imageFormat would get.
      {
        name: "test:astro-theme-university-images-stub",
        resolveId(id: string) {
          if (id === "virtual:astro-theme-university/images") {
            return "\0virtual:astro-theme-university/images";
          }
          return null;
        },
        load(id: string) {
          if (id === "\0virtual:astro-theme-university/images") {
            return 'export const imageFormat = "webp";\n';
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
