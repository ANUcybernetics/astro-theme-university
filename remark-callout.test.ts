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

  test("promotes a callout's [label] to a styled title", async () => {
    const html = await render(":::tip[Come study with me]\nDetails here.\n:::\n");

    expect(html).toContain('<p class="at-callout__title">Come study with me</p>');
    expect(html).toContain("at-callout--tip");
    expect(html).toContain("Details here.");
  });

  test("maps :::danger and :::caution onto the canonical styled types", async () => {
    const danger = await render(":::danger\nBoom\n:::\n");
    expect(danger).toContain("at-callout--error");
    expect(danger).toContain('role="note"');

    const caution = await render(":::caution\nCareful\n:::\n");
    expect(caution).toContain("at-callout--warning");
  });

  test("renders :::details as a disclosure with the label as its summary", async () => {
    const html = await render(":::details[Show working]\nHidden body.\n:::\n");

    expect(html).toContain("<details");
    expect(html).toContain("at-callout--details");
    expect(html).toContain("<summary>Show working</summary>");
    expect(html).toContain("Hidden body.");
    expect(html).not.toContain('role="note"');
  });

  test("renders a label-less :::details without a summary", async () => {
    const html = await render(":::details\nJust a body.\n:::\n");

    expect(html).toContain("<details");
    expect(html).not.toContain("<summary>");
    expect(html).toContain("Just a body.");
  });
});
