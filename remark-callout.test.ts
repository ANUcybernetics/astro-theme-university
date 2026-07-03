import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkDirective from "remark-directive";
import remarkRehype from "remark-rehype";
import { describe, expect, test } from "vitest";
import remarkCallout from "./remark-callout.js";

const render = (md: string) =>
  remark()
    .use(remarkDirective)
    .use(remarkCallout)
    .use(remarkRehype)
    .use(rehypeStringify)
    .process(md)
    .then(String);

describe("remarkCallout", () => {
  test("turns a known container directive into a callout aside", async () => {
    const html = await render(":::warning\nWatch out\n:::\n");

    expect(html).toContain("<aside");
    expect(html).toContain("at-callout--warning");
    expect(html).toContain('role="note"');
    expect(html).toContain("Watch out");
  });

  test("preserves prose colons that look like accidental directives", async () => {
    const html = await render(
      "Most fall at 2pm, not at midnight or 11:59pm. A 2pm deadline really means 2:15pm.\n",
    );

    expect(html).toContain("11:59pm");
    expect(html).toContain("2:15pm");
    expect(html).not.toContain("<div></div>");
  });

  test("preserves prose colons inside a callout", async () => {
    const html = await render(":::info\nThe cutoff is 9:30am sharp.\n:::\n");

    expect(html).toContain("9:30am");
    expect(html).toContain("at-callout--info");
  });
});
