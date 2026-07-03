import { describe, expect, test } from "vitest";
import { remark } from "remark";
import remarkCustomHeadingId from "remark-custom-heading-id";
import remarkRehype from "remark-rehype";
import rehypeSlug from "rehype-slug";
import rehypeAutolinkHeadings from "rehype-autolink-headings";
import rehypeStringify from "rehype-stringify";

function processMarkdown(md: string): string {
  return String(
    remark()
      .use(remarkCustomHeadingId)
      .use(remarkRehype)
      .use(rehypeSlug)
      .use(rehypeAutolinkHeadings, {
        behavior: "append",
        properties: { class: "at-heading-anchor", ariaHidden: "true", tabIndex: -1 },
        content: { type: "text", value: "#" },
      })
      .use(rehypeStringify)
      .processSync(md),
  );
}

describe("remark-custom-heading-id", () => {
  test("sets explicit heading ID from {#id} syntax", () => {
    const html = processMarkdown("## Exercise 2 {#exercise-2}");
    expect(html).toContain('id="exercise-2"');
    expect(html).not.toContain("{#exercise-2}");
  });

  test("strips {#id} from heading text", () => {
    const html = processMarkdown("## My heading {#custom}");
    expect(html).toContain("My heading");
    expect(html).not.toContain("{#custom}");
    expect(html).toContain('id="custom"');
  });

  test("auto-generates ID when no explicit ID given", () => {
    const html = processMarkdown("## Auto generated");
    expect(html).toContain('id="auto-generated"');
  });
});

describe("rehype-autolink-headings", () => {
  test("appends anchor link to headings", () => {
    const html = processMarkdown("## My section");
    expect(html).toContain('class="at-heading-anchor"');
    expect(html).toContain(">#</a>");
  });

  test("anchor has aria-hidden and tabindex", () => {
    const html = processMarkdown("## Test heading");
    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('tabindex="-1"');
  });

  test("anchor links to the heading ID", () => {
    const html = processMarkdown("## Specific section {#my-id}");
    expect(html).toContain('href="#my-id"');
  });

  test("works with all heading levels", () => {
    const md = "# H1\n\n## H2\n\n### H3\n\n#### H4";
    const html = processMarkdown(md);
    expect(html.match(/at-heading-anchor/g)).toHaveLength(4);
  });
});
