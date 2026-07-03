# astro-theme-university

> An Astro 7 + Svelte 5 theme package for university-style static sites.

astro-theme-university provides layouts, components, and styles for building
institutional websites. It ships neutral defaults (a teal primary colour, text
wordmark navigation) and is re-branded by overriding a small set of CSS custom
properties and passing branding data as props. It uses Astro's content
collections, pure CSS with custom properties (no Tailwind), and optional
astromotion integration for lecture slide decks.

Key concepts:

- **BaseLayout** wraps every page with navigation, footer, and theme support
- **ContentLayout** extends BaseLayout with a title, optional hero image, and
  lead text
- **Hero** and **Card** components accept imported images (`ImageMetadata`) for
  pipeline optimisation
- all CSS custom properties use the `--at-` prefix; semantic tokens derive from
  the `--at-primary`/`--at-secondary`/`--at-tertiary` brand palette via relative
  colour syntax, so overriding the palette re-brands the whole theme
- Light mode is the default; dark mode uses `[data-theme="dark"]`
