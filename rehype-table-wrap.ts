import type { Element, Root } from "hast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";

// Markdown tables render full-width (styles/base.css sets `table { width:
// 100% }`, matching the deck stylesheet), but overflow is ignored on table
// boxes, so a wide table would push past its container with no way to scroll
// it. Wrap each table in a `.at-table-wrap` scroll container at the HAST
// layer instead — the CSS puts `overflow-x: auto` on the wrapper. No tabindex:
// modern browsers make scroll containers without focusable children
// keyboard-focusable themselves.
const isWrapper = (node: Root["children"][number] | Element): boolean =>
  node.type === "element" &&
  node.tagName === "div" &&
  Array.isArray(node.properties.className) &&
  node.properties.className.includes("at-table-wrap");

const rehypeTableWrap: Plugin<[], Root> = () => {
  return (tree) => {
    visit(tree, "element", (node, index, parent) => {
      if (node.tagName !== "table" || parent === undefined || index === undefined) return;
      if (parent.type === "element" && isWrapper(parent)) return;
      const wrapper: Element = {
        type: "element",
        tagName: "div",
        properties: { className: ["at-table-wrap"] },
        children: [node],
      };
      parent.children[index] = wrapper;
      // Revisit this index: the wrapper is skipped by the guard and traversal
      // then descends into the table normally, so tables nested in cells
      // (raw-HTML only — markdown can't nest them) are wrapped too.
      return index;
    });
  };
};

export default rehypeTableWrap;
