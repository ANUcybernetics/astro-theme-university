/** A run of callout text: plain, or wrapped in a link, bold or emphasis. */
export type InlineSegment =
  | { type: "text"; text: string }
  | { type: "link"; text: string; href: string }
  | { type: "strong" | "em"; text: string };

const INLINE = /\[([^\]]+)\]\(([^)\s]+)\)|\*\*([^*]+)\*\*|\*([^*]+)\*/g;
// Site-relative paths and the schemes an editor would paste; anything else
// (`javascript:` above all) is left as the text they typed.
const SAFE_HREF = /^(?:https?:\/\/|mailto:|tel:|\/(?!\/)|#)/i;

/**
 * Splits a block's plain-text field into inline segments. Block fields are
 * plain text inputs, so this small markdown subset is how a callout carries a
 * link: `[text](url)`, plus `**bold**` and `*emphasis*`.
 */
export function parseInline(text: string): InlineSegment[] {
  const segments: InlineSegment[] = [];
  let last = 0;
  for (const match of text.matchAll(INLINE)) {
    const [whole, linkText, href, strong, em] = match;
    if (linkText !== undefined && href !== undefined && !SAFE_HREF.test(href)) continue;
    if (match.index > last) segments.push({ type: "text", text: text.slice(last, match.index) });
    if (linkText !== undefined && href !== undefined) {
      segments.push({ type: "link", text: linkText, href });
    } else if (strong !== undefined) segments.push({ type: "strong", text: strong });
    else if (em !== undefined) segments.push({ type: "em", text: em });
    last = match.index + whole.length;
  }
  if (last < text.length) segments.push({ type: "text", text: text.slice(last) });
  return segments;
}
