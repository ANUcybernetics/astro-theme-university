// Worker half of the post-build accessibility scan. Runs axe-core over a single
// page's HTML inside a JSDOM document, then posts the violations back. The scan
// is CPU-bound (axe walks the whole DOM synchronously) and mutates globalThis
// to hand axe a document, so it can't be parallelised in one thread — each page
// runs in its own worker with its own globals instead. Plain .mjs, not .ts, so
// the git-dep consumers can spawn it without a TypeScript-stripping step.
import { readFile } from "node:fs/promises";
import { relative } from "node:path";
import { parentPort, workerData } from "node:worker_threads";
// Default-import destructure keeps this working regardless of the consumer's
// CJS-named-export detection.
import jsdom from "jsdom";
import axe from "axe-core";

const { JSDOM, VirtualConsole } = jsdom;
const { distDir } = workerData;

// Matches <meta http-equiv="refresh" content="0;url=…"> (quotes optional), the
// signature Astro writes for a configured redirect. Kept in sync with the same
// check in a11y-checker.ts.
function isRedirectStub(html) {
  return /<meta\b[^>]*\bhttp-equiv\s*=\s*["']?refresh\b/i.test(html);
}

async function runAxe(html) {
  const virtualConsole = new VirtualConsole();
  virtualConsole.on("jsdomError", (err) => {
    if (err instanceof Error && err.message.startsWith("Not implemented:")) return;
    console.error(err);
  });
  const dom = new JSDOM(html, { runScripts: "outside-only", virtualConsole });
  const win = dom.window;

  // This worker does nothing but axe runs, so there is no prior global state
  // worth saving/restoring the way the single-threaded version had to.
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
    dom.window.close();
  }
}

parentPort.on("message", async (file) => {
  try {
    const html = await readFile(file, "utf-8");
    // Astro emits configured `redirects` as bare meta-refresh stubs with no
    // <html lang> and no landmark regions — markup the author can't control.
    // They redirect instantly and are noindex, so skip them rather than report
    // unfixable violations.
    if (isRedirectStub(html)) {
      parentPort.postMessage({ skipped: true, violations: [] });
      return;
    }
    const page = "/" + relative(distDir, file).replace(/index\.html$/, "");
    const pageViolations = await runAxe(html);
    parentPort.postMessage({
      skipped: false,
      violations: pageViolations.map((v) => ({ page, ...v })),
    });
  } catch (err) {
    parentPort.postMessage({ error: err instanceof Error ? err.message : String(err) });
  }
});
