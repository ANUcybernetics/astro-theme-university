import { describe, expect, test } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkBaseLinks, checkBaseLinksHtml, collectHtmlFiles } from "./link-checker.js";
import { fsTest } from "./test-utils.js";

describe("collectHtmlFiles", () => {
  fsTest("finds all html files recursively", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "about"), { recursive: true });
    await writeFile(join(tmpDir, "index.html"), "<html></html>");
    await writeFile(join(tmpDir, "about", "index.html"), "<html></html>");
    await writeFile(join(tmpDir, "style.css"), "body {}");

    const files = await collectHtmlFiles(tmpDir);
    expect(files).toHaveLength(2);
    expect(files.every((f) => f.endsWith(".html"))).toBe(true);
  });

  fsTest("returns empty array for directory with no html files", async ({ tmpDir }) => {
    await writeFile(join(tmpDir, "readme.md"), "# Hello");

    const files = await collectHtmlFiles(tmpDir);
    expect(files).toHaveLength(0);
  });
});

describe("checkBaseLinksHtml", () => {
  const base = "/courses/comp4020";

  test("flags root-absolute links outside the base", () => {
    const violations = checkBaseLinksHtml('<a href="/crits/">crits</a>', "/index.html", base);
    expect(violations).toEqual([{ page: "/index.html", link: "/crits/" }]);
  });

  test("flags root-absolute image sources outside the base", () => {
    const violations = checkBaseLinksHtml('<img src="/images/x.avif">', "/index.html", base);
    expect(violations).toEqual([{ page: "/index.html", link: "/images/x.avif" }]);
  });

  test("passes links under the base", () => {
    const html = '<a href="/courses/comp4020/crits/">crits</a><a href="/courses/comp4020">home</a>';
    expect(checkBaseLinksHtml(html, "/index.html", base)).toHaveLength(0);
  });

  test("ignores relative, fragment, external, and protocol-relative links", () => {
    const html =
      '<a href="../up/">up</a><a href="#main">skip</a>' +
      '<a href="https://www.example.edu/">ext</a><a href="//example.com/x">pr</a>' +
      '<a href="mailto:x@example.com">mail</a>';
    expect(checkBaseLinksHtml(html, "/index.html", base)).toHaveLength(0);
  });

  test("no violations when base is / or empty", () => {
    const html = '<a href="/crits/">crits</a>';
    expect(checkBaseLinksHtml(html, "/index.html", "/")).toHaveLength(0);
    expect(checkBaseLinksHtml(html, "/index.html", "")).toHaveLength(0);
  });

  test("handles base with trailing slash", () => {
    const violations = checkBaseLinksHtml(
      '<a href="/crits/">bad</a><a href="/courses/comp4020/crits/">good</a>',
      "/index.html",
      "/courses/comp4020/",
    );
    expect(violations).toEqual([{ page: "/index.html", link: "/crits/" }]);
  });
});

describe("checkBaseLinks", () => {
  fsTest("walks dist html and reports violations per page", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "crits"), { recursive: true });
    await writeFile(join(tmpDir, "index.html"), '<a href="/courses/comp4020/crits/">ok</a>');
    await writeFile(join(tmpDir, "crits", "index.html"), '<a href="/topics/x/">bad</a>');

    const { checked, violations } = await checkBaseLinks(tmpDir, "/courses/comp4020");
    expect(checked).toBe(2);
    expect(violations).toEqual([{ page: "/crits/", link: "/topics/x/" }]);
  });
});
