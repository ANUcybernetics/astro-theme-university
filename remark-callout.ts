import type { Root } from "mdast";
import type { Plugin } from "unified";
import "mdast-util-directive";
import { visit } from "unist-util-visit";

const CALLOUT_TYPES = new Set(["info", "tip", "warning", "error"]);

// remark-directive turns every `:name` token into a directive node, including
// accidental ones in prose like times ("11:59pm" -> textDirective "59pm") or
// ratios. Unhandled directives are then dropped/mangled by the HAST conversion,
// silently eating the rest of the text. We only use *container* directives
// (`:::info`) for callouts, so any text/leaf directive left without an hName is
// an accidental colon: restore it to the literal source it was parsed from.
const remarkCallout: Plugin<[], Root> = () => {
  return (tree, file) => {
    visit(tree, "containerDirective", (node) => {
      if (!CALLOUT_TYPES.has(node.name)) return;
      const data = (node.data ??= {});
      data.hName = "aside";
      data.hProperties = {
        class: `at-callout at-callout--${node.name}`,
        role: "note",
      };
    });

    const source = String(file.value);
    visit(tree, (node, index, parent) => {
      if (parent == null || index == null) return;
      if (node.type !== "textDirective" && node.type !== "leafDirective") return;
      if (node.data?.hName) return;
      const start = node.position?.start.offset;
      const end = node.position?.end.offset;
      const value = start != null && end != null ? source.slice(start, end) : `:${node.name}`;
      parent.children[index] = { type: "text", value };
    });
  };
};

export default remarkCallout;
