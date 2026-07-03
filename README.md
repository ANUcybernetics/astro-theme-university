# astro-theme-university

An Astro 7 + Svelte 5 theme package for university-style static sites — layouts,
components, content-collection helpers, post-build checks (accessibility, broken
links, deck structure), Pagefind search, and a Reveal.js deck theme for
[astromotion](https://github.com/ANUcybernetics/astromotion) slide decks.

The theme is deliberately institutional in feel — sticky nav with logo or text
wordmark, hero banners, a footer with legal links, partnership band, and
acknowledgement section — but ships no institution's branding. Brands are data:

- **colours**: override `--at-primary` (and optionally `--at-secondary`,
  `--at-tertiary`) from a CSS file imported after the theme styles. Every
  semantic token — links, headings, table headers, surface tints, deck tint
  scales — derives from the palette via CSS relative colour syntax, so two or
  three custom properties re-theme the whole site and any decks.
- **logos and footer data**: pass `logo`, `logoDark`, `favicon`, `legalLinks`,
  `partnerships`, `meta`, and `acknowledgement` to `BaseLayout`. Keep them in
  one object and spread it: `<BaseLayout {...myBranding} title={title}>`.

## Usage

```bash
pnpm add "git+https://github.com/ANUcybernetics/astro-theme-university.git#v0.1.0"
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

See the docs site (`pnpm dev` in this repo) for the full component, layout, and
token reference.

## Development

pnpm workspace: the package lives at the repo root, with `docs/` (the
documentation site) and `examples/` as workspace members.

```bash
pnpm install
pnpm test        # package unit tests
pnpm typecheck   # integration surface + docs astro check
pnpm dev         # docs site
```

Releases: `scripts/release.sh <patch|minor|major|x.y.z> [reason]` — tags
`vX.Y.Z` and pushes. Consumers pin exact release tags.

## Licence

MIT
