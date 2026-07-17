import { describe, expect, test } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import {
  parseFrontmatter,
  stripMdxSyntax,
  absolutiseLinks,
  generateLlmsTxt,
  generateLlmsFullTxt,
  readContentEntries,
  readSiteEntries,
  findUnroutedEntries,
} from "./llms-txt.js";
import type { LlmsEntry, LlmsTxtOptions } from "./llms-txt.js";
import { fsTest } from "./test-utils.js";

const OPTIONS: LlmsTxtOptions = {
  siteName: "Test Site",
  siteDescription: "A test site for testing.",
  siteUrl: "https://example.com",
};

describe("parseFrontmatter", () => {
  test("parses simple key-value frontmatter", () => {
    const { data, body } = parseFrontmatter(
      "---\ntitle: Hello\ndescription: A page\n---\n\nContent here.\n",
    );
    expect(data.title).toBe("Hello");
    expect(data.description).toBe("A page");
    expect(body).toBe("\nContent here.\n");
  });

  test("handles quoted values", () => {
    const { data } = parseFrontmatter('---\ntitle: "Hello World"\n---\n\nBody.\n');
    expect(data.title).toBe("Hello World");
  });

  test("handles single-quoted values", () => {
    const { data } = parseFrontmatter("---\ntitle: 'Hello World'\n---\n\nBody.\n");
    expect(data.title).toBe("Hello World");
  });

  test("returns empty data when no frontmatter", () => {
    const { data, body } = parseFrontmatter("# Just a heading\n\nSome content.\n");
    expect(data).toEqual({});
    expect(body).toBe("# Just a heading\n\nSome content.\n");
  });

  test("skips keys with empty values", () => {
    const { data } = parseFrontmatter("---\ntitle: Hello\ndescription:\n---\n\nBody.\n");
    expect(data.title).toBe("Hello");
    expect(data.description).toBeUndefined();
  });

  test("handles quoted values containing colons", () => {
    const { data } = parseFrontmatter('---\ntitle: "Hello: World"\n---\n\nBody.\n');
    expect(data.title).toBe("Hello: World");
  });

  test("parses boolean values", () => {
    const { data } = parseFrontmatter("---\ntitle: Hi\npublished: false\n---\n\nBody.\n");
    expect(data.published).toBe(false);
  });

  test("parses array values", () => {
    const { data } = parseFrontmatter("---\ntags:\n  - one\n  - two\n---\n\nBody.\n");
    expect(data.tags).toEqual(["one", "two"]);
  });

  test("handles windows-style line endings", () => {
    const { data, body } = parseFrontmatter("---\r\ntitle: Hello\r\n---\r\n\r\nContent.\r\n");
    expect(data.title).toBe("Hello");
    expect(body).toContain("Content.");
  });
});

describe("stripMdxSyntax", () => {
  test("removes import statements", () => {
    const input =
      'import { Card } from "astro-theme-university/components/Card.astro";\n\n# Hello\n\nContent.\n';
    const result = stripMdxSyntax(input);
    expect(result).not.toContain("import");
    expect(result).toContain("# Hello");
    expect(result).toContain("Content.");
  });

  test("removes multiple imports", () => {
    const input =
      'import Card from "../components/Card.astro";\nimport Hero from "../components/Hero.astro";\n\n# Hello\n';
    const result = stripMdxSyntax(input);
    expect(result).not.toContain("import");
    expect(result).toContain("# Hello");
  });

  test("preserves non-import content", () => {
    const input = "# Hello\n\nThis imports data from the API.\n";
    const result = stripMdxSyntax(input);
    expect(result).toBe(input);
  });

  test("preserves code blocks containing imports", () => {
    const input = "# Hello\n\n```js\nimport foo from 'bar';\n```\n";
    const result = stripMdxSyntax(input);
    expect(result).toBe(input);
  });

  test("handles empty body", () => {
    expect(stripMdxSyntax("")).toBe("");
  });
});

