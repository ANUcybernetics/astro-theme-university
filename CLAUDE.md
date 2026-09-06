# astro-theme-university

Astro 7 theme package for university-style static sites. Interactive theme
controls are progressively enhanced native browser APIs; never introduce a
client-framework runtime, because consumers would inherit it.

The package lives at the **repo root** (astromotion-style layout); `docs/` is
the documentation site. `examples/base` is deliberately not a workspace member:
`tests/examples.test.ts` copies it to a temp dir and rewrites the theme dep to
`file:` the repo root, so it must resolve the theme as a fresh consumer would.

This repo must stay free of institutional trademarks: no logos, lockups, crests,
legal identifiers, official acknowledgement text, or institution-specific
defaults. Branding is data supplied by consumers.

## Brand architecture

The re-branding API is the palette at the top of `styles/tokens.css`, which its
header comment documents. `styles/deck.css` declares the same palette defaults
and derives the deck tint scales from them. Brand CSS imported after theme CSS
re-themes both site and decks.

Components take branding as props: `logo`/`logoDark`/`favicon` have no defaults
(Nav falls back to a text wordmark), and Footer renders only the data it is
given (`legalLinks`, `partnerships`, `meta`, `acknowledgement`).

## Commands

- `pnpm test` --- every vitest suite, including the slow fresh-consumer example
  builds; `pnpm test:examples` narrows to `tests/`
- `pnpm typecheck` --- `tsconfig.typecheck.json` plus the docs `astro check`
- `pnpm lint` / `pnpm lint:css` / `pnpm format`
- `pnpm dev` / `pnpm build` --- docs site
- `scripts/release.sh <patch|minor|major|x.y.z> [reason]`

## Conventions

- semver on 0.x: breaking change = minor bump, fix = patch
- consumers pin exact tags:
  `git+https://github.com/ANUcybernetics/astro-theme-university.git#vX.Y.Z`
- CSS in `@layer at.tokens / at.base / at.components`; `--at-` prefix for all
  custom properties
- deck route injection and generated-markup checks belong to astromotion; the
  theme owns only the shared deck stylesheet
