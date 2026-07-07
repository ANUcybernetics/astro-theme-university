import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseHTML } from "linkedom";
import { collectHtmlFiles } from "./link-checker.js";

export interface DeckViolation {
  page: string;
  rule: string;
  detail: string;
}

export interface DeckPage {
  file: string;
  html: string;
}

/** Deck pages are identified by content, not path: consumers can remount the
 * astromotion deck route anywhere (e.g. /lectures/ instead of /decks/), so a
 * hardcoded dist/decks/ scan silently checks nothing. A page counts as a deck
 * when it carries Reveal.js's `.reveal .slides` wrapper — specific enough that
 * a userland "reveal" utility class won't false-positive, while the
 * zero-decks-found warning in the integration covers the case where the
 * wrapper itself regresses. */
export async function collectDeckPages(distDir: string): Promise<DeckPage[]> {
  let all: string[];
  try {
    all = await collectHtmlFiles(distDir);
  } catch {
    return [];
  }
  const decks: DeckPage[] = [];
  for (const file of all) {
    const html = await readFile(file, "utf-8");
    if (!html.includes("reveal")) continue; // cheap prefilter before parsing
    const { document } = parseHTML(html);
    if (document.querySelector(".reveal .slides")) decks.push({ file, html });
  }
  return decks;
}

/** Count source deck files (astromotion's `*.deck.*` convention) under a
 * directory, so the integration can warn when decks exist in src but none
 * surfaced in dist. */
export async function countSourceDecks(dir: string): Promise<number> {
  let entries;
  try {
    entries = await readdir(dir, { withFileTypes: true });
  } catch {
    return 0;
  }
  let count = 0;
  for (const entry of entries) {
    if (entry.isDirectory()) count += await countSourceDecks(join(dir, entry.name));
    else if (/\.deck\.[^./]+$/.test(entry.name)) count += 1;
  }
  return count;
}

export function checkDeckHtml(html: string, page: string): DeckViolation[] {
  const { document } = parseHTML(html);
  const violations: DeckViolation[] = [];

  const reveal = document.querySelector(".reveal");
  if (!reveal) {
    violations.push({ page, rule: "reveal-wrapper", detail: "Missing .reveal container" });
    return violations;
  }

  const slidesContainer = reveal.querySelector(".slides");
  if (!slidesContainer) {
    violations.push({
      page,
      rule: "slides-wrapper",
      detail: "Missing .slides container inside .reveal",
    });
    return violations;
  }

  const sections = slidesContainer.querySelectorAll(":scope > section");
  if (sections.length === 0) {
    violations.push({ page, rule: "no-slides", detail: "Deck has no <section> slides" });
    return violations;
  }

  for (let i = 0; i < sections.length; i++) {
    const section = sections[i] as Element;
    const slideLabel = `slide ${i + 1}`;

    const bg = section.querySelector(".slide-bg");
    if (bg) {
      const style = bg.getAttribute("style") ?? "";
      if (!style.includes("background-image")) {
        violations.push({
          page,
          rule: "bg-missing-image",
          detail: `${slideLabel}: .slide-bg has no background-image style`,
        });
      }
    }

    const split = section.querySelector(".split-layout");
    if (split) {
      if (!split.querySelector(".split-content")) {
        violations.push({
          page,
          rule: "split-missing-content",
          detail: `${slideLabel}: .split-layout missing .split-content`,
        });
      }
      if (!split.querySelector(".split-image")) {
        violations.push({
          page,
          rule: "split-missing-image",
          detail: `${slideLabel}: .split-layout missing .split-image`,
        });
      }
    }

    for (const pre of section.querySelectorAll("pre.shiki")) {
      if (!pre.querySelector("code")) {
        violations.push({
          page,
          rule: "shiki-missing-code",
          detail: `${slideLabel}: <pre class="shiki"> has no <code> child`,
        });
      }
    }

    const qr = section.querySelector(".qr-code");
    if (qr && !qr.querySelector("svg")) {
      violations.push({
        page,
        rule: "qr-missing-svg",
        detail: `${slideLabel}: .qr-code has no <svg> element`,
      });
    }
  }

  return violations;
}

export async function checkDecks(
  distDir: string,
): Promise<{ checked: number; violations: DeckViolation[] }> {
  const deckPages = await collectDeckPages(distDir);
  const violations: DeckViolation[] = [];

  for (const { file, html } of deckPages) {
    const page = "/" + relative(distDir, file).replace(/index\.html$/, "");
    violations.push(...checkDeckHtml(html, page));
  }

  return { checked: deckPages.length, violations };
}