describe("generateLlmsTxt", () => {
  const entries: LlmsEntry[] = [
    { url: "/guides/deploying/", title: "Deploying", description: "How to deploy", body: "" },
    {
      url: "/getting-started/",
      title: "Getting started",
      description: "Quick start guide",
      body: "",
    },
    { url: "/components/card/", title: "Card", body: "" },
  ];

  test("produces valid llms.txt format", () => {
    const result = generateLlmsTxt(OPTIONS, entries);
    expect(result).toContain("# Test Site");
    expect(result).toContain("> A test site for testing.");
    expect(result).toContain("## Pages");
  });

  test("sorts entries by URL", () => {
    const result = generateLlmsTxt(OPTIONS, entries);
    const lines = result.split("\n");
    const entryLines = lines.filter((l) => l.startsWith("- ["));
    expect(entryLines[0]).toContain("Card");
    expect(entryLines[1]).toContain("Getting started");
    expect(entryLines[2]).toContain("Deploying");
  });

  test("includes description when present", () => {
    const result = generateLlmsTxt(OPTIONS, entries);
    expect(result).toContain("[Deploying](https://example.com/guides/deploying/): How to deploy");
  });

  test("omits description when absent", () => {
    const result = generateLlmsTxt(OPTIONS, entries);
    expect(result).toContain("- [Card](https://example.com/components/card/)");
    expect(result).not.toContain("[Card](https://example.com/components/card/):");
  });

  test("omits description blockquote when no siteDescription", () => {
    const result = generateLlmsTxt({ ...OPTIONS, siteDescription: undefined }, entries);
    expect(result).not.toContain(">");
  });

  test("handles empty entries", () => {
    const result = generateLlmsTxt(OPTIONS, []);
    expect(result).toContain("# Test Site");
    expect(result).toContain("## Pages");
  });

  test("uses preamble instead of generated header when provided", () => {
    const preamble = "# My Site\n\n> Custom description.\n\nThis site is about testing.";
    const result = generateLlmsTxt({ ...OPTIONS, preamble }, entries);
    expect(result).toContain("# My Site");
    expect(result).toContain("Custom description.");
    expect(result).toContain("This site is about testing.");
    expect(result).not.toContain("# Test Site");
    expect(result).toContain("## Pages");
  });

  test("appends page list after preamble", () => {
    const preamble = "# My Site\n\nSome context.";
    const result = generateLlmsTxt({ ...OPTIONS, preamble }, entries);
    const preambleIdx = result.indexOf("Some context.");
    const pagesIdx = result.indexOf("## Pages");
    expect(preambleIdx).toBeLessThan(pagesIdx);
  });

  test("strips trailing slash from siteUrl", () => {
    const result = generateLlmsTxt({ ...OPTIONS, siteUrl: "https://example.com/" }, entries);
    expect(result).toContain("https://example.com/components/card/");
    expect(result).not.toContain("https://example.com//");
  });

  test("marks draft entries", () => {
    const withDraft: LlmsEntry[] = [
      { url: "/a/", title: "A", description: "First", body: "", draft: true },
      { url: "/b/", title: "B", body: "", draft: true },
      { url: "/c/", title: "C", description: "Third", body: "" },
    ];
    const result = generateLlmsTxt(OPTIONS, withDraft);
    expect(result).toContain("- [A](https://example.com/a/) (draft): First");
    expect(result).toContain("- [B](https://example.com/b/) (draft)");
    expect(result).toContain("- [C](https://example.com/c/): Third");
    expect(result).not.toContain("C](https://example.com/c/) (draft)");
  });

  test("keeps a base sub-path in siteUrl", () => {
    const result = generateLlmsTxt(
      { ...OPTIONS, siteUrl: "https://example.com/courses/demo/" },
      entries,
    );
    expect(result).toContain("https://example.com/courses/demo/components/card/");
  });
});

