import { describe, expect, test } from "vitest";
import { remark } from "remark";
import remarkRehype from "remark-rehype";
import rehypeStringify from "rehype-stringify";
import rehypeBaseLinks from "./rehype-base-links.js";

function processMarkdown(md: string, base: string): string {
  return String(
    remark()
      .use(remarkRehype, { allowDangerousHtml: true })
      .use(rehypeBaseLinks, { base })
      .use(rehypeStringify, { allowDangerousHtml: true })
      .processSync(md),
  );
}

describe("rehype-base-links", () => {
  test("prefixes root-absolute links with the base", () => {
    const html = processMarkdown("[crits](/crits/)", "/courses/comp4020");
    expect(html).toContain('href="/courses/comp4020/crits/"');
  });

  test("prefixes root-absolute image sources", () => {
    const html = processMarkdown("![photo](/images/photo.avif)", "/courses/comp4020");
    expect(html).toContain('src="/courses/comp4020/images/photo.avif"');
  });

  test("handles base with trailing slash", () => {
    const html = processMarkdown("[crits](/crits/)", "/courses/comp4020/");
    expect(html).toContain('href="/courses/comp4020/crits/"');
  });

  test("leaves already-prefixed links alone", () => {
    const html = processMarkdown("[crits](/courses/comp4020/crits/)", "/courses/comp4020");
    expect(html).toContain('href="/courses/comp4020/crits/"');
    expect(html).not.toContain("/courses/comp4020/courses/comp4020");
  });

  test("leaves relative links alone", () => {
    const html = processMarkdown("[up](../crits/)", "/courses/comp4020");
    expect(html).toContain('href="../crits/"');
  });

  test("leaves external and protocol-relative URLs alone", () => {
    const html = processMarkdown(
      "[ext](https://www.example.edu/) [pr](//example.com/x)",
      "/courses/comp4020",
    );
    expect(html).toContain('href="https://www.example.edu/"');
    expect(html).toContain('href="//example.com/x"');
  });

  test("leaves fragment links alone", () => {
    const html = processMarkdown("[section](#section)", "/courses/comp4020");
    expect(html).toContain('href="#section"');
  });

  test("no-op when base is /", () => {
    const html = processMarkdown("[crits](/crits/)", "/");
    expect(html).toContain('href="/crits/"');
  });

  test("no-op when base is empty", () => {
    const html = processMarkdown("[crits](/crits/)", "");
    expect(html).toContain('href="/crits/"');
  });
});
