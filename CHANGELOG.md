# Changelog

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
