import { existsSync } from "node:fs";
import { readdir, readFile } from "node:fs/promises";
import { join, relative, basename, extname } from "node:path";
import { parse as parseYaml } from "yaml";

export interface LlmsEntry {
  url: string;
  title: string;
  description?: string;
  body: string;
  /** `draft: true` frontmatter — the page is published but marked as
   *  not-yet-final, and both llms outputs carry the marker so machine
   *  readers get the same epistemic signal as the on-page badge. */
  draft?: boolean;
}

export interface LlmsTxtOptions {
  siteName: string;
  siteDescription?: string;
  siteUrl: string;
  preamble?: string;
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

export function generateLlmsTxt(options: LlmsTxtOptions, entries: LlmsEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.url.localeCompare(b.url));
  const lines: string[] = [];

  if (options.preamble) {
    lines.push(options.preamble.trimEnd(), "", "## Pages", "");
  } else {
    lines.push(`# ${options.siteName}`, "");
    if (options.siteDescription) {
      lines.push(`> ${options.siteDescription}`, "");
    }
    lines.push("## Pages", "");
  }

  for (const entry of sorted) {
    const url = `${options.siteUrl.replace(/\/$/, "")}${entry.url}`;
    const marker = entry.draft ? " (draft)" : "";
    if (entry.description) {
      lines.push(`- [${entry.title}](${url})${marker}: ${entry.description}`);
    } else {
      lines.push(`- [${entry.title}](${url})${marker}`);
    }
  }

  lines.push("");
  return lines.join("\n");
}

export function generateLlmsFullTxt(options: LlmsTxtOptions, entries: LlmsEntry[]): string {
  const sorted = [...entries].sort((a, b) => a.url.localeCompare(b.url));
  const sections = sorted.map((entry) => {
    const lines = [`# ${entry.title}`, ""];
    if (entry.description) {
      lines.push(`> ${entry.description}`, "");
    }
    if (entry.draft) {
      lines.push(`_Draft: this page is published but not yet final._`, "");
    }
    lines.push(absolutiseLinks(entry.body.trim(), options.siteUrl), "");
    return lines.join("\n");
  });

  return sections.join("\n---\n\n");
}

async function collectFiles(dir: string): Promise<string[]> {
  const results: string[] = [];

  async function walk(current: string): Promise<void> {
    const entries = await readdir(current, { withFileTypes: true });
    for (const entry of entries) {
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

export async function readContentEntries(contentDir: string): Promise<LlmsEntry[]> {
  if (!existsSync(contentDir)) return [];
  const files = await collectFiles(contentDir);
  const entries: LlmsEntry[] = [];

  for (const filePath of files) {
    const source = await readFile(filePath, "utf-8");
    const { data, body } = parseFrontmatter(source);

    if (data.published === false) continue;

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
  const pageEntries = await readContentEntries(join(srcDir, "pages"));

  // A file in src/pages owns its route, so on a URL collision the page wins.
  const pageUrls = new Set(pageEntries.map((e) => e.url));
  return [...pageEntries, ...contentEntries.filter((e) => !pageUrls.has(e.url))];
}

/** Entry URLs are derived from source file paths, not from the router, so a
 *  custom route mapping (or none at all) silently orphans them. Returns the
 *  URLs with no matching page in dist — either directory format
 *  (`<url>/index.html`) or file format (`<url>.html`). */
export function findUnroutedEntries(distPath: string, entries: LlmsEntry[]): string[] {
  return entries
    .filter((entry) => {
      const rel = entry.url.replace(/^\//, "").replace(/\/$/, "");
      if (existsSync(join(distPath, rel, "index.html"))) return false;
      return !(rel && existsSync(join(distPath, `${rel}.html`)));
    })
    .map((entry) => entry.url);
}
