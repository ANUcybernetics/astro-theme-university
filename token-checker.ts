import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { fileURLToPath } from "node:url";

export interface TokenViolation {
  file: string;
  token: string;
}

async function collectStyleFiles(
  dir: string,
  // Astro inlines small stylesheets into <style> blocks, so a built page's CSS
  // can land in a .css file or in the HTML, and the same rule often lands in
  // both. The theme's own sources are scanned with a different pair.
  extensions: readonly string[] = [".css", ".html"],
): Promise<string[]> {
  const files: string[] = [];
  for (const entry of await readdir(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...(await collectStyleFiles(full, extensions)));
    else if (extensions.some((ext) => entry.name.endsWith(ext))) files.push(full);
  }
  return files;
}

const DEFINITION = /(--at-[a-z0-9-]+)\s*:/g;
const REFERENCE = /var\(\s*(--at-[a-z0-9-]+)/g;

// The theme's own asset directories, in both the repo and the installed
// package layout. Deliberately not "everything under the package root": in the
// repo that would sweep up examples/ and docs/ and quietly widen the
// vocabulary to whatever a fixture happens to mention.
const THEME_STYLE_DIRS = ["styles", "components", "layouts", "pages"];

/**
 * Every `--at-*` the theme itself defines or references.
 *
 * A token the theme references but never defines is an opt-in hook: deck.css
 * reads `var(--at-deck-impact-bg-image, none)` so a consumer can set it to
 * replace the artwork, and leaving it unset is how you decline. That is
 * indistinguishable, syntactically, from a name someone invented --- both are
 * an undefined token behind a fallback. What separates them is authorship, so
 * the theme's own usage is the vocabulary and anything outside it is not.
 */
async function themeVocabulary(): Promise<Set<string>> {
  const root = fileURLToPath(new URL(".", import.meta.url));
  const vocabulary = new Set<string>();
  for (const dir of THEME_STYLE_DIRS) {
    let files: string[];
    try {
      files = await collectStyleFiles(join(root, dir), [".css", ".astro"]);
    } catch {
      continue; // A published package need not ship every directory.
    }
    for (const file of files) {
      const source = await readFile(file, "utf-8");
      for (const [, token] of source.matchAll(DEFINITION)) vocabulary.add(token);
      for (const [, token] of source.matchAll(REFERENCE)) vocabulary.add(token);
    }
  }
  return vocabulary;
}

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
  const defined = await themeVocabulary();
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
