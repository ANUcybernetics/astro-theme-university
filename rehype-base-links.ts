import type { Root } from "hast";
import type { Plugin } from "unified";
import { visit } from "unist-util-visit";
import { withBase } from "./url.js";

// Theme components route their URLs through withBase(), but markdown prose
// links (`[crits](/crits/)`) reach the HTML untouched, so a site deployed
// under a base sub-path ships 404s for every root-absolute link an author
// writes. Rewrite href/src at the HAST layer instead: authors keep writing
// clean site-root paths (which also stay clean in /api/ bodies and llms.txt,
// generated from the raw markdown), and the rendered page gets the prefix.
// Convention: a root-absolute path is always site-internal — same-domain
// pages outside the base need a full URL.
const rehypeBaseLinks: Plugin<[{ base?: string }?], Root> = ({ base = "/" } = {}) => {
  return (tree) => {
    const b = base.replace(/\/$/, "");
    if (!b) return;
    visit(tree, "element", (node) => {
      for (const attr of ["href", "src"] as const) {
        const value = node.properties[attr];
        if (typeof value === "string") {
          node.properties[attr] = withBase(value, b);
        }
      }
    });
  };
};

export default rehypeBaseLinks;
