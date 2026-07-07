import type { AstroIntegration } from "astro";
import { fontProviders } from "astro/config";
import type { RemarkPlugin, RemarkPlugins, RehypePlugins } from "@astrojs/markdown-remark";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import svelte from "@astrojs/svelte";
import icon from "astro-icon";
import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import remarkDirective from "remark-directive";
import remarkSmartypants from "remark-smartypants";
import remarkCustomHeadingId from "remark-custom-heading-id";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
// @ts-expect-error astro-broken-links-checker ships no type declarations
import astroBrokenLinksChecker from "astro-broken-links-checker";
import remarkCallout from "./remark-callout.js";
import remarkDefaultLayout from "./remark-default-layout.js";
import rehypeBaseLinks from "./rehype-base-links.js";
import { checkA11y } from "./a11y-checker.js";
import { checkBaseLinks } from "./link-checker.js";
import { checkDecks, countSourceDecks } from "./deck-checker.js";
import {
  readSiteEntries,
  generateLlmsTxt,
  generateLlmsFullTxt,
  findUnroutedEntries,
} from "./llms-txt.js";

export type {
  NavLink,
  SocialLink,
  ContactInfo,
  SiteConfig,
  SidebarItem,
  SidebarSection,
} from "./types.js";
export { defineSiteConfig } from "./types.js";

const themeLight = JSON.parse(
  readFileSync(new URL("./shiki/theme-light.json", import.meta.url), "utf-8"),
);
const themeDark = JSON.parse(
  readFileSync(new URL("./shiki/theme-dark.json", import.meta.url), "utf-8"),
);

const execFileAsync = promisify(execFile);

export interface ThemeOptions {
  /** Site name displayed in the header and meta tags */
  name?: string;
  /** Default layout for MDX pages without an explicit layout in frontmatter.
   *  Path relative to the project root, e.g. "src/layouts/PageLayout.astro". */
  defaultLayout?: string;
  /** Build a Pagefind search index after build (default: true) */
  search?: boolean;
  /** Check for broken internal links after build (default: true) */
  checkLinks?: boolean;
  /** Check for accessibility violations after build (default: true) */
  checkA11y?: boolean;
  /** Check deck slide structure after build (default: true) */
  checkDecks?: boolean;
  /** Generate /llms.txt and /llms-full.txt from content collections and
   *  src/pages markdown (default: false) */
  llmsTxt?: boolean;
  /** Auto-register the @astrojs/svelte integration (default: true) */
  svelte?: boolean;
  /** Auto-register the @astrojs/mdx integration (default: true) */
  mdx?: boolean;
  /** Auto-register the astro-icon integration so consumers can use <Icon> from
   *  astro-theme-university/components/Icon.astro (default: true) */
  icon?: boolean;
  /** Auto-register the theme fonts (Public Sans + Roboto Mono) via Google (default: true) */
  fonts?: boolean;
  /** Module specifier(s) of brand CSS to import globally on every page,
   *  e.g. "astro-theme-anu/anu.css". The theme's own palette declarations
   *  are layered (`@layer at.tokens`), so unlayered brand declarations win
   *  the cascade regardless of load order. */
  brandCss?: string | string[];
  /** Extra remark plugins to run BEFORE the theme's default list — e.g. a topic
   *  splicer whose output must then flow through the theme's directive plugins
   *  (custom heading ids, callouts). */
  extraRemarkPluginsBefore?: RemarkPlugins;
  /** Extra remark plugins to append to the theme's default list. */
  extraRemarkPlugins?: RemarkPlugins;
  /** Extra rehype plugins to append to the theme's default list. */
  extraRehypePlugins?: RehypePlugins;
}