describe("absolutiseLinks", () => {
  test("rewrites root-relative links to absolute URLs", () => {
    const result = absolutiseLinks(
      "See the [assessment page](/topics/assessment/).",
      OPTIONS.siteUrl,
    );
    expect(result).toBe("See the [assessment page](https://example.com/topics/assessment/).");
  });

  test("includes the base sub-path", () => {
    const result = absolutiseLinks("[Crits](/crits/)", "https://example.com/courses/demo/");
    expect(result).toBe("[Crits](https://example.com/courses/demo/crits/)");
  });

  test("rewrites image links", () => {
    const result = absolutiseLinks("![hero](/images/hero.avif)", OPTIONS.siteUrl);
    expect(result).toBe("![hero](https://example.com/images/hero.avif)");
  });

  test("leaves absolute and protocol-relative URLs alone", () => {
    const input = "[ext](https://other.org/page/) and [pr](//cdn.example.com/x)";
    expect(absolutiseLinks(input, OPTIONS.siteUrl)).toBe(input);
  });

  test("leaves code blocks untouched", () => {
    const input = "```md\n[link](/inside/code/)\n```\n\n[real](/outside/)";
    const result = absolutiseLinks(input, OPTIONS.siteUrl);
    expect(result).toContain("[link](/inside/code/)");
    expect(result).toContain("[real](https://example.com/outside/)");
  });
});

describe("generateLlmsFullTxt", () => {
  const entries: LlmsEntry[] = [
    { url: "/alpha/", title: "Alpha", description: "First page", body: "Alpha content here." },
    { url: "/beta/", title: "Beta", body: "Beta content here." },
  ];

  test("includes title headings for each entry", () => {
    const result = generateLlmsFullTxt(OPTIONS, entries);
    expect(result).toContain("# Alpha");
    expect(result).toContain("# Beta");
  });

  test("includes description blockquote when present", () => {
    const result = generateLlmsFullTxt(OPTIONS, entries);
    expect(result).toContain("> First page");
  });

  test("omits description blockquote when absent", () => {
    const result = generateLlmsFullTxt(OPTIONS, entries);
    const betaSection = result.split("---").find((s) => s.includes("# Beta"))!;
    expect(betaSection).not.toContain(">");
  });

  test("includes body content", () => {
    const result = generateLlmsFullTxt(OPTIONS, entries);
    expect(result).toContain("Alpha content here.");
    expect(result).toContain("Beta content here.");
  });

  test("separates entries with horizontal rules", () => {
    const result = generateLlmsFullTxt(OPTIONS, entries);
    expect(result).toContain("---");
  });

  test("sorts entries by URL", () => {
    const result = generateLlmsFullTxt(OPTIONS, entries);
    expect(result.indexOf("Alpha")).toBeLessThan(result.indexOf("Beta"));
  });

  test("absolutises root-relative links in bodies", () => {
    const withLink: LlmsEntry[] = [
      { url: "/a/", title: "A", body: "See [the crits page](/crits/) for details." },
    ];
    const result = generateLlmsFullTxt(OPTIONS, withLink);
    expect(result).toContain("[the crits page](https://example.com/crits/)");
  });

  test("marks draft entries after the description", () => {
    const withDraft: LlmsEntry[] = [
      { url: "/a/", title: "A", description: "First", body: "Content.", draft: true },
      { url: "/b/", title: "B", body: "Content.", draft: false },
    ];
    const result = generateLlmsFullTxt(OPTIONS, withDraft);
    const aSection = result.split("---").find((s) => s.includes("# A"))!;
    const bSection = result.split("---").find((s) => s.includes("# B"))!;
    expect(aSection).toContain("> First\n\n_Draft: this page is published but not yet final._");
    expect(bSection).not.toContain("_Draft");
  });
});

