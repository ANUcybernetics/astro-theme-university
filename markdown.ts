// Markdown plugins shared between the theme integration (index.ts) and external
// processors that want to match the theme exactly — e.g. a consumer running its
// own `markdown.processor: unified({…})` instead of the integration. Kept free
// of Astro-integration imports so it can be pulled in from a plain config.
import type { RehypePlugins } from "@astrojs/markdown-remark";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeSlug from "rehype-slug";

export { default as remarkCallout } from "./remark-callout.js";
export { default as rehypeTableWrap } from "./rehype-table-wrap.js";

// rehype-slug + a decorative, assistive-tech-hidden "#" appended to each
// heading. Screen-reader and keyboard users navigate by heading directly, so
// the permalink is a mouse affordance only (aria-hidden + tabindex=-1). Styling
// lives in the `.at-heading-anchor` rules in styles/components.css.
export const headingAnchorPlugins: RehypePlugins = [
  rehypeSlug,
  [
    rehypeAutolinkHeadings,
    {
      behavior: "append",
      properties: { class: "at-heading-anchor", ariaHidden: "true", tabIndex: -1 },
      content: {
        type: "text",
        value: "#",
      },
    },
  ],
];
