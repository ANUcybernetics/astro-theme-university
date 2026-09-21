import { mkdir, mkdtemp, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { checkTokens } from "./token-checker.js";

async function distWith(files: Record<string, string>): Promise<string> {
  const dir = await mkdtemp(join(tmpdir(), "token-check-"));
  for (const [name, body] of Object.entries(files)) {
    await mkdir(join(dir, name, ".."), { recursive: true });
    await writeFile(join(dir, name), body);
  }
  return dir;
}

describe("token checker", () => {
  it("passes when every reference resolves", async () => {
    const dist = await distWith({
      "_astro/theme.css": ":root{--at-bg-alt:#eee;--at-text:#111}",
      "index.html": "<style>.panel{background:var(--at-bg-alt);color:var(--at-text)}</style>",
    });
    expect((await checkTokens(dist)).violations).toEqual([]);
  });

  it("flags a reference nothing defines, even with a fallback", async () => {
    const dist = await distWith({
      "_astro/theme.css": ":root{--at-bg-alt:#eee}",
      "index.html": "<style>.panel{background:var(--at-background-muted,#eee8dc)}</style>",
    });
    const { violations } = await checkTokens(dist);
    expect(violations).toEqual([{ file: "index.html", token: "--at-background-muted" }]);
  });

  it("resolves a definition that ships in a different file from the reference", async () => {
    const dist = await distWith({
      "_astro/brand.css": ":root{--at-primary:#b97d1c}",
      "page/index.html": "<style>a{color:var(--at-primary)}</style>",
    });
    expect((await checkTokens(dist)).violations).toEqual([]);
  });

  it("reports each file a bad token appears in", async () => {
    const dist = await distWith({
      "a.html": "<style>p{color:var(--at-nope)}</style>",
      "b.html": "<style>p{color:var(--at-nope)}</style>",
    });
    const { violations } = await checkTokens(dist);
    expect(violations.map((v) => v.file)).toEqual(["a.html", "b.html"]);
  });

  it("ignores variables outside the theme namespace", async () => {
    const dist = await distWith({
      "index.html": "<style>.x{color:var(--site-accent,#333)}</style>",
    });
    expect((await checkTokens(dist)).violations).toEqual([]);
  });
});

describe("theme vocabulary", () => {
  it("allows the theme's own opt-in hooks, which nothing defines by design", async () => {
    // deck.css reads these behind a fallback so a consumer can override the
    // artwork; leaving them unset is how you decline, so a build that ships a
    // deck must not fail on them.
    const dist = await distWith({
      "index.html":
        "<style>.hero{background:var(--at-deck-hero-scrim,#000)}" +
        ".impact{background-image:var(--at-deck-impact-bg-image,none)}</style>",
    });
    expect((await checkTokens(dist)).violations).toEqual([]);
  });

  it("still flags a name the theme never uses, fallback or not", async () => {
    const dist = await distWith({
      "index.html": "<style>.p{background:var(--at-background-muted,#eee8dc)}</style>",
    });
    expect((await checkTokens(dist)).violations).toEqual([
      { file: "index.html", token: "--at-background-muted" },
    ]);
  });
});
