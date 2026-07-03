# Example university site

This is a university-style website built with [Astro](https://astro.build) and the
[astro-theme-university](https://github.com/benswift/astro-theme-university) theme.

## Commands

- `pnpm dev` --- start the dev server
- `pnpm build` --- build for production (set `SITE_URL` and `BASE_PATH` env
  vars for deployment)
- `pnpm preview` --- preview the production build locally
- `pnpm typecheck` --- run `astro check`

## Project structure

```
src/
├── assets/             # images and other binary assets
├── content/
│   └── pages/          # markdown/mdx content (pages collection)
├── layouts/
│   └── PageLayout.astro  # layout for MDX pages (hero via frontmatter)
├── pages/
│   ├── [...slug].astro  # dynamic route for pages collection entries
│   └── index.mdx       # home page
├── content.config.ts   # content collection schemas
├── llms.md             # hand-written preamble for /llms.txt
└── site-config.ts      # site name, nav, licence, contact, socials
```

## Site configuration

`src/site-config.ts` uses the `defineSiteConfig()` helper imported from
`astro-theme-university/types` — **not** from the package root — so the site config
module stays lightweight and doesn't pull the theme's integration code into
your page bundles. The helper is an identity function that gives you full
TypeScript autocomplete and validation on the `SiteConfig` shape.

## Content

Content lives in `src/content/pages/` as markdown or MDX files. The schema is
defined in `src/content.config.ts` using `definePageCollection` from
`astro-theme-university/schemas`:

```ts
import { definePageCollection } from "astro-theme-university/schemas";
const pages = definePageCollection({ passthrough: true });
export const collections = { pages };
```

`passthrough: true` allows arbitrary extra frontmatter fields without
updating the schema. Remove it to enforce strict validation.

Required frontmatter:

```yaml
---
title: Page title
description: Optional description # optional
---
```

## Pages

Prefer MDX (`.mdx`) over Astro (`.astro`) for pages that are mostly text
content. MDX pages use `PageLayout` via frontmatter and support hero images
through `heroTitle`/`heroImage` frontmatter fields. Use Astro files for
programmatic pages like collection listings and dynamic routes.

## Theme components

Import from `astro-theme-university`:

- **layouts**: `BaseLayout`, `ContentLayout`, `SidebarLayout`
- **components**: `Hero`, `Card`, `CardGrid`, `Callout`, `Countdown`,
  `Pagination`, `Sidebar`, `YouTubeEmbed`

### Callouts in markdown

Use container directives (no import needed):

```markdown
:::info

This is an info callout.

:::
```

Variants: `info`, `tip`, `warning`, `error`.

## Deployment

Copy `.env.example` to `.env` for local development, or set these in CI:

- `SITE_URL` --- e.g. `https://www.example.edu`
- `BASE_PATH` --- e.g. `/courses/my-site`

Images are co-located with content using relative paths (e.g.
`./images/hero.avif`). Astro processes them through its image pipeline for
optimisation. For standalone pages, import images in the script block.

## Style customisation

The theme uses CSS custom properties and `@layer`. Override tokens in a
custom CSS file imported from `PageLayout.astro` or a wrapping layout. See
the theme docs for available tokens and design primitives.
