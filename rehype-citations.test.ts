import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import rehypeCitation from "rehype-citation";
import rehypeStringify from "rehype-stringify";
import { remark } from "remark";
import remarkRehype from "remark-rehype";
import { beforeAll, describe, expect, test } from "vitest";
import { type CitationAttacher, createCitationPlugin } from "./rehype-citations.js";

const BIB = `
@book{doet,
  title = {The design of everyday things},
  author = {Norman, Don},
  year = 2013,
  publisher = {Basic books}
}

@inproceedings{affordances,
  title = {Technology affordances},
  author = {Gaver, William W},
  booktitle = {Proceedings of the SIGCHI Conference on Human Factors in Computing Systems},
  pages = {79--84},
  year = 1991
}
`;

let dir: string;

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "at-citations-"));
  writeFileSync(join(dir, "references.bib"), BIB);
});

/** Run markdown through the plugin, with `frontmatter` exposed where Astro
 *  puts it on the vfile. */
async function process(md: string, frontmatter: Record<string, unknown> = {}): Promise<string> {
  const file = await remark()
    .use(remarkRehype)
    .use(
      createCitationPlugin(rehypeCitation as unknown as CitationAttacher, {
        bibliography: "references.bib",
        path: dir,
      }),
    )
    .use(rehypeStringify)
    .process({ value: md, data: { astro: { frontmatter } } });
  return String(file);
}

describe("citations", () => {
  test("renders an in-text citation in the configured style", async () => {
    const html = await process("Affordances [@doet].\n\n## References\n\n[^ref]\n");
    expect(html).toContain("(Norman, 2013)");
    expect(html).not.toContain("[@doet]");
  });

  test("renders the reference list at the [^ref] marker", async () => {
    const html = await process("Affordances [@doet].\n\n## References\n\n[^ref]\n");
    const marker = html.indexOf("References</h2>");
    expect(marker).toBeGreaterThan(-1);
    expect(html.indexOf('id="refs"')).toBeGreaterThan(marker);
    expect(html).not.toContain("[^ref]");
  });

  test("collapses a multi-work citation into one reference list", async () => {
    const html = await process("Both [@doet; @affordances].\n\n[^ref]\n");
    expect(html).toContain("Norman");
    expect(html).toContain("Gaver");
    expect(html.match(/csl-entry/g)).toHaveLength(2);
  });

  test("nocite frontmatter lists works the page never cites", async () => {
    const html = await process("No citations here.\n\n[^ref]\n", { nocite: "@*" });
    expect(html.match(/csl-entry/g)).toHaveLength(2);
    expect(html).toContain("Norman");
    expect(html).toContain("Gaver");
  });

  test("a page without nocite lists only what it cites", async () => {
    const html = await process("Just one [@doet].\n\n[^ref]\n");
    expect(html.match(/csl-entry/g)).toHaveLength(1);
    expect(html).not.toContain("Gaver");
  });
});
