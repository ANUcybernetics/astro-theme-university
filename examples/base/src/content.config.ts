import { definePageCollection } from "astro-theme-university/schemas";

// passthrough: true allows consumers to add arbitrary frontmatter fields
// without editing this schema. Remove it to enforce strict validation.
const pages = definePageCollection({ passthrough: true });

export const collections = { pages };