export default function universityTheme(options: ThemeOptions = {}): AstroIntegration {
  const shouldSearch = options.search !== false;
  const shouldCheckLinks = options.checkLinks !== false;
  const shouldCheckA11y = options.checkA11y !== false;
  const shouldCheckDecks = options.checkDecks !== false;
  const shouldGenerateLlmsTxt = options.llmsTxt === true;
  const shouldAddSvelte = options.svelte !== false;
  const shouldAddMdx = options.mdx !== false;
  const shouldAddIcon = options.icon !== false;
  const shouldAddFonts = options.fonts !== false;

  let srcDir: string;
  let siteUrl: string;
  let basePath: string;

  return {
    name: "astro-theme-university",
    hooks: {
      "astro:config:setup": ({ updateConfig, config, injectRoute, injectScript, logger }) => {
        srcDir = fileURLToPath(config.srcDir);
        basePath = config.base;
        // Deployed page URLs live under config.base, not at the site root.
        siteUrl = new URL(config.base, config.site || "https://example.com").href;

        for (const spec of [options.brandCss ?? []].flat()) {
          injectScript("page-ssr", `import ${JSON.stringify(spec)};`);
        }

        const existingIntegrationNames = new Set(config.integrations.map((i) => i.name));
        const extraIntegrations: AstroIntegration[] = [];
        if (shouldAddSvelte && !existingIntegrationNames.has("@astrojs/svelte")) {
          extraIntegrations.push(svelte());
        }
        if (shouldAddMdx && !existingIntegrationNames.has("@astrojs/mdx")) {
          extraIntegrations.push(mdx());
        }
        if (shouldAddIcon && !existingIntegrationNames.has("astro-icon")) {
          extraIntegrations.push(icon());
        }
        if (shouldCheckLinks) {
          extraIntegrations.push(
            astroBrokenLinksChecker({
              throwError: true,
              checkExternalLinks: false,
            }),
          );
        }
        if (extraIntegrations.length > 0) {
          updateConfig({ integrations: extraIntegrations });
        }

        if (shouldAddFonts) {
          const existingFontNames = new Set(
            (config.fonts ?? []).map((f: { name: string }) => f.name),
          );
          const themeFonts = [
            {
              name: "Public Sans",
              cssVariable: "--font-public-sans",
              provider: fontProviders.google(),
              // Variable font: one file per style covers every weight the
              // styles use (400 body, 600 headings, 700 strong). Without
              // this Astro defaults to weight 400 only and browsers fake
              // the rest with synthetic bold.
              weights: ["100 900"] as [string, ...string[]],
            },
            {
              name: "Roboto Mono",
              cssVariable: "--font-roboto-mono",
              provider: fontProviders.google(),
              weights: ["400", "700"] as [string, ...string[]],
              styles: ["normal"] as ["normal", ...("normal" | "italic" | "oblique")[]],
              fallbacks: ["monospace"],
            },
          ].filter((f) => !existingFontNames.has(f.name));
          if (themeFonts.length > 0) {
            updateConfig({ fonts: themeFonts });
          }
        }

        if (options.defaultLayout) {
          const layoutUrl = new URL(options.defaultLayout, config.root);
          if (!existsSync(fileURLToPath(layoutUrl))) {
            logger.warn(
              `defaultLayout "${options.defaultLayout}" does not exist at ${fileURLToPath(
                layoutUrl,
              )}`,
            );
          }
        }

        const pagesDir = fileURLToPath(new URL("pages", config.srcDir));
        const has404 = ["404.astro", "404.md", "404.mdx"].some((f) =>
          existsSync(join(pagesDir, f)),
        );
        if (!has404) {
          injectRoute({
            pattern: "/404",
            entrypoint: "astro-theme-university/pages/404.astro",
          });
        }

        updateConfig({
          markdown: {
            processor: unified({
              remarkPlugins: [
                ...(options.extraRemarkPluginsBefore ?? []),
                remarkCustomHeadingId,
                remarkDirective,
                [remarkSmartypants as RemarkPlugin, { dashes: "oldschool" }],
                remarkCallout,
                ...(options.defaultLayout
                  ? [
                      [
                        remarkDefaultLayout,
                        {
                          layoutPath: fileURLToPath(new URL(options.defaultLayout, config.root)),
                        },
                      ] as [RemarkPlugin, unknown],
                    ]
                  : []),
                ...(options.extraRemarkPlugins ?? []),
              ],
              rehypePlugins: [
                rehypeSlug,
                [
                  rehypeAutolinkHeadings,
                  {
                    behavior: "append",
                    properties: { class: "at-heading-anchor", ariaHidden: "true", tabIndex: -1 },
                    content: {
                      type: "text",
                      value: "#",
                    },
                  },
                ],
                ...(options.extraRehypePlugins ?? []),
                // Last, so links produced by consumer rehype plugins are
                // rewritten too. No-op when base is "/".
                [rehypeBaseLinks, { base: config.base }],
              ],
            }),
            shikiConfig: {
              themes: {
                light: themeLight,
                dark: themeDark,
              },
              defaultColor: false,
            },
          },
          vite: {
            css: {
              transformer: "lightningcss",
            },
            ssr: {
              noExternal: ["@astro-community/astro-embed-youtube"],
            },
            plugins: [
              // BaseLayout renders <Font> for each of these variables so the
              // registered webfonts actually reach the page as @font-face
              // rules (registering fonts in config alone emits nothing).
              // Mirrors astromotion's virtual:astromotion/fonts pattern;
              // empty when fonts: false so the layout degrades cleanly.
              {
                name: "astro-theme-university:fonts",
                resolveId(id: string) {
                  if (id === "virtual:astro-theme-university/fonts") {
                    return "\0virtual:astro-theme-university/fonts";
                  }
                  return null;
                },
                load(id: string) {
                  if (id === "\0virtual:astro-theme-university/fonts") {
                    const fontVariables = shouldAddFonts
                      ? ["--font-public-sans", "--font-roboto-mono"]
                      : [];
                    return `export const fontVariables = ${JSON.stringify(fontVariables)};\n`;
                  }
                  return null;
                },
              },
              // Advertises the generated /llms.txt to agent visitors via a
              // <link rel="alternate" type="text/markdown"> in every page head.
              // Only set when llmsTxt generation is on, so the link never points
              // at a file that wasn't built (which would also trip the link
              // checker). base-path-aware: the file lands at the dist root,
              // served under config.base.
              {
                name: "astro-theme-university:llms",
                resolveId(id: string) {
                  if (id === "virtual:astro-theme-university/llms") {
                    return "\0virtual:astro-theme-university/llms";
                  }
                  return null;
                },
                load(id: string) {
                  if (id === "\0virtual:astro-theme-university/llms") {
                    const llmsTxtHref = shouldGenerateLlmsTxt
                      ? `${basePath.replace(/\/?$/, "/")}llms.txt`
                      : null;
                    return `export const llmsTxtHref = ${JSON.stringify(llmsTxtHref)};\n`;
                  }
                  return null;
                },
              },
            ],
          },
        });
      },
      "astro:build:done": async ({ dir, logger }) => {
        if (
          !shouldSearch &&
          !shouldCheckA11y &&
          !shouldCheckDecks &&
          !shouldCheckLinks &&
          !shouldGenerateLlmsTxt
        )
          return;
        let distPath: string;
        try {
          distPath = dir instanceof URL ? fileURLToPath(dir) : String(dir);
        } catch (e) {
          logger.error(`Post-build checks failed: ${e}`);
          return;
        }

        if (shouldSearch) {
          try {
            await execFileAsync("npx", ["pagefind", "--site", distPath]);
            logger.info("Search index built.");
          } catch (e) {
            logger.warn(`Search index failed: ${e}`);
          }
        }

        if (shouldCheckA11y) {
          const { checked, violations } = await checkA11y(distPath);
          if (violations.length === 0) {
            logger.info(`Checked ${checked} pages — no accessibility violations.`);
          } else {
            const lines = violations.slice(0, 30).map((v) => {
              const docUrl = `https://dequeuniversity.com/rules/axe/4.11/${v.id}`;
              return `  ${v.page}: ${v.id} (${v.impact}) — ${v.description}\n    ${docUrl}`;
            });
            if (violations.length > 30) lines.push(`  ... and ${violations.length - 30} more`);
            throw new Error(
              `Found ${violations.length} accessibility violation(s):\n${lines.join("\n")}`,
            );
          }
        }

        // The generic broken-links pass checks dist/ file paths, which don't
        // include the base — an un-prefixed internal link passes it locally
        // while 404ing under the deployed sub-path. Catch that class here.
        if (shouldCheckLinks && basePath && basePath !== "/") {
          const { checked, violations } = await checkBaseLinks(distPath, basePath);
          if (violations.length === 0) {
            logger.info(`Checked ${checked} pages — all internal links respect base.`);
          } else {
            const lines = violations
              .slice(0, 30)
              .map((v) => `  ${v.page}: ${v.link} escapes base "${basePath}"`);
            if (violations.length > 30) lines.push(`  ... and ${violations.length - 30} more`);
            throw new Error(
              `Found ${violations.length} link(s) outside the configured base path (root-absolute links are always site-internal; use a full URL for same-domain pages outside the base):\n${lines.join("\n")}`,
            );
          }
        }

        if (shouldCheckDecks) {
          const { checked, violations } = await checkDecks(distPath);
          if (violations.length === 0) {
            if (checked === 0) {
              // Zero decks found and zero violations look identical in the
              // happy-path log, so distinguish "site has no decks" from "the
              // decks didn't surface in dist" — the latter means the checks
              // silently ran on nothing.
              const sourceDecks = await countSourceDecks(srcDir);
              if (sourceDecks > 0) {
                logger.warn(
                  `Found ${sourceDecks} source deck(s) under srcDir but no built deck pages (.reveal slides) in dist — deck structure checks did not run. Check the deck route configuration.`,
                );
              } else {
                logger.info("Checked 0 decks — none found.");
              }
            } else {
              logger.info(`Checked ${checked} deck(s) — no structural violations.`);
            }
          } else {
            const lines = violations
              .slice(0, 30)
              .map((v) => `  ${v.page}: ${v.rule} — ${v.detail}`);
            if (violations.length > 30) lines.push(`  ... and ${violations.length - 30} more`);
            throw new Error(`Found ${violations.length} deck violation(s):\n${lines.join("\n")}`);
          }
        }

        if (shouldGenerateLlmsTxt) {
          const entries = await readSiteEntries(srcDir);

          // Entry URLs come from source file paths, not the router — catch
          // the drift where a markdown file exists but no route renders it.
          const unrouted = findUnroutedEntries(distPath, entries);
          if (unrouted.length > 0) {
            const lines = unrouted.slice(0, 30).map((url) => `  ${url}`);
            if (unrouted.length > 30) lines.push(`  ... and ${unrouted.length - 30} more`);
            throw new Error(
              `Found ${unrouted.length} llms.txt entr${unrouted.length === 1 ? "y" : "ies"} with no built page in dist (each markdown file under src/content or src/pages must be rendered at the URL its path implies):\n${lines.join("\n")}`,
            );
          }

          const preamblePath = join(srcDir, "llms.md");
          const preamble = existsSync(preamblePath)
            ? readFileSync(preamblePath, "utf-8")
            : undefined;
          const llmsTxtOptions = {
            siteName: options.name || "Site",
            siteUrl,
            preamble,
          };
          writeFileSync(join(distPath, "llms.txt"), generateLlmsTxt(llmsTxtOptions, entries));
          writeFileSync(
            join(distPath, "llms-full.txt"),
            generateLlmsFullTxt(llmsTxtOptions, entries),
          );
          logger.info(`Generated llms.txt and llms-full.txt (${entries.length} entries).`);
        }
      },
    },
  };
}
