import CalloutBlock from "./CalloutBlock.astro";
import CodeBlock from "./CodeBlock.astro";
import CtaBlock from "./CtaBlock.astro";
import EmbedBlock from "./EmbedBlock.astro";

/** Portable Text renderers, keyed by node `_type`. `code` replaces EmDash's
 *  built-in renderer, whose hard-coded dark styling ignores the theme, and
 *  `embed` replaces it for YouTube videos, to load the player only on click. */
export const blockComponents = {
  callout: CalloutBlock,
  code: CodeBlock,
  cta: CtaBlock,
  embed: EmbedBlock,
};
