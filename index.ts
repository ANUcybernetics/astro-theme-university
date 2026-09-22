import type { AstroIntegration, ImageOutputFormat } from "astro";
import { fontProviders } from "astro/config";
import type {
  RehypePlugins,
  RemarkPlugin,
  RemarkPlugins,
  ShikiConfig,
} from "@astrojs/markdown-remark";
import { unified } from "@astrojs/markdown-remark";
import mdx from "@astrojs/mdx";
import icon from "astro-icon";
import { execFile } from "node:child_process";
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { promisify } from "node:util";
import remarkDirective from "remark-directive";
import remarkSmartypants from "remark-smartypants";
import remarkCustomHeadingId from "remark-custom-heading-id";
// @ts-expect-error astro-broken-links-checker ships no type declarations
import astroBrokenLinksChecker from "astro-broken-links-checker";
import remarkCallout from "./remark-callout.js";
import {
  type CitationAttacher,
  type CitationOptions,
  createCitationPlugin,
} from "./rehype-citations.js";
import { headingAnchorPlugins } from "./markdown.js";
import remarkDefaultLayout from "./remark-default-layout.js";
import rehypeBaseLinks from "./rehype-base-links.js";
import rehypeTableWrap from "./rehype-table-wrap.js";
import { checkA11y } from "./a11y-checker.js";
import { checkTokens } from "./token-checker.js";
import { checkBaseLinks } from "./link-checker.js";
import {
  findUnroutedEntries,
  generateLlmsFullTxt,
  generateLlmsTxt,
  type LlmsEntry,
  readSiteEntries,
} from "./llms-txt.js";

