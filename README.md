# astro-theme-university

An Astro 7 theme package for university-style sites — layouts, progressively
enhanced components, content helpers, post-build checks (accessibility and
broken links), Pagefind search, and a Reveal.js deck theme for
[astromotion](https://github.com/ANUcybernetics/astromotion) slide decks. It
builds static sites and also styles [EmDash](#emdash-sites) CMS sites.

**Documentation:** <https://anucybernetics.github.io/astro-theme-university/>

The theme is deliberately institutional in feel — sticky nav with logo or text
wordmark, hero banners, a footer with legal links, partnership band, and
acknowledgement section — but ships no institution's branding. Brands are data:

- **colours**: override `--at-primary` from a CSS file imported after the theme
  styles. Every semantic token — links, headings, table headers, surface tints,
  the deck tint scales — derives from it via CSS relative colour syntax, so one
  custom property re-themes the whole site and any decks; `--at-tertiary`
  colours info callouts and `--at-secondary` feeds the deck tint scales.
- **logos and footer data**: pass `logo`, `logoDark`, `favicon`, `legalLinks`,
  `partnerships`, `meta`, and `acknowledgement` to `BaseLayout`. Keep them in
  one object and spread it: `<BaseLayout {...myBranding} title={title}>`.

An institution typically packages both halves as a small **brand package** (a
stylesheet plus a branding object) that sites install alongside the theme; the
docs'
[brand packages guide](https://anucybernetics.github.io/astro-theme-university/docs/guides/brand-packages/)
walks through building one. Course websites add
[astro-course-university](https://github.com/ANUcybernetics/astro-course-university)
for the content model and build-time validation.

## Quick start

The fastest route is to copy the starter in `examples/base` — a complete site
with the theme wired up and a GitHub Pages deploy workflow:

```bash
git clone https://github.com/ANUcybernetics/astro-theme-university.git
cp -r astro-theme-university/examples/base my-site
cd my-site && pnpm install && pnpm dev
```

To add the theme to an existing Astro project instead, install it from its
latest
[release tag](https://github.com/ANUcybernetics/astro-theme-university/tags) (it
isn't published to npm):

```bash
pnpm add "git+https://github.com/ANUcybernetics/astro-theme-university.git#vX.Y.Z"
```

```ts
// astro.config.ts
import { defineConfig } from "astro/config";
import universityTheme from "astro-theme-university";

export default defineConfig({
  integrations: [universityTheme({ name: "My Site" })],
});
```

```astro
---
import BaseLayout from "astro-theme-university/layouts/BaseLayout.astro";
---

<BaseLayout title="Home" name="My Site">
  <p>Hello.</p>
</BaseLayout>
```

The
[installation guide](https://anucybernetics.github.io/astro-theme-university/docs/getting-started/installation/)
covers the peer dependencies and project setup in full.

## EmDash sites

The same look and branding work in sites run by [EmDash](https://emdashcms.com),
the Astro-based CMS. EmDash "themes" are templates copied into each new site, so
nothing changes after the copy; here the theme stays a dependency instead, and a
theme bump reaches EmDash sites the same way it reaches static ones. The
`astro-theme-university/emdash` subpath adds:

- `EmDashLayout` --- `BaseLayout` with the site name, tagline and nav taken from
  EmDash's settings and a menu (`"primary"` by default), and EmDash's head and
  body hooks placed where plugins expect them. EmDash owns SEO meta, so the
  theme's description and Open Graph tags are switched off.
- `universityBlocks()` --- an EmDash plugin that adds the theme's block types
  (currently a callout) to the rich-text editor and renders them, plus EmDash's
  built-in code block, with the theme's components. Block types are defined in
  code, so a site picks up new ones from a version bump with no seed or
  migration.

Start from an EmDash template (`npm create emdash@latest`), install the theme
(and a brand package, if you use one) as above, and register it beside EmDash:

```js
// astro.config.mjs
import react from "@astrojs/react";
import { defineConfig } from "astro/config";
import emdash from "emdash/astro";
import universityTheme from "astro-theme-university";
import { universityBlocks } from "astro-theme-university/emdash";

export default defineConfig({
  output: "server",
  integrations: [
    react(),
    universityTheme({ search: false, brandCss: "my-brand-package/brand.css" }),
    emdash({ plugins: [universityBlocks()] /* database, storage, … */ }),
  ],
});
```

Then make the template's base layout a thin wrapper (the template's pages
already pass the props it takes: `title`, `description`, `content`, `canonical`
and so on), spreading the brand object ahead of them:

```astro
---
// src/layouts/Base.astro
import EmDashLayout, { type EmDashLayoutProps } from "astro-theme-university/emdash/EmDashLayout.astro";
import { myBranding } from "my-brand-package";

type Props = EmDashLayoutProps;
---

<EmDashLayout {...myBranding} {...Astro.props}>
  <slot />
</EmDashLayout>
```

Rich text needs no other wiring: headings, lists, links, quotes and code take
the theme's styles as they are. Some things work differently from a static
build:

- EmDash renders pages on request, so the post-build accessibility, link and
  token checks have no built pages to scan, and Pagefind has none to index. Use
  EmDash's `LiveSearch` for search.
- Logos and the favicon come from the brand object, not EmDash's settings.
- A block type's field names are stored in every saved block, so renaming one is
  a breaking change: content saved under the old name loses that field.

## Development

pnpm workspace: the package lives at the repo root, with `docs/` (the
documentation site) as the other workspace member. `examples/base` is a
fresh-consumer fixture installed on its own by the tests.

```bash
pnpm install
pnpm test          # every suite, including the fresh-consumer example builds
pnpm test:examples # only the example builds under tests/
pnpm typecheck     # integration surface + docs astro check
pnpm dev           # docs site
```

The docs site deploys to GitHub Pages from `main`
(`.github/workflows/docs.yml`).

Releases: `scripts/release.sh <patch|minor|major|x.y.z> [reason]` — tags
`vX.Y.Z` and pushes. Consumers pin exact release tags.

## Licence

MIT
