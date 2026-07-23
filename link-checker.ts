import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseHTML } from "linkedom";

export async function collectHtmlFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectHtmlFiles(full)));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

export interface BaseLinkViolation {
  page: string;
  link: string;
}

// The generic broken-links pass can't catch base-path regressions: Astro
// writes dist/ paths without the base, so an un-prefixed internal link
// matches a real file locally while 404ing in production. Under the
// root-absolute-means-site-internal convention (see rehype-base-links.ts),
// any root-absolute href/src that escapes the base prefix is a bug.
export function checkBaseLinksHtml(html: string, page: string, base: string): BaseLinkViolation[] {
  const b = base.replace(/\/$/, "");
  if (!b) return [];
  const { document } = parseHTML(html);
  const violations: BaseLinkViolation[] = [];
  const candidates = [
    ...Array.from(document.querySelectorAll("a[href]"), (el) => el.getAttribute("href")),
    ...Array.from(document.querySelectorAll("img[src]"), (el) => el.getAttribute("src")),
  ];
  for (const link of candidates) {
    if (!link || !link.startsWith("/") || link.startsWith("//")) continue;
    if (link === b || link.startsWith(b + "/")) continue;
    violations.push({ page, link });
  }
  return violations;
}

export async function checkBaseLinks(
  distDir: string,
  base: string,
): Promise<{ checked: number; violations: BaseLinkViolation[] }> {
  const files = await collectHtmlFiles(distDir);
  const violations: BaseLinkViolation[] = [];
  for (const file of files) {
    const html = await readFile(file, "utf-8");
    const page = "/" + relative(distDir, file).replace(/index\.html$/, "");
    violations.push(...checkBaseLinksHtml(html, page, base));
  }
  return { checked: files.length, violations };
}
