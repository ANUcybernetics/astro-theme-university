import type { ImageMetadata } from "astro";

export interface CardItem {
  /** Card heading text. */
  title: string;
  /** URL the card links to. Internal absolute paths (starting with `/`) should be passed
   *  unprefixed; the consuming component will apply the site's base path. */
  href: string;
  /** Optional description text rendered below the title. Searched alongside the title.
   *  Accepts null so content-collection entries with optional description fields can be passed directly. */
  description?: string | null;
  /** Optional tags. Searched alongside title and description, but not rendered. */
  tags?: string[] | null;
  /** Optional short labels rendered as small chips between the title and
   *  description (e.g. "Week 1"). Searched alongside title, description, and tags. */
  badges?: string[] | null;
  /** Optional card image, rendered above the title as `Card` renders one.
   *  An imported image only: a filtered grid is built from a data file the
   *  consumer globs at build time, so there is no remote-image case to serve.
   *  Not searched — an image contributes nothing a query could match. */
  image?: ImageMetadata;
  /** Alt text for the card image. Defaults to the title, which is right for a
   *  card whose image illustrates its subject and wrong for one whose image is
   *  a generic thumbnail — pass a description in that case. */
  imageAlt?: string;
}

/** Normalized searchable text shared by the pure matcher and the progressively
 * enhanced card-grid component. */
export function cardSearchText(item: CardItem): string {
  return [item.title, item.description ?? "", ...(item.tags ?? []), ...(item.badges ?? [])]
    .join(" ")
    .toLowerCase();
}

/**
 * Filter an array of {@link CardItem} by a free-text query.
 *
 * The query is split on whitespace into tokens, lower-cased, and every token
 * must appear somewhere in the item's title, description, tags, or badges
 * (AND semantics). Matching is case-insensitive and substring-based. Input
 * order is preserved and the input array is not mutated.
 */
export function matchCardItems<T extends CardItem>(items: T[], query: string): T[] {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [...items];
  return items.filter((item) => {
    const haystack = cardSearchText(item);
    return tokens.every((token) => haystack.includes(token));
  });
}
