export interface CardItem {
  /** Card heading text. */
  title: string;
  /** URL the card links to. Internal absolute paths (starting with `/`) should be passed
   *  unprefixed; the consuming component will apply the site's base path. */
  href: string;
  /** Optional summary text rendered below the title. Searched alongside the title.
   *  Accepts null so content-collection entries with optional summary fields can be passed directly. */
  summary?: string | null;
  /** Optional tags. Searched alongside title and summary. */
  tags?: string[] | null;
}

/**
 * Filter an array of {@link CardItem} by a free-text query.
 *
 * The query is split on whitespace into tokens, lower-cased, and every token
 * must appear somewhere in the item's title, summary, or tags (AND semantics).
 * Matching is case-insensitive and substring-based. Input order is preserved
 * and the input array is not mutated.
 */
export function matchCardItems<T extends CardItem>(items: T[], query: string): T[] {
  const tokens = query.toLowerCase().trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0) return [...items];
  return items.filter((item) => {
    const haystack = [item.title, item.summary ?? "", ...(item.tags ?? [])].join(" ").toLowerCase();
    return tokens.every((token) => haystack.includes(token));
  });
}
