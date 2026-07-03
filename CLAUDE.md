# astro-theme-university

Astro 7 + Svelte 5 theme package for university-style static sites. The package
lives at the **repo root** (astromotion-style layout); `docs/` is the
documentation site and `examples/base` is a standalone example workspace (not a
root-workspace member — the examples test copies it to a temp dir and rewrites
the theme dep to `file:` the repo root).

Extracted from the `astro-theme-anu` monorepo (ANU GitLab), which continues as
the data-only ANU branding companion (`branding/anu.css` + `anuBranding`). This
repo must stay free of ANU trademarks: no ANU logos/lockups/crests, no
"Australian National University" text, no Acknowledgement of Country text, no
TEQSA/CRICOS identifiers. Branding is data supplied by consumers.

## Brand architecture

- `styles/tokens.css` — brand palette (`--at-primary`, `--at-secondary`,
  `--at-tertiary`, fixed `--at-black`/`--at-white`) with hover/active derived
  via CSS relative colour syntax; all semantic tokens and surface tints derive
  from the palette. Neutral default: teal primary.
- `styles/deck.css` — standalone deck theme; declares the same palette defaults
  and derives its tint scales (`--at-primary-1..4` etc.) from them. Brand CSS
  imported after theme CSS re-themes site and decks.
- Components take branding as props: `logo`/`logoDark`/`favicon` (no defaults;
  Nav falls back to a text wordmark), and the Footer renders only the data it's
  given (`legalLinks`, `partnerships`, `meta`, `acknowledgement`). There is no
  `institutional` flag.

## Commands

- `pnpm test` — package unit tests (vitest + Astro container)
- `pnpm test:examples` — example fresh-consumer builds (slow)
- `pnpm typecheck` — integration surface (tsc) + docs `astro check`
- `pnpm lint` / `pnpm lint:css` / `pnpm format`
- `pnpm dev` / `pnpm build` — docs site
- `scripts/release.sh <patch|minor|major|x.y.z> [reason]` — tag `vX.Y.Z` and
  push; consumers pin exact tags

## Conventions

- semver on 0.x: breaking change = minor bump, fix = patch
- consumers pin
  `git+https://github.com/ANUcybernetics/astro-theme-university.git#vX.Y.Z` (npm
  publishing may come later; the name is reserved-by-availability)
- CSS in `@layer at.tokens / at.base / at.components`; `--at-` prefix for all
  custom properties
