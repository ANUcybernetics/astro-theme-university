import CalloutBlock from "./CalloutBlock.astro";
import CodeBlock from "./CodeBlock.astro";

/** Portable Text renderers, keyed by node `_type`. `code` replaces EmDash's
 *  built-in renderer, whose hard-coded dark styling ignores the theme. */
export const blockComponents = { callout: CalloutBlock, code: CodeBlock };
