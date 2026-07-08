import type { Root } from "mdast";
import type { Plugin } from "unified";
import "mdast-util-directive";
import { visit } from "unist-util-visit";

const CALLOUT_TYPES = new Set(["info", "tip", "warning", "error"]);

// `:::danger` / `:::caution` are common spellings; map them onto the canonical
// styled types so authors can use either name.
const ALIASES: Record<string, string> = { danger: "error", caution: "warning" };

// remark-directive turns every `:name` token into a directive node, including
// accidental ones in prose like times ("11:59pm" -> textDirective "59pm") or
// ratios. Unhandled directives are then dropped/mangled by the HAST conversion,
// silently eating the rest of the text. We only use *container* directives
// (`:::info`) for callouts, so any text/leaf directive left without an hName is
// an accidental colon: restore it to the literal source it was parsed from.
const remarkCallout: Plugin<[], Root> = () => {
  return (tree, file) => {
    visit(tree, "containerDirective", (node) => {
      const name = ALIASES[node.name] ?? node.name;

      // A container directive's optional `[…]` label is parsed as a leading
      // paragraph flagged `directiveLabel`. We repurpose it — as the <summary>
      // of a `:::details`, or as a callout's title.
      const first = node.children[0];
      const label =
        first?.type === "paragraph" &&
        (first.data as { directiveLabel?: boolean } | undefined)?.directiveLabel === true
          ? first
          : null;

      // `:::details[summary]` renders a native disclosure widget.
      if (name === "details") {
        const data = (node.data ??= {});
        data.hName = "details";
        data.hProperties = { class: "at-callout at-callout--details" };
        if (label) label.data = { hName: "summary" };
        return;
      }

      if (!CALLOUT_TYPES.has(name)) return;
      const data = (node.data ??= {});
      data.hName = "aside";
      data.hProperties = {
        class: `at-callout at-callout--${name}`,
        role: "note",
      };
      // `:::tip[Heads up]` — the label becomes a styled title paragraph.
      if (label) label.data = { hName: "p", hProperties: { class: "at-callout__title" } };
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
