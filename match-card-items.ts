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
    const haystack = [item.title, item.description ?? "", ...(item.tags ?? []), ...(item.badges ?? [])]
      .join(" ")
      .toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}
