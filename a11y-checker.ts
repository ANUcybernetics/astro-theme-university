import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { JSDOM, VirtualConsole } from "jsdom";
import axe from "axe-core";
import { collectHtmlFiles } from "./link-checker.js";

export interface A11yViolation {
  page: string;
  id: string;
  impact: string | null;
  description: string;
  nodes: number;
}

export async function checkA11y(
  distDir: string,
): Promise<{ checked: number; violations: A11yViolation[] }> {
  const htmlFiles = await collectHtmlFiles(distDir);
  const violations: A11yViolation[] = [];
  let checked = 0;

  for (const file of htmlFiles) {
    const html = await readFile(file, "utf-8");
    // Astro emits configured `redirects` as bare meta-refresh stubs with no
    // <html lang> and no landmark regions — markup the author can't control.
    // They redirect instantly and are noindex, so they are not a real
    // accessibility surface; skip them rather than report unfixable violations.
    if (isRedirectStub(html)) continue;
    checked++;
    const page = "/" + relative(distDir, file).replace(/index\.html$/, "");
    const pageViolations = await runAxe(html);
    for (const v of pageViolations) {
      violations.push({ page, ...v });
    }
  }

  return { checked, violations };
}

// Matches <meta http-equiv="refresh" content="0;url=…"> (quotes optional), the
// signature Astro writes for a configured redirect.
function isRedirectStub(html: string): boolean {
  return /<meta\b[^>]*\bhttp-equiv\s*=\s*["']?refresh\b/i.test(html);
}

async function runAxe(html: string): Promise<Omit<A11yViolation, "page">[]> {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (err: unknown) => {
    if (err instanceof Error && err.message.startsWith("Not implemented:")) return;
    console.error(err);
  });
  const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole });
  const win = dom.window;

  const saved = {
    window: globalThis.window,
    document: globalThis.document,
    Node: globalThis.Node,
    Element: globalThis.Element,
  };

  Object.assign(globalThis, {
    window: win,
    document: win.document,
    Node: win.Node,
    Element: win.Element,
  });

  try {
    const results = await axe.run(win.document.documentElement);
    return results.violations.map((v) => ({
      id: v.id,
      impact: v.impact ?? null,
      description: v.description,
      nodes: v.nodes.length,
    }));
  } finally {
    Object.assign(globalThis, saved);
    dom.window.close();
  }
}
