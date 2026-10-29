import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { basename, extname, join, relative } from "node:path";
import { parse as parseYaml } from "yaml";
import { type Citation, citationFooter, citationLlmsBlock } from "./citation.js";

export interface LlmsEntry {
  url: string;
  title: string;
  description?: string;
  body: string;
  /** `draft: true` frontmatter — the page is published but marked as
   *  not-yet-final, and both llms outputs carry the marker so machine
   *  readers get the same epistemic signal as the on-page badge. */
  draft?: boolean;
  /** Listed in llms.txt and given its own markdown page, but left out of
   *  llms-full.txt. Slide decks set it: their prose restates pages the full
   *  text already carries. */
  excludeFromFullText?: boolean;
  /** Built at its URL and given its markdown twin, but kept out of llms.txt
   *  and llms-full.txt, which are indexes. Unlisted decks set it. */
  unlisted?: boolean;
}

export interface LlmsTxtOptions {
  siteName: string;
  siteDescription?: string;
  siteUrl: string;
  preamble?: string;
  /** Markdown placed after the preamble and before the page index, for
   *  site-generated context (key dates, say) a hand-written preamble would
   *  restate and let drift. */
  extra?: string;
  /** Character length of llms-full.txt, so the index can say what fetching
   *  it costs. */
  fullTextLength?: number;
  /** The site's citation: a "Citing this site" block in llms.txt and a
   *  source footer on every page in llms-full.txt. */
  citation?: Citation | null;
}

/** URL order with numeric collation: `/week-10/` sorts after `/week-9/`. */
function byUrl(a: LlmsEntry, b: LlmsEntry): number {
  return a.url.localeCompare(b.url, "en", { numeric: true });
}

/** The markdown twin of a built page, per the llms.txt convention: the
 *  page's HTML path with `.md` appended (`topics/x/index.html` →
 *  `topics/x/index.html.md`). */
export function markdownPath(builtPage: string): string {
  return `${builtPage}.md`;
}

export function parseFrontmatter(source: string): {
  data: Record<string, unknown>;
  body: string;
} {
  const match = source.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?([\s\S]*)$/);
  if (!match) return { data: {}, body: source };

  let raw: unknown;
  try {
    raw = parseYaml(match[1]);
  } catch {
    return { data: {}, body: match[2] };
  }

  if (typeof raw !== "object" || raw === null) {
    return { data: {}, body: match[2] };
  }

  const data: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(raw)) {
    if (value !== null && value !== undefined) data[key] = value;
  }

  return { data, body: match[2] };
}

