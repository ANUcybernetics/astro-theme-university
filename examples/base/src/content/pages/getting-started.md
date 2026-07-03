---
title: Getting started
description: A minimal walkthrough of editing this site.
---

This is an example content page demonstrating the `pages` content collection.

Files in `src/content/pages/` are validated against the schema in
`src/content.config.ts`. By default the schema requires `title` and accepts
optional `description` and `heroImage`, plus any other frontmatter fields
(the base example uses `passthrough: true`).

## Editing this page

Open `src/content/pages/getting-started.md` and edit it. Save to see the change
live in the dev server.

## Adding more pages

Create another `.md` or `.mdx` file in `src/content/pages/`. It needs at least:

```yaml
---
title: My new page
---
```

To link to your new page from a nav or from this page, use its slug:

```markdown
[My new page](/my-new-page/)
```

## Linking to external content

Standard markdown links work as expected: [Astro docs](https://docs.astro.build/).
The build-time link checker will flag broken **internal** links; external links
are skipped by default.
