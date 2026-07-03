import { defineCollection } from "astro:content";
import { glob } from "astro/loaders";
import { z } from "astro/zod";
import { pageSchema } from "astro-theme-university/schemas";

const docs = defineCollection({
  loader: glob({ pattern: "**/*.mdx", base: "src/content/docs" }),
  schema: (ctx) =>
    pageSchema(ctx).extend({
      section: z.enum(["getting-started", "components", "layouts", "styling", "guides"]),
      order: z.number().default(0),
    }),
});

export const collections = { docs };