export function stripMdxSyntax(body: string): string {
  const lines = body.split("\n");
  const result: string[] = [];
  let inCodeBlock = false;

  for (const line of lines) {
    if (line.trimStart().startsWith("```")) {
      inCodeBlock = !inCodeBlock;
    }
    if (!inCodeBlock && /^\s*import\s+.*from\s+["']/.test(line)) continue;
    result.push(line);
  }

  return result.join("\n").replace(/^\s*\n/, "");
}

/** Rewrite root-relative markdown link targets (`](/…`) to absolute URLs so
 *  they resolve for readers of the standalone text file. Code blocks are left
 *  untouched; protocol-relative (`//…`) and absolute URLs never match. */
export function absolutiseLinks(body: string, siteUrl: string): string {
  const root = siteUrl.replace(/\/$/, "");
  const lines = body.split("\n");
  let inCodeBlock = false;

  return lines
    .map((line) => {
      if (line.trimStart().startsWith("```")) {
        inCodeBlock = !inCodeBlock;
        return line;
      }
      return inCodeBlock ? line : line.replace(/\]\(\/(?!\/)/g, `](${root}/`);
    })
    .join("\n");
}

/** One page as standalone markdown: the body every llms output shares, ending
 *  with the citation footer when the site has a citation. */
export function renderEntryMarkdown(
  entry: LlmsEntry,
  siteUrl: string,
  citation?: Citation | null,
): string {
  const lines = [`# ${entry.title}`, ""];
  if (entry.description) {
    lines.push(`> ${entry.description}`, "");
  }
  if (entry.draft) {
    lines.push(`_Draft: this page is published but not yet final._`, "");
  }
  lines.push(absolutiseLinks(entry.body.trim(), siteUrl), "");
  if (citation) {
    lines.push(citationFooter(citation, `${siteUrl.replace(/\/$/, "")}${entry.url}`));
  }
  return lines.join("\n");
}

/** Group entries into llms.txt sections by their first path segment. A
 *  segment with more than one page becomes its own section, headed by its
 *  listing page's title (or the segment name); the rest share "Pages". */
function sectionise(entries: LlmsEntry[]): { heading: string; entries: LlmsEntry[] }[] {
  const groups = new Map<string, LlmsEntry[]>();
  for (const entry of entries) {
    const segment = entry.url.split("/")[1] ?? "";
    groups.set(segment, [...(groups.get(segment) ?? []), entry]);
  }

  const pages: LlmsEntry[] = [];
  const sections: { heading: string; entries: LlmsEntry[] }[] = [];
  for (const [segment, group] of groups) {
    if (!segment || group.length === 1) {
      pages.push(...group);
      continue;
    }
    const listing = group.find((e) => e.url === `/${segment}/`);
    const heading = listing?.title ?? segment.charAt(0).toUpperCase() + segment.slice(1);
    sections.push({ heading, entries: group });
  }

  return pages.length > 0 ? [{ heading: "Pages", entries: pages }, ...sections] : sections;
}

export function generateLlmsTxt(options: LlmsTxtOptions, entries: LlmsEntry[]): string {
  const root = options.siteUrl.replace(/\/$/, "");
  const listed = entries.filter((entry) => !entry.unlisted);
  const sorted = listed.toSorted(byUrl);
  const lines: string[] = [];

  if (options.preamble) {
    lines.push(absolutiseLinks(options.preamble.trimEnd(), options.siteUrl), "");
  } else {
    lines.push(`# ${options.siteName}`, "");
    if (options.siteDescription) {
      lines.push(`> ${options.siteDescription}`, "");
    }
  }

  if (options.fullTextLength !== undefined) {
    const tokens = Math.round(options.fullTextLength / 4 / 1000);
    const skipsDecks = listed.some((e) => e.excludeFromFullText);
    lines.push(
      `Every page below is also served as markdown at its HTML path plus \`.md\` ` +
        `(\`${root}/a/\` → \`${root}/a/index.html.md\`), linked from its head. ` +
        `[llms-full.txt](${root}/llms-full.txt) has every page's text in one file ` +
        `(about ${tokens}k tokens${skipsDecks ? "; slide decks are left out" : ""}).`,
      "",
    );
  }

  if (options.citation) {
    lines.push(citationLlmsBlock(options.citation));
  }

  if (options.extra) {
    lines.push(absolutiseLinks(options.extra.trim(), options.siteUrl), "");
  }

  for (const section of sectionise(sorted)) {
    lines.push(`## ${section.heading}`, "");
    for (const entry of section.entries) {
      const url = `${root}${entry.url}`;
      const marker = entry.draft ? " (draft)" : "";
      if (entry.description) {
        lines.push(`- [${entry.title}](${url})${marker}: ${entry.description}`);
      } else {
        lines.push(`- [${entry.title}](${url})${marker}`);
      }
    }
    lines.push("");
  }

  return lines.join("\n");
}

export function generateLlmsFullTxt(options: LlmsTxtOptions, entries: LlmsEntry[]): string {
  return entries
    .filter((entry) => !entry.excludeFromFullText && !entry.unlisted)
    .toSorted(byUrl)
    .map((entry) => renderEntryMarkdown(entry, options.siteUrl, options.citation))
    .join("\n---\n\n");
}

async function collectFiles(dir: string, skipUnderscored: boolean): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
      if (skipUnderscored && entry.name.startsWith("_")) continue;
      const fullPath = join(current, entry.name);
      if (entry.isDirectory()) {
        await walk(fullPath);
      } else if (/\.(md|mdx)$/.test(entry.name)) {
        results.push(fullPath);
      }
    }
  }

  await walk(dir);
  return results;
}

