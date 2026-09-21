# Example university site

A starter site built with [Astro](https://astro.build) and
[astro-theme-university](https://github.com/ANUcybernetics/astro-theme-university).
Copy this directory, rename it, and replace the content.

```bash
mise install   # node + pnpm from mise.toml (or install them yourself)
pnpm install
pnpm dev       # http://localhost:4321
pnpm build     # static site in dist/, after accessibility and link checks
pnpm typecheck
```

## What's here

- `src/site-config.ts` --- site name, nav links, favicon, licence, and the
  optional footer sections (contact, socials). Every page spreads it.
- `src/pages/index.mdx` --- the home page. MDX pages need no layout import:
  `astro.config.ts` sets `src/layouts/PageLayout.astro` as the default, and a
  `heroTitle` / `heroImage` pair in frontmatter adds a hero banner.
- `src/content/pages/` --- the `pages` content collection (markdown or MDX,
  schema in `src/content.config.ts`), rendered at `/<slug>/` by
  `src/pages/[...slug].astro`.
- `src/llms.md` --- the hand-written preamble for the generated `/llms.txt`.
- `src/decks/example.deck.mdx` --- a slide deck, built at `/decks/example/` by
  [astromotion](https://github.com/ANUcybernetics/astromotion) (`decks: true` in
  `astro.config.ts`). Delete the file and the option together if the site
  doesn't need decks.
- `.github/workflows/deploy.yml` --- builds and deploys to GitHub Pages on every
  push to `main`. Set Pages → Source to "GitHub Actions" in the repository
  settings once; the workflow derives the site URL and base path from the
  repository name.

## Branding

The site starts on the theme's neutral teal palette with a text wordmark. To
re-brand it, override the three palette tokens in a stylesheet and pass logos
and footer data through `site-config.ts`; the theme docs'
[customisation](https://anucybernetics.github.io/astro-theme-university/docs/styling/customisation/)
and
[brand packages](https://anucybernetics.github.io/astro-theme-university/docs/guides/brand-packages/)
pages cover both, and an institution that already has a brand package installs
it and spreads its branding object into the site config.

## Upgrading the theme

The theme is pinned to an exact release tag in `package.json`. To upgrade,
change the tag (the
[tags page](https://github.com/ANUcybernetics/astro-theme-university/tags) lists
releases) and run `pnpm install`.
