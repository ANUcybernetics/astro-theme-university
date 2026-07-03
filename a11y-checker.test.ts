import { describe, expect } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkA11y } from "./a11y-checker.js";
import { fsTest } from "./test-utils.js";

describe("checkA11y", () => {
  fsTest("reports no violations for accessible pages", async ({ tmpDir }) => {
    await writeFile(
      join(tmpDir, "index.html"),
      `<!doctype html>
<html lang="en">
<head><title>Test</title></head>
<body>
  <main><h1>Hello</h1><p>World</p></main>
</body>
</html>`,
    );

    const { checked, violations } = await checkA11y(tmpDir);
    expect(checked).toBe(1);
    expect(violations).toEqual([]);
  });

  fsTest("detects missing lang attribute", async ({ tmpDir }) => {
    await writeFile(
      join(tmpDir, "index.html"),
      `<!doctype html>
<html>
<head><title>Test</title></head>
<body>
  <main><h1>Hello</h1></main>
</body>
</html>`,
    );

    const { violations } = await checkA11y(tmpDir);
    const ids = violations.map((v) => v.id);
    expect(ids).toContain("html-has-lang");
  });

  fsTest("detects missing image alt text", async ({ tmpDir }) => {
    await writeFile(
      join(tmpDir, "index.html"),
      `<!doctype html>
<html lang="en">
<head><title>Test</title></head>
<body>
  <main><img src="photo.jpg"></main>
</body>
</html>`,
    );

    const { violations } = await checkA11y(tmpDir);
    const ids = violations.map((v) => v.id);
    expect(ids).toContain("image-alt");
  });

  fsTest("skips redirect stubs while still checking real pages", async ({ tmpDir }) => {
    // A normal page that must still be scanned and counted.
    await writeFile(
      join(tmpDir, "index.html"),
      `<!doctype html>
<html lang="en"><head><title>Home</title></head>
<body><main><h1>Home</h1></main></body></html>`,
    );
    // An Astro redirect stub: no <html lang>, content outside any landmark.
    // Scanning it would wrongly flag html-has-lang and region.
    await mkdir(join(tmpDir, "old"));
    await writeFile(
      join(tmpDir, "old", "index.html"),
      `<!doctype html><title>Redirecting to: /</title><meta http-equiv="refresh" content="0;url=/"><meta name="robots" content="noindex"><body>\t<a href="/">Redirecting from <code>/old/</code> to <code>/</code></a></body>`,
    );

    const { checked, violations } = await checkA11y(tmpDir);
    expect(checked).toBe(1);
    expect(violations).toEqual([]);
  });

  fsTest("checks multiple pages", async ({ tmpDir }) => {
    await writeFile(
      join(tmpDir, "index.html"),
      `<!doctype html>
<html lang="en"><head><title>Home</title></head>
<body><main><h1>Home</h1></main></body></html>`,
    );
    await mkdir(join(tmpDir, "about"));
    await writeFile(
      join(tmpDir, "about", "index.html"),
      `<!doctype html>
<html lang="en"><head><title>About</title></head>
<body><main><h1>About</h1></main></body></html>`,
    );

    const { checked, violations } = await checkA11y(tmpDir);
    expect(checked).toBe(2);
    expect(violations).toEqual([]);
  });
});
