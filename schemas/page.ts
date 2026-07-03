import { defineCollection, type SchemaContext } from "astro:content";
import { z } from "astro/zod";
import { glob } from "astro/loaders";

/**
 * Returns a Zod schema for a page-style content collection. Includes
 * `title`, `description`, `heroImage`, and `published` fields — the
 * shape expected by `BaseLayout`, `ContentLayout`, and `SidebarLayout`.
 *
 * Use this inside a `schema:` callback (which Astro calls with an `image()`
 * helper) when you want to extend the base schema with extra fields:
 *
 * ```ts
 * import { defineCollection } from "astro:content";
 * import { glob } from "astro/loaders";
 * import { z } from "astro/zod";
 * import { pageSchema } from "astro-theme-university/schemas";
 *
 * const pages = defineCollection({
 *   loader: glob({ pattern: "**\/*.{md,mdx}", base: "src/content/pages" }),
 *   schema: (ctx) =>
 *     pageSchema(ctx).extend({
 *       section: z.enum(["guides", "reference"]),
 *       order: z.number().default(0),
 *     }),
 * });
 * ```
 */
export function pageSchema(ctx: SchemaContext) {
  return z.object({
    title: z.string(),
    description: z.string().optional(),
    heroImage: ctx.image().optional(),
    published: z.boolean().default(true),
  });
}

export interface DefinePageCollectionOptions {
  /** Glob pattern for content files, relative to `base`. Defaults to `**\/*.{md,mdx}`. */
  pattern?: string;
  /** Base directory for the content glob. Defaults to `src/content/pages`. */
  base?: string;
  /**
   * When true, the schema uses `.loose()` so consumers can add arbitrary
   * frontmatter fields without updating the schema. When false (default), the
   * schema is strict and unknown fields will fail the content sync.
   */
  passthrough?: boolean;
}

/**
 * Convenience helper for defining a page-style content collection with
 * sensible defaults. Wraps Astro's `defineCollection` + `glob` loader +
 * `pageSchema`.
 *
 * ```ts
 * // src/content.config.ts
 * import { definePageCollection } from "astro-theme-university/schemas";
 *
 * const pages = definePageCollection();
 * export const collections = { pages };
 * ```
 *
 * To add extra fields to the schema, use `pageSchema(ctx).extend({ ... })`
 * with a bare `defineCollection` call instead — see the `pageSchema` jsdoc
 * for an example. Keeping the extension path off this helper lets
 * TypeScript infer the extended data shape correctly.
 */
export function definePageCollection(options: DefinePageCollectionOptions = {}) {
  const { pattern = "**/*.{md,mdx}", base = "src/content/pages", passthrough = false } = options;

  return defineCollection({
    loader: glob({ pattern, base }),
    schema: (ctx) => (passthrough ? pageSchema(ctx).loose() : pageSchema(ctx)),
  });
}
