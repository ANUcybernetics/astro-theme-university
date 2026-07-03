# Changelog

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
