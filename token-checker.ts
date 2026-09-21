import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";

export interface TokenViolation {
  file: string;
  token: string;
}

async function collectStyleFiles(dir: string): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectStyleFiles(full)));
    // Astro inlines small stylesheets into <style> blocks, so a page's CSS can
    // land in either place — and the same rule often lands in both.
    else if (entry.name.endsWith(".css") || entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

const DEFINITION = /(--at-[a-z0-9-]+)\s*:/g;
const REFERENCE = /var\(\s*(--at-[a-z0-9-]+)/g;

/**
 * Report `var(--at-*)` references to custom properties nothing defines.
 *
 * `--at-` is the theme's namespace, so a reference into it that resolves to
 * nothing is a typo or an invented name, not a design decision — and a
 * fallback makes it worse rather than better, because the literal in the
 * fallback silently becomes the real value and stops tracking the colour
 * scheme. That is the one contrast failure the token-level check in
 * contrast.ts cannot see: it proves the palette is AA-clean, not that the page
 * used it. A consumer's own variables should carry the consumer's own prefix.
 *
 * Both halves are read out of the built output, so the theme's and the brand
 * layer's definitions are whatever actually shipped.
 */
export async function checkTokens(distDir: string): Promise<{
  checked: number;
  violations: TokenViolation[];
}> {
  const files = await collectStyleFiles(distDir);
  const defined = new Set<string>();
  const referenced = new Map<string, Set<string>>();

  for (const file of files) {
    const source = await readFile(file, "utf-8");
    for (const [, token] of source.matchAll(DEFINITION)) defined.add(token);
    for (const [, token] of source.matchAll(REFERENCE)) {
      const where = referenced.get(token) ?? new Set<string>();
      where.add(relative(distDir, file));
      referenced.set(token, where);
    }
  }

  const violations: TokenViolation[] = [];
  for (const [token, where] of referenced) {
    if (defined.has(token)) continue;
    for (const file of where) violations.push({ file, token });
  }
  violations.sort((a, b) => a.file.localeCompare(b.file) || a.token.localeCompare(b.token));
  return { checked: files.length, violations };
}
