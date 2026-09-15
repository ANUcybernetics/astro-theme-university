import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { pathToFileURL } from "node:url";
import { afterAll, describe, expect, test } from "vitest";
import universityTheme from "./index.js";

// Decks are injected routes fed from src/decks, so the llms.txt collector
// cannot see them on its own — astromotion supplies them. These drive the
// theme's hooks against a real deck on disk (and the real astromotion in
// node_modules), since the wiring is the part that can break: a deck's text
// reaching llms-full.txt is worth nothing if its URL doesn't match the route.

const tempDirs: string[] = [];

afterAll(() => {
  for (const dir of tempDirs) rmSync(dir, { recursive: true, force: true });
});

function write(path: string, content: string) {
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, content);
}

interface SiteOptions {
  /** Decks to write, keyed by path under `src/decks`. */
  decks?: Record<string, string>;
  /** Deck URLs to give a built page in dist, so the unrouted check passes. */
  built?: string[];
  /** Whether the site registers astromotion (as a deck-using site does). */
  registerAstromotion?: boolean;
}

/** Run the theme's llms.txt generation over a throwaway project. */
async function generate(options: SiteOptions = {}) {
  const root = mkdtempSync(join(tmpdir(), "theme-llms-decks-"));
  tempDirs.push(root);

  for (const [path, source] of Object.entries(options.decks ?? {})) {
    write(join(root, "src/decks", path), source);
  }
  for (const url of options.built ?? []) {
    write(join(root, "dist", url, "index.html"), "<html></html>");
  }
  mkdirSync(join(root, "dist"), { recursive: true });

  const integration = universityTheme({
    name: "Test Site",
    llmsTxt: true,
    search: false,
    checkLinks: false,
    checkA11y: false,
  });
  const hooks = integration.hooks as Record<string, (args: unknown) => unknown>;

  await hooks["astro:config:setup"]({
    config: {
      integrations: options.registerAstromotion ? [{ name: "astromotion" }] : [],
      root: pathToFileURL(`${root}/`),
      srcDir: pathToFileURL(`${root}/src/`),
      site: "https://example.com",
      base: "/",
      fonts: [],
    },
    updateConfig: () => {},
    injectRoute: () => {},
    injectScript: () => {},
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  } as never);

  await hooks["astro:build:done"]({
    dir: pathToFileURL(`${join(root, "dist")}/`),
    logger: { info: () => {}, warn: () => {}, error: () => {} },
  } as never);

  return {
    index: readFileSync(join(root, "dist/llms.txt"), "utf-8"),
    full: readFileSync(join(root, "dist/llms-full.txt"), "utf-8"),
  };
}

const WEEK_1 = `---
title: "Week 1: Openings"
description: How the course starts
---

# Week 1

Slide prose the audience reads.

\`\`\`comment
why this slide opens the deck
\`\`\`

\`\`\`notes
what to say out loud
\`\`\`
`;

describe("decks in llms.txt", () => {
  test("lists each deck at the URL its route builds", async () => {
    const { index } = await generate({
      decks: { "week-1.deck.mdx": WEEK_1 },
      built: ["decks/week-1"],
      registerAstromotion: true,
    });

    expect(index).toContain(
      "- [Week 1: Openings](https://example.com/decks/week-1/): How the course starts",
    );
  });

  test("carries the deck's text, with notes but without authoring comments", async () => {
    const { full } = await generate({
      decks: { "week-1.deck.mdx": WEEK_1 },
      built: ["decks/week-1"],
      registerAstromotion: true,
    });

    expect(full).toContain("# Week 1: Openings");
    expect(full).toContain("Slide prose the audience reads.");
    expect(full).toContain("what to say out loud");
    expect(full).not.toContain("why this slide opens the deck");
  });

  test("skips decks their frontmatter keeps out of the build or the indexes", async () => {
    const { index } = await generate({
      decks: {
        "shown.deck.mdx": "---\ntitle: Shown\n---\n\n# Shown\n",
        "draft.deck.mdx": "---\ntitle: Draft\npublished: false\n---\n\n# Draft\n",
        "hidden.deck.mdx": "---\ntitle: Hidden\nlisted: false\n---\n\n# Hidden\n",
      },
      built: ["decks/shown"],
      registerAstromotion: true,
    });

    expect(index).toContain("https://example.com/decks/shown/");
    expect(index).not.toContain("Draft");
    expect(index).not.toContain("Hidden");
  });

  test("leaves llms.txt alone on a site without decks", async () => {
    const { index } = await generate({
      decks: { "week-1.deck.mdx": WEEK_1 },
      registerAstromotion: false,
    });

    expect(index).not.toContain("week-1");
  });

  test("fails the build when a deck entry has no page in dist", async () => {
    await expect(
      generate({
        decks: { "week-1.deck.mdx": WEEK_1 },
        built: [],
        registerAstromotion: true,
      }),
    ).rejects.toThrow(/no built page in dist/);
  });
});
