# Changelog

## 0.6.0

BaseLayout now emits `@font-face` for every registered font, not just the theme
pair --- fonts a site registers via Astro's top-level `fonts` config were
previously dropped on theme-layout pages without warning.

- new `preloadFonts` integration option: cssVariables of registered fonts that
  BaseLayout should preload (default `["--font-public-sans"]`, the theme body
  font, matching previous behaviour)
- the fonts virtual module gains a `preloadFontVariables` export alongside
  `fontVariables`
- entries in an explicit `preloadFonts` list that match no registered font log a
  warning at config time

## 0.5.0

One name for the one-line blurb: `description` everywhere, matching what
astromotion decks and HTML `<meta name="description">` already call it.
**Breaking**: consumers using `summary` must rename.

- `ContentLayout`: the `summary` prop is now `description`
- `CardItem` / `matchCardItems` / `FilterableCardGrid`: item `summary` →
  `description`
- llms.txt generation no longer falls back to `summary:` frontmatter —
  `description:` is the only source for entry blurbs
- `scripts/extract-props.ts` now creates `docs/src/data/` before writing, so
  `pnpm test` passes on a fresh clone

## 0.4.0

The content rule now _bisects_ the brand mark rather than skimming its left edge
— the intended look, correcting 0.3.0:

- reinstated `--at-logo-offset-x`, now an **additive** nudge on top of the
  structural `−--at-content-inset` pull: the theme brings the logo's box-left
  onto the rule, and the token slides the mark a further per-brand amount so the
  rule passes through the mark's centre
- set it to the negative of the mark's centre as a percentage of the logo's
  rendered width (a crest centred 14% into a wide lockup → `-14%`; a square mark
  centred in its box → `-50%`); `0` leaves box-left on the rule
- 0.3.0 aligned the mark's left edge flush to the rule, which put the whole mark
  to the right of the line; this restores the bisecting overlap

## 0.3.0

Nav and footer brand logos now align to the content rule (the vertical accent
line down the left of the content column) through grid geometry rather than a
hand-tuned per-brand offset:

- `.at-nav-brand` and `.at-footer-band-logo` are pulled left by exactly one
  `--at-content-inset`, so a logo authored flush lands its left edge on the rule
- **removed** the `--at-logo-offset-x` token --- the alignment is now derived,
  not configured. **Breaking**: brands that set `--at-logo-offset-x` should
  instead author their logo artwork flush (painted bounding box to the viewBox
  edge, no built-in transparent margin); the theme supplies the surrounding
  clear-space through layout
- design-tokens docs rewritten to document the flush-logo convention

## 0.2.0

Typography overhaul — the theme's webfonts now actually load, and the weight
hierarchy is rebalanced:

- BaseLayout now emits `@font-face` rules (and a preload for the body font) for
  the theme fonts via Astro's `<Font>` component and a new
  `virtual:astro-theme-university/fonts` module. Previously the fonts were
  registered in config but never rendered, so every visitor fell back to system
  fonts (or a locally installed Public Sans)
- Public Sans is loaded as a variable font (`weights: ["100 900"]`), so every
  weight the styles use renders as designed rather than as synthetic bold
- weight hierarchy rebalanced: body text 400 (was a silently-ignored 300), h2–h6
  semibold 600 (was 700), h1 stays regular-weight at display size; nav
  brand/wordmark and sidebar section titles follow at 600
- subtle negative letter-spacing on h1 (−0.02em) and h2 (−0.01em)
- deck theme gets the same treatment: slide body 400, headings 600
- docs site passes `fontVariables: ["--font-public-sans"]` to astromotion so
  deck pages load the webfont too

## 0.1.0

Initial release. Extracted from the `astro-theme-anu` package (which continues
as a data-only branding companion on ANU GitLab) with the branding generalised:

- brand palette API: `--at-primary`, `--at-secondary`, `--at-tertiary` custom
  properties (plus derived hover/active variants and deck tint scales via CSS
  relative colour syntax); all semantic tokens and surface tints derive from the
  palette, so a brand CSS file that overrides the base colours re-themes the
  whole site and any decks
- neutral defaults: teal primary, text-wordmark nav brand when no `logo` prop is
  given, no default favicon, and a footer that renders only the data it's given
  (`legalLinks`, `partnerships`, `meta`, and the new `acknowledgement` prop
  replace the removed `institutional` / `showAcknowledgement` flags and their
  baked-in defaults)
- no bundled institutional assets; branding packages supply logos and footer
  data as props