function filePathToUrl(filePath: string, contentDir: string): string {
  const rel = relative(contentDir, filePath);
  const withoutExt = rel.slice(0, -extname(rel).length);
  const name = basename(withoutExt);
  const dir = withoutExt.slice(0, -(name.length + 1)) || "";

  if (name === "index") {
    return `/${dir}/`.replace(/\/+/g, "/");
  }

  const slug = dir ? `${dir}/${name}` : name;
  return `/${slug}/`;
}

/** `skipUnderscored` mirrors Astro's routing rule for src/pages: a file or
 *  directory whose name starts with `_` never becomes a route. */
export async function readContentEntries(
  contentDir: string,
  { skipUnderscored = false }: { skipUnderscored?: boolean } = {},
): Promise<LlmsEntry[]> {
  if (!existsSync(contentDir)) return [];
  const files = await collectFiles(contentDir, skipUnderscored);
  const entries: LlmsEntry[] = [];

  for (const filePath of files) {
    const source = await readFile(filePath, "utf-8");
    const { data, body } = parseFrontmatter(source);

    // `published: false` is out of the build; `unlisted: true` stays in it
    // at its own URL but out of every index, and llms.txt is an index —
    // matching the noindex + pagefind-ignore the layout already emits.
    if (data.published === false || data.unlisted === true) continue;

    const title = data.title;
    if (typeof title !== "string" || !title) continue;

    const description = typeof data.description === "string" ? data.description : undefined;

    const cleanBody = stripMdxSyntax(body);
    const url = filePathToUrl(filePath, contentDir);

    entries.push({
      url,
      title,
      description,
      body: cleanBody,
      ...(data.draft === true && { draft: true }),
    });
  }

  return entries;
}

export async function readSiteEntries(srcDir: string): Promise<LlmsEntry[]> {
  // The theme's page-collection convention (definePageCollection + a root
  // catch-all) renders src/content/pages/<id> at /<id>/ — strip the
  // collection segment to match. Other collections keep their directory
  // name in the URL (src/content/news/<id> → /news/<id>/).
  const contentEntries = (await readContentEntries(join(srcDir, "content"))).map((entry) => ({
    ...entry,
    url: entry.url.replace(/^\/pages\//, "/"),
  }));
  const pageEntries = await readContentEntries(join(srcDir, "pages"), { skipUnderscored: true });

  // A file in src/pages owns its route, so on a URL collision the page wins.
  const pageUrls = new Set(pageEntries.map((e) => e.url));
  return [...pageEntries, ...contentEntries.filter((e) => !pageUrls.has(e.url))];
}

/** Entry URLs are derived from source file paths, not from the router, so a
 *  custom route mapping (or none at all) silently orphans them. Returns the
 *  URLs with no matching page in dist — either directory format
 *  (`<url>/index.html`) or file format (`<url>.html`). */
export function findUnroutedEntries(distPath: string, entries: LlmsEntry[]): string[] {
  return entries.filter((entry) => builtPagePath(distPath, entry) === null).map((e) => e.url);
}

/** The dist-relative HTML file an entry built to, in either directory format
 *  (`<url>/index.html`) or file format (`<url>.html`), or null if neither. */
export function builtPagePath(distPath: string, entry: LlmsEntry): string | null {
  const rel = entry.url.replace(/^\//, "").replace(/\/$/, "");
  const dirFormat = join(rel, "index.html");
  if (existsSync(join(distPath, dirFormat))) return dirFormat;
  return rel && existsSync(join(distPath, `${rel}.html`)) ? `${rel}.html` : null;
}
