import { describe, expect, test } from "vitest";
import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { checkDeckHtml, collectDeckFiles, checkDecks } from "./deck-checker.js";
import { fsTest } from "./test-utils.js";

const MINIMAL_DECK = `
<!DOCTYPE html><html lang="en"><body>
<div class="reveal" role="main"><div class="slides">
<section><h1>Title</h1></section>
<section class="impact"><p>Big idea</p></section>
</div></div>
</body></html>`;

describe("checkDeckHtml", () => {
  test("passes for a valid minimal deck", () => {
    expect(checkDeckHtml(MINIMAL_DECK, "/decks/test/")).toEqual([]);
  });

  test("fails when .reveal is missing", () => {
    const html = "<html><body><section>Slide</section></body></html>";
    const violations = checkDeckHtml(html, "/decks/test/");
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("reveal-wrapper");
  });

  test("fails when .slides is missing", () => {
    const html = '<html><body><div class="reveal"><section>Slide</section></div></body></html>';
    const violations = checkDeckHtml(html, "/decks/test/");
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("slides-wrapper");
  });

  test("fails when there are no sections", () => {
    const html = '<html><body><div class="reveal"><div class="slides"></div></div></body></html>';
    const violations = checkDeckHtml(html, "/decks/test/");
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("no-slides");
  });

  test("flags .slide-bg without background-image", () => {
    const html = `<html><body><div class="reveal"><div class="slides">
      <section><div class="slide-bg" style="filter: blur(3px)"></div><p>text</p></section>
    </div></div></body></html>`;
    const violations = checkDeckHtml(html, "/decks/test/");
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("bg-missing-image");
  });

  test("passes .slide-bg with background-image", () => {
    const html = `<html><body><div class="reveal"><div class="slides">
      <section><div class="slide-bg" style="background-image: url('/img.avif'); filter: brightness(0.5)"></div></section>
    </div></div></body></html>`;
    expect(checkDeckHtml(html, "/decks/test/")).toEqual([]);
  });

  test("flags split-layout missing .split-content", () => {
    const html = `<html><body><div class="reveal"><div class="slides">
      <section><div class="split-layout"><div class="split-image"></div></div></section>
    </div></div></body></html>`;
    const violations = checkDeckHtml(html, "/decks/test/");
    expect(violations.some((v) => v.rule === "split-missing-content")).toBe(true);
  });

  test("flags split-layout missing .split-image", () => {
    const html = `<html><body><div class="reveal"><div class="slides">
      <section><div class="split-layout"><div class="split-content"></div></div></section>
    </div></div></body></html>`;
    const violations = checkDeckHtml(html, "/decks/test/");
    expect(violations.some((v) => v.rule === "split-missing-image")).toBe(true);
  });

  test("passes valid split-layout", () => {
    const html = `<html><body><div class="reveal"><div class="slides">
      <section><div class="split-layout">
        <div class="split-content"><p>text</p></div>
        <div class="split-image" style="background-image: url('/img.avif')"></div>
      </div></section>
    </div></div></body></html>`;
    expect(checkDeckHtml(html, "/decks/test/")).toEqual([]);
  });

  test("flags shiki pre without code child", () => {
    const html = `<html><body><div class="reveal"><div class="slides">
      <section><pre class="shiki"><span>broken</span></pre></section>
    </div></div></body></html>`;
    const violations = checkDeckHtml(html, "/decks/test/");
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("shiki-missing-code");
  });

  test("passes shiki pre with code child", () => {
    const html = `<html><body><div class="reveal"><div class="slides">
      <section><pre class="shiki shiki-themes theme-light theme-dark"><code><span>ok</span></code></pre></section>
    </div></div></body></html>`;
    expect(checkDeckHtml(html, "/decks/test/")).toEqual([]);
  });

  test("flags .qr-code without svg", () => {
    const html = `<html><body><div class="reveal"><div class="slides">
      <section><div class="qr-code"><img src="qr.png"></div></section>
    </div></div></body></html>`;
    const violations = checkDeckHtml(html, "/decks/test/");
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("qr-missing-svg");
  });

  test("passes .qr-code with svg", () => {
    const html = `<html><body><div class="reveal"><div class="slides">
      <section><div class="qr-code"><a href="https://example.com"><svg viewBox="0 0 100 100"></svg></a></div></section>
    </div></div></body></html>`;
    expect(checkDeckHtml(html, "/decks/test/")).toEqual([]);
  });

  test("does not flag speaker notes, whichever element they use", () => {
    // astromotion emits <aside class="notes"> so Reveal's notes plugin can
    // surface them in the speaker view; the checker must not police this.
    const aside = `<html><body><div class="reveal"><div class="slides">
      <section><p>content</p><aside class="notes">speaker note</aside></section>
    </div></div></body></html>`;
    const div = `<html><body><div class="reveal"><div class="slides">
      <section><p>content</p><div class="notes">speaker note</div></section>
    </div></div></body></html>`;
    expect(checkDeckHtml(aside, "/decks/test/")).toEqual([]);
    expect(checkDeckHtml(div, "/decks/test/")).toEqual([]);
  });

  test("reports multiple violations", () => {
    const html = `<html><body><div class="reveal"><div class="slides">
      <section><div class="slide-bg" style=""></div></section>
      <section><div class="qr-code"></div></section>
    </div></div></body></html>`;
    const violations = checkDeckHtml(html, "/decks/test/");
    expect(violations.length).toBeGreaterThanOrEqual(2);
  });
});

describe("collectDeckFiles", () => {
  fsTest("returns empty array when decks directory does not exist", async ({ tmpDir }) => {
    const files = await collectDeckFiles(tmpDir);
    expect(files).toEqual([]);
  });

  fsTest("finds html files in decks subdirectory", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "decks", "example"), { recursive: true });
    await writeFile(join(tmpDir, "decks", "example", "index.html"), MINIMAL_DECK);
    const files = await collectDeckFiles(tmpDir);
    expect(files).toHaveLength(1);
    expect(files[0]).toContain("example");
  });
});

describe("checkDecks", () => {
  fsTest("checks all deck files and returns results", async ({ tmpDir }) => {
    await mkdir(join(tmpDir, "decks", "good"), { recursive: true });
    await mkdir(join(tmpDir, "decks", "bad"), { recursive: true });
    await writeFile(join(tmpDir, "decks", "good", "index.html"), MINIMAL_DECK);
    await writeFile(
      join(tmpDir, "decks", "bad", "index.html"),
      '<html><body><div class="reveal"><div class="slides"></div></div></body></html>',
    );
    const { checked, violations } = await checkDecks(tmpDir);
    expect(checked).toBe(2);
    expect(violations).toHaveLength(1);
    expect(violations[0].rule).toBe("no-slides");
  });

  fsTest("returns zero violations when no deck files exist", async ({ tmpDir }) => {
    const { checked, violations } = await checkDecks(tmpDir);
    expect(checked).toBe(0);
    expect(violations).toEqual([]);
  });
});