export type {
  NavLink,
  SocialLink,
  ContactInfo,
  RemoteImage,
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
const emptyIconDir = fileURLToPath(new URL("./icons", import.meta.url));
const themeDeckCss = fileURLToPath(new URL("./styles/deck.css", import.meta.url));

/** The astromotion options the theme forwards when it registers the deck
 *  integration itself (`decks`). */
interface AstromotionModule {
  astromotion: (options: DeckOptions) => AstroIntegration;
  deckRemarkPlugins: RemarkPlugins;
  /** astromotion ≥ 0.30; optional so an older pin still builds (without its
   *  decks in llms.txt) rather than failing the build. */
  deckTextEntries?: (options?: { root?: string }) => Promise<LlmsEntry[]>;
}

// astromotion is an optional peer, resolved here at module load: Astro
// evaluates the config through a Vite module runner that it closes before
// integration hooks run, so a lazy import() inside a hook has nowhere to
// execute. A missing peer only matters when `decks` is set, and is reported
// there.
const astromotionModule = (await import("astromotion").catch(() => undefined)) as
  | AstromotionModule
  | undefined;

// rehype-citation is an optional peer, resolved here for the same reason as
// astromotion above. It pulls in citation-js and citeproc, so sites that never
// cite anything should not have to install it; a missing peer only matters
// when `citations` is set, and is reported there.
const rehypeCitationModule = (await import("rehype-citation").catch(() => undefined)) as
  | { default: CitationAttacher }
  | undefined;

export interface DeckOptions {
  /** Deck stylesheet. Defaults to the theme's own `styles/deck.css`; a site
   *  that layers deck CSS of its own points this at a file that imports it. */
  theme?: string;
  /** Route prefix for the injected deck pages (default: "/decks"). */
  routePrefix?: string;
  /** Check the structure of built deck pages after a production build
   *  (default: true). */
  checkStructure?: boolean;
  /** Shiki config for deck code blocks (default: astromotion's own). */
  shikiConfig?: ShikiConfig;
  /** Registered font `cssVariable`s the deck head should emit `@font-face`
   *  and preloads for (default: the theme body font when `fonts` is on). */
  fontVariables?: string[];
  /** Favicon path for deck pages, resolved against `base`. */
  favicon?: string;
  /** Default social-card image for deck pages. */
  ogImage?: string;
}

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
  /** Fail the build on `var(--at-*)` references to tokens nothing defines
   *  (default: true) */
  checkTokens?: boolean;
  /** Generate /llms.txt and /llms-full.txt from content collections and
   *  src/pages markdown (default: false) */
  llmsTxt?: boolean;
  /** Auto-register the @astrojs/mdx integration (default: true) */
  mdx?: boolean;
  /** Auto-register the astro-icon integration so consumers can use <Icon> from
   *  astro-theme-university/components/Icon.astro (default: true) */
  icon?: boolean;
  /** Auto-register the theme fonts (Public Sans + Roboto Mono) via Google (default: true) */
  fonts?: boolean;
  /** cssVariables of registered fonts that BaseLayout should preload — list
   *  fonts that are visible above the fold on most pages. Applies to the theme
   *  fonts and any fonts the site registers via the top-level `fonts` config.
   *  (default: ["--font-public-sans"], the theme body font) */
  preloadFonts?: string[];
  /** Output format for the images the theme's own components render (Card,
   *  Hero). AVIF is roughly half the bytes of WebP for the same quality but
   *  around 8x slower to encode, so it only pays off where the build caches
   *  image transforms between runs. Individual call sites can still override
   *  this with an `imageFormat` prop. An SVG source ignores all of that and is
   *  passed through unrasterised, since Astro can only rasterise one with
   *  `image.dangerouslyProcessSVG` set. (default: "webp") */
  imageFormat?: ImageOutputFormat;
  /** Module specifier(s) of brand CSS to import globally on every page,
   *  e.g. "my-university-brand/brand.css". The theme's own palette declarations
   *  are layered (`@layer at.tokens`), so unlayered brand declarations win
   *  the cascade regardless of load order. */
  brandCss?: string | string[];
  /** Register astromotion for `.deck.mdx` slide decks under `src/decks/`,
   *  with the theme's deck stylesheet and body font as defaults and the deck
   *  remark plugins appended to the theme's markdown chain. Pass an object to
   *  forward astromotion options (`routePrefix`, a custom `theme`, …).
   *  Ignored, with a warning, when
   *  the site registers astromotion itself — then it also owns the remark
   *  plugins (`extraRemarkPlugins: deckRemarkPlugins`). (default: false) */
  decks?: boolean | DeckOptions;
  /** Render pandoc-style citations --- `[@key]`, `[@a; @b]`, `@key` in text,
   *  `[-@key]` --- against a bibliography, with citeproc through a CSL style.
   *  One markdown processor serves content collections, `src/pages` and
   *  `.deck.mdx` decks, so this covers all three. Needs the optional
   *  `rehype-citation` peer installed.
   *
   *  Every file that cites something also needs a `[^ref]` marker, which is
   *  where its reference list is rendered. Without one the list is appended at
   *  the end of the document, which on a deck puts it outside the last
   *  `<section>` and so on no slide at all. */
  citations?: CitationOptions;
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
  const shouldCheckTokens = options.checkTokens !== false;
  const shouldGenerateLlmsTxt = options.llmsTxt === true;
  const shouldAddMdx = options.mdx !== false;
  const shouldAddIcon = options.icon !== false;
  const shouldAddFonts = options.fonts !== false;
  const preloadFonts = options.preloadFonts ?? ["--font-public-sans"];
  const imageFormat: ImageOutputFormat = options.imageFormat ?? "webp";

  let srcDir: string;
  let siteUrl: string;
  let basePath: string;
  // Every registered font cssVariable (theme + site + other integrations),
  // resolved in astro:config:done once the config is final.
  let registeredFontVariables: string[] = [];
  let projectRootUrl: URL | undefined;
  let cacheDirPath: string | undefined;
  // Whether decks are in the build at all — registered by `decks` or by the
  // site itself. Only then are there deck routes for llms.txt to list.
  let hasDecks = false;

  return {
    name: "astro-theme-university",
    hooks: {
      "astro:config:setup": async ({ updateConfig, config, injectRoute, injectScript, logger }) => {
        srcDir = fileURLToPath(config.srcDir);
        basePath = config.base;
        projectRootUrl = config.root;
        // Deployed page URLs live under config.base, not at the site root.
        siteUrl = new URL(config.base, config.site || "https://example.com").href;

        for (const spec of [options.brandCss ?? []].flat()) {
          injectScript("page-ssr", `import ${JSON.stringify(spec)};`);
        }

        const existingIntegrationNames = new Set(config.integrations.map((i) => i.name));
        const extraIntegrations: AstroIntegration[] = [];
        if (shouldAddMdx && !existingIntegrationNames.has("@astrojs/mdx")) {
          extraIntegrations.push(mdx());
        }
        if (shouldAddIcon && !existingIntegrationNames.has("astro-icon")) {
          // astro-icon 1.2 reports a missing default src/icons directory as a
          // warning, even when the site uses Iconify collections exclusively.
          // Preserve consumer-local icons when the directory exists; otherwise
          // load the package's tracked empty collection.
          const consumerIconDir = fileURLToPath(new URL("src/icons/", config.root));
          extraIntegrations.push(
            icon(existsSync(consumerIconDir) ? undefined : { iconDir: emptyIconDir }),
          );
        }
        let deckRemarkPlugins: RemarkPlugins = [];
        hasDecks = existingIntegrationNames.has("astromotion") || Boolean(options.decks);
        if (options.decks) {
          if (existingIntegrationNames.has("astromotion")) {
            logger.warn(
              "`decks` is set but astromotion is already registered; leaving the site's registration (and its remark plugins) in charge.",
            );
          } else {
            if (!astromotionModule) {
              throw new Error(
                'astro-theme-university: `decks` needs the astromotion package installed (pnpm add "git+https://github.com/ANUcybernetics/astromotion.git#vX.Y.Z").',
              );
            }
            const deckOptions = typeof options.decks === "object" ? options.decks : {};
            extraIntegrations.push(
              astromotionModule.astromotion({
                theme: themeDeckCss,
                ...(shouldAddFonts ? { fontVariables: ["--font-public-sans"] } : {}),
                ...deckOptions,
              }),
            );
            deckRemarkPlugins = astromotionModule.deckRemarkPlugins;
          }
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

        const citationPlugins: RehypePlugins = [];
        if (options.citations) {
          if (!rehypeCitationModule) {
            throw new Error(
              "astro-theme-university: `citations` needs the rehype-citation package installed (pnpm add rehype-citation).",
            );
          }
          citationPlugins.push(
            createCitationPlugin(rehypeCitationModule.default, options.citations),
          );
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
                // Last: each deck plugin gates on `.deck.mdx`, so ordinary
                // pages pass through untouched.
                ...deckRemarkPlugins,
              ],
              rehypePlugins: [
                ...headingAnchorPlugins,
                rehypeTableWrap,
                ...citationPlugins,
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
              lightningcss: {
                // The theme's real browser floor is set by oklch relative
                // colour syntax, which lightningcss can't downlevel and
                // ships raw — and every browser that has it also has native
                // light-dark(). Left to Vite's default conservative targets,
                // lightningcss splits each light-dark() into a
                // var(--lightningcss-light/dark) pair whose :root flip
                // declarations are only emitted next to a color-scheme
                // declaration; a stylesheet using light-dark() that loads on
                // a page without one (brand CSS on an astromotion deck page,
                // which never loads base.css) then resolves every such token
                // to invalid two-colour junk. Declaring the floor keeps
                // light-dark() native and self-contained.
                // Encoding: major << 16 | minor << 8.
                targets: {
                  chrome: 123 << 16,
                  edge: 123 << 16,
                  firefox: 128 << 16,
                  safari: (17 << 16) | (5 << 8),
                },
              },
            },
            ssr: {
              noExternal: ["@astro-community/astro-embed-youtube"],
            },
            plugins: [
              // BaseLayout renders <Font> for each of these variables so the
              // registered webfonts actually reach the page as @font-face
              // rules (registering fonts in config alone emits nothing).
              // Mirrors astromotion's virtual:astromotion/fonts pattern.
              // Covers EVERY font in the final config — the theme pair plus
              // anything the site registers itself — so site-registered fonts
              // aren't silently dropped; empty when nothing is registered so
              // the layout degrades cleanly.
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
                    // registeredFontVariables is resolved in astro:config:done;
                    // Vite only loads this module afterwards (dev request /
                    // build), so the array is final by the time we serialise.
                    const preload = preloadFonts.filter((v) => registeredFontVariables.includes(v));
                    return (
                      `export const fontVariables = ${JSON.stringify(registeredFontVariables)};\n` +
                      `export const preloadFontVariables = ${JSON.stringify(preload)};\n`
                    );
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
              // The output format Card and Hero pass to <Image>. A virtual
              // module rather than a prop threaded through every layout: the
              // components sit three or four levels below the pages that use
              // them, so a prop would have to be repeated at every call site
              // (and remembered at every new one) to change one build-wide
              // decision. Per-call-site overrides still work via the
              // `imageFormat` prop.
              {
                name: "astro-theme-university:images",
                resolveId(id: string) {
                  if (id === "virtual:astro-theme-university/images") {
                    return "\0virtual:astro-theme-university/images";
                  }
                  return null;
                },
                load(id: string) {
                  if (id === "\0virtual:astro-theme-university/images") {
                    return `export const imageFormat = ${JSON.stringify(imageFormat)};\n`;
                  }
                  return null;
                },
              },
            ],
          },
        });
      },
      "astro:config:done": ({ config, logger }) => {
        registeredFontVariables = (config.fonts ?? []).map((f) => f.cssVariable);
        // The a11y scan caches per-page results under Astro's own cacheDir
        // (node_modules/.astro by default), namespaced to this package —
        // consumers that persist that directory across CI runs (as they
        // already do for the image transform cache) get incremental scans
        // for free.
        cacheDirPath = join(fileURLToPath(config.cacheDir), "astro-theme-university");
        // Only validate an explicit preloadFonts list — the default entry is
        // legitimately absent under fonts: false.
        if (options.preloadFonts) {
          for (const cssVariable of options.preloadFonts) {
            if (!registeredFontVariables.includes(cssVariable)) {
              logger.warn(
                `preloadFonts entry "${cssVariable}" does not match any registered font cssVariable`,
              );
            }
          }
        }
      },
      "astro:build:done": async ({ dir, logger }) => {
        if (
          !shouldSearch &&
          !shouldCheckA11y &&
          !shouldCheckTokens &&
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
          // Search is on by default, so check for the consumer's own pagefind
          // bin up front (the exact thing npx will run): `npx` alone would
          // silently download an unpinned version from the registry mid-build,
          // and a failed index used to be a warning — a green build with
          // search quietly broken. (pagefind's `exports` map blocks resolving
          // its package.json, so the bin is the reliable install signal.)
          const pagefindBins = ["pagefind", "pagefind.cmd"].map((bin) =>
            fileURLToPath(new URL(`node_modules/.bin/${bin}`, projectRootUrl)),
          );
          if (projectRootUrl && !pagefindBins.some((bin) => existsSync(bin))) {
            throw new Error(
              "search is enabled but pagefind is not installed. " +
                "Add pagefind as a devDependency, or pass `search: false` to universityTheme().",
            );
          }
          await execFileAsync("npx", ["pagefind", "--site", distPath]);
          logger.info("Search index built.");
        }

        if (shouldCheckA11y) {
          const { checked, reused, violations } = await checkA11y(distPath, cacheDirPath);
          if (violations.length === 0) {
            const reuse = reused > 0 ? ` (${reused} unchanged, reused from cache)` : "";
            logger.info(`Checked ${checked} pages${reuse} — no accessibility violations.`);
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

        if (shouldCheckTokens) {
          const { checked, violations } = await checkTokens(distPath);
          if (violations.length === 0) {
            logger.info(`Checked ${checked} style files — every theme token resolves.`);
          } else {
            const lines = violations
              .slice(0, 30)
              .map(
                (v) => `  ${v.file}: var(${v.token}) is not defined by the theme or brand layer`,
              );
            if (violations.length > 30) lines.push(`  ... and ${violations.length - 30} more`);
            throw new Error(
              `Found ${violations.length} undefined theme token reference(s). ` +
                `A var(--at-*) fallback silently replaces the token with a literal that no longer ` +
                `follows the colour scheme, so this is checked rather than allowed to degrade. ` +
                `Use a token the theme defines, or your own prefix for your own variables:\n${lines.join("\n")}`,
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

        if (shouldGenerateLlmsTxt) {
          const entries = await readSiteEntries(srcDir);

          // Decks are injected routes fed from src/decks, so the content
          // collector cannot see them. astromotion pairs each deck's readable
          // text with the URL it builds at; its `published: false` and
          // `unlisted: true` decks are already filtered out, the same keys the
          // content collector filters on.
          if (hasDecks && astromotionModule?.deckTextEntries && projectRootUrl) {
            entries.push(
              ...(await astromotionModule.deckTextEntries({
                root: fileURLToPath(projectRootUrl),
              })),
            );
          }

          // Entry URLs come from source file paths, not the router — catch
          // the drift where a markdown file exists but no route renders it.
          const unrouted = findUnroutedEntries(distPath, entries);
          if (unrouted.length > 0) {
            const lines = unrouted.slice(0, 30).map((url) => `  ${url}`);
            if (unrouted.length > 30) lines.push(`  ... and ${unrouted.length - 30} more`);
            throw new Error(
              `Found ${unrouted.length} llms.txt entr${unrouted.length === 1 ? "y" : "ies"} with no built page in dist (every markdown file under src/content or src/pages, and every deck under src/decks, must be rendered at the URL its path implies):\n${lines.join("\n")}`,
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
