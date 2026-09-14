# Example university site

A site built on the `astro-theme-university` Astro theme. `README.md` describes
the layout and commands; this file holds the conventions.

- Prefer MDX over `.astro` for pages that are mostly prose. MDX pages get
  `src/layouts/PageLayout.astro` automatically (the `defaultLayout` option), so
  they carry frontmatter and content only; `heroTitle` and `heroImage` (a
  `/src/assets/...` path) add a hero. Use `.astro` for programmatic pages such
  as listings and dynamic routes.
- Content pages live in `src/content/pages/` and are validated against
  `src/content.config.ts`. The schema uses `passthrough: true`, so extra
  frontmatter fields are allowed; remove it to enforce strict validation.
- Import `defineSiteConfig` from `astro-theme-university/types`, not the package
  root, so `site-config.ts` stays free of the integration code.
- Callouts are container directives in markdown (`:::info`, `:::tip`,
  `:::warning`, `:::error`); no import needed.
- Theme layouts and components import from `astro-theme-university/layouts/*`
  and `astro-theme-university/components/*`. Style overrides go in a CSS file
  imported from `PageLayout.astro`; the theme's tokens sit in `@layer`, so
  unlayered overrides win without `!important`.
- `pnpm build` runs axe accessibility and broken-link checks and fails on
  either; fix the finding rather than disabling the check.
- `astro dev` runs as a background daemon: `astro dev --background`, then
  `astro dev status | logs | stop`.
