import { describe, expect, test } from "vitest";
import { remark } from "remark";
import remarkGfm from "remark-gfm";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeTableWrap from "./rehype-table-wrap.js";

function processMarkdown(md: string): string {
  return String(
    remark()
      .use(remarkGfm)
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeTableWrap)
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(md),
  );
}

const TABLE = "| a | b |\n| - | - |\n| 1 | 2 |";

describe("rehype-table-wrap", () => {
  test("wraps a markdown table in a scroll container", () => {
    const html = processMarkdown(TABLE);
    expect(html).toContain('<div class="at-table-wrap"><table>');
    expect(html).toContain("</table></div>");
  });

  test("wraps every table in a document", () => {
    const html = processMarkdown(`${TABLE}\n\nsome prose\n\n${TABLE}`);
    expect(html.match(/at-table-wrap/g)).toHaveLength(2);
  });

  test("does not double-wrap on repeated runs", () => {
    const once = processMarkdown(TABLE);
    const twice = String(
      remark()
        .use(remarkGfm)
        .use(remarkRehype, { allowDangerousHtml: true })
        .use(rehypeTableWrap)
        .use(rehypeTableWrap)
        .use(rehypeStringify, { allowDangerousHtml: true })
        .processSync(TABLE),
    );
    expect(twice).toBe(once);
  });

  test("leaves non-table content untouched", () => {
    const html = processMarkdown("just a paragraph");
    expect(html).not.toContain("at-table-wrap");
  });
});
