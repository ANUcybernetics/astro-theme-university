---
title: About
description: A short description of the site, used in the page meta and as a lead for search and link previews.
---

Replace this file with your own about page content.

This file lives at `src/content/pages/about.md` — anything you add to
`src/content/pages/` becomes part of the `pages` collection. You can link to it
from your nav or from other pages, or you can use `getCollection("pages")` in a
page script to list all entries programmatically.

## Callouts

The theme supports four callout variants via the container directive syntax —
`info`, `tip`, `warning`, and `error`. No imports needed:

:::info
Callouts work inside any markdown or MDX file.
:::

:::tip
Use `tip` for success states, positive notes, or "pro tips".
:::

:::warning
Use `warning` to flag things that need attention but aren't errors.
:::

:::error
Use `error` for hard failures, breaking changes, and things to avoid.
:::

## Code blocks

Fenced code blocks get syntax highlighting via Shiki with the theme's light/dark
themes:

```ts
import { defineSiteConfig } from "astro-theme-university/types";

export const siteConfig = defineSiteConfig({
  name: "My Site",
});
```