describe("readContentEntries", () => {
  fsTest("reads markdown files from a directory", async ({ tmpDir }) => {
    await writeFile(
      join(tmpDir, "hello.md"),
      "---\ntitle: Hello\ndescription: A greeting\n---\n\nHello world.\n",
    );

    const entries = await readContentEntries(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("Hello");
    expect(entries[0].description).toBe("A greeting");
    expect(entries[0].body).toContain("Hello world.");
  });

  fsTest("reads mdx files", async ({ tmpDir }) => {
    await writeFile(
      join(tmpDir, "page.mdx"),
      '---\ntitle: Page\n---\n\nimport Card from "./Card.astro";\n\n# Hello\n\n<Card />\n',
    );

    const entries = await readContentEntries(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].body).not.toContain("import");
    expect(entries[0].body).toContain("# Hello");
  });

  fsTest("reads files from nested directories", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "guides"), { recursive: true });
    await writeFile(
      join(tmpDir, "guides", "deploying.md"),
      "---\ntitle: Deploying\n---\n\nDeploy steps.\n",
    );

    const entries = await readContentEntries(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe("/guides/deploying/");
  });

  fsTest("carries the draft flag through from frontmatter", async ({ tmpDir }) => {
    await writeFile(
      join(tmpDir, "wip.md"),
      "---\ntitle: WIP\ndraft: true\n---\n\nIndicative content.\n",
    );
    await writeFile(join(tmpDir, "final.md"), "---\ntitle: Final\n---\n\nFinal content.\n");

    const entries = await readContentEntries(tmpDir);
    const wip = entries.find((e) => e.title === "WIP")!;
    const final = entries.find((e) => e.title === "Final")!;
    expect(wip.draft).toBe(true);
    expect(final.draft).toBeUndefined();
  });

  fsTest("filters out unpublished entries", async ({ tmpDir }) => {
    await writeFile(
      join(tmpDir, "draft.md"),
      "---\ntitle: Draft\npublished: false\n---\n\nDraft content.\n",
    );
    await writeFile(
      join(tmpDir, "live.md"),
      "---\ntitle: Live\npublished: true\n---\n\nLive content.\n",
    );

    const entries = await readContentEntries(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("Live");
  });

  fsTest("skips files without a title", async ({ tmpDir }) => {
    await writeFile(
      join(tmpDir, "no-title.md"),
      "---\ndescription: No title here\n---\n\nContent.\n",
    );
    await writeFile(join(tmpDir, "has-title.md"), "---\ntitle: Has Title\n---\n\nContent.\n");

    const entries = await readContentEntries(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("Has Title");
  });

  fsTest("does not fall back to legacy summary frontmatter", async ({ tmpDir }) => {
    await writeFile(
      join(tmpDir, "topic.md"),
      "---\ntitle: Topic\nsummary: A summary\n---\n\nContent.\n",
    );

    const entries = await readContentEntries(tmpDir);
    expect(entries[0].description).toBeUndefined();
  });

  fsTest("ignores non-markdown files", async ({ tmpDir }) => {
    await writeFile(join(tmpDir, "page.md"), "---\ntitle: Page\n---\n\nContent.\n");
    await writeFile(join(tmpDir, "style.css"), "body {}");
    await writeFile(join(tmpDir, "config.json"), "{}");

    const entries = await readContentEntries(tmpDir);
    expect(entries).toHaveLength(1);
  });

  fsTest("returns empty array for empty directory", async ({ tmpDir }) => {
    const entries = await readContentEntries(tmpDir);
    expect(entries).toEqual([]);
  });

  fsTest("generates correct URL for index files", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "about"), { recursive: true });
    await writeFile(join(tmpDir, "about", "index.md"), "---\ntitle: About\n---\n\nAbout us.\n");

    const entries = await readContentEntries(tmpDir);
    expect(entries[0].url).toBe("/about/");
  });

  fsTest("returns empty array for a missing directory", async ({ tmpDir }) => {
    const entries = await readContentEntries(join(tmpDir, "does-not-exist"));
    expect(entries).toEqual([]);
  });
});

describe("readSiteEntries", () => {
  fsTest("reads entries from both content and pages", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "content", "topics"), { recursive: true });
    await mkdir(join(tmpDir, "pages", "crits"), { recursive: true });
    await writeFile(
      join(tmpDir, "content", "topics", "agents.md"),
      "---\ntitle: Agents\n---\n\nAgent loops.\n",
    );
    await writeFile(
      join(tmpDir, "pages", "crits", "index.mdx"),
      "---\ntitle: Crits\n---\n\nCrit schedule.\n",
    );

    const entries = await readSiteEntries(tmpDir);
    const urls = entries.map((e) => e.url).sort();
    expect(urls).toEqual(["/crits/", "/topics/agents/"]);
  });

  fsTest("maps a root pages index to /", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "pages"), { recursive: true });
    await writeFile(join(tmpDir, "pages", "index.mdx"), "---\ntitle: Home\n---\n\nWelcome.\n");

    const entries = await readSiteEntries(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe("/");
  });

  fsTest("page wins over content on a URL collision", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "content", "guides"), { recursive: true });
    await mkdir(join(tmpDir, "pages", "guides"), { recursive: true });
    await writeFile(
      join(tmpDir, "content", "guides", "setup.md"),
      "---\ntitle: Setup (content)\n---\n\nContent body.\n",
    );
    await writeFile(
      join(tmpDir, "pages", "guides", "setup.mdx"),
      "---\ntitle: Setup (page)\n---\n\nPage body.\n",
    );

    const entries = await readSiteEntries(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].title).toBe("Setup (page)");
  });

  fsTest(
    "maps the pages collection to the site root, other collections keep their directory",
    async ({ tmpDir }) => {
      await mkdir(join(tmpDir, "content", "pages"), { recursive: true });
      await mkdir(join(tmpDir, "content", "news"), { recursive: true });
      await writeFile(
        join(tmpDir, "content", "pages", "about.md"),
        "---\ntitle: About\n---\n\nBody.\n",
      );
      await writeFile(
        join(tmpDir, "content", "news", "launch.md"),
        "---\ntitle: Launch\n---\n\nBody.\n",
      );

      const entries = await readSiteEntries(tmpDir);
      expect(entries.map((e) => e.url).toSorted()).toEqual(["/about/", "/news/launch/"]);
    },
  );

  fsTest("tolerates a missing pages or content directory", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "content"), { recursive: true });
    await writeFile(join(tmpDir, "content", "only.md"), "---\ntitle: Only\n---\n\nBody.\n");

    const entries = await readSiteEntries(tmpDir);
    expect(entries).toHaveLength(1);
    expect(entries[0].url).toBe("/only/");
  });
});

describe("full pipeline", () => {
  fsTest("reads content and generates both output files", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "guides"), { recursive: true });
    await writeFile(
      join(tmpDir, "intro.md"),
      "---\ntitle: Introduction\ndescription: Getting started\n---\n\nWelcome to the site.\n",
    );
    await writeFile(
      join(tmpDir, "guides", "setup.md"),
      "---\ntitle: Setup Guide\ndescription: How to set up\n---\n\nStep 1: Install.\n\nStep 2: Configure.\n",
    );

    const entries = await readContentEntries(tmpDir);
    const llmsTxt = generateLlmsTxt(OPTIONS, entries);
    const llmsFullTxt = generateLlmsFullTxt(OPTIONS, entries);

    expect(llmsTxt).toContain("# Test Site");
    expect(llmsTxt).toContain("[Introduction](https://example.com/intro/)");
    expect(llmsTxt).toContain("[Setup Guide](https://example.com/guides/setup/)");

    expect(llmsFullTxt).toContain("Welcome to the site.");
    expect(llmsFullTxt).toContain("Step 1: Install.");
    expect(llmsFullTxt).toContain("---");
  });
});

describe("findUnroutedEntries", () => {
  const entry = (url: string): LlmsEntry => ({ url, title: "T", body: "" });

  fsTest("passes entries whose page exists in directory format", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "guides", "setup"), { recursive: true });
    await writeFile(join(tmpDir, "index.html"), "<html></html>");
    await writeFile(join(tmpDir, "guides", "setup", "index.html"), "<html></html>");

    expect(findUnroutedEntries(tmpDir, [entry("/"), entry("/guides/setup/")])).toEqual([]);
  });

  fsTest("passes entries whose page exists in file format", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "guides"), { recursive: true });
    await writeFile(join(tmpDir, "guides", "setup.html"), "<html></html>");

    expect(findUnroutedEntries(tmpDir, [entry("/guides/setup/")])).toEqual([]);
  });

  fsTest("reports entries with no built page", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "real"), { recursive: true });
    await writeFile(join(tmpDir, "real", "index.html"), "<html></html>");

    expect(findUnroutedEntries(tmpDir, [entry("/real/"), entry("/orphaned/")])).toEqual([
      "/orphaned/",
    ]);
  });

  fsTest("reports the root URL when dist has no index.html", async ({ tmpDir }) => {
    expect(findUnroutedEntries(tmpDir, [entry("/")])).toEqual(["/"]);
  });
});
