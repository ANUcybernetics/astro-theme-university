import { readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import { parseHTML } from "linkedom";
import { collectHtmlFiles } from "./link-checker.js";

export interface DeckViolation {
  page: string;
  rule: string;
  detail: string;
}

export async function collectDeckFiles(distDir: string): Promise<string[]> {
  const decksDir = join(distDir, "decks");
  try {
    const all = await collectHtmlFiles(decksDir);
    // exclude the top-level decks/index.html listing page
    return all.filter((f) => f !== join(decksDir, "index.html"));
  } catch {
    return [];
  }
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
  const deckFiles = await collectDeckFiles(distDir);
  const violations: DeckViolation[] = [];

  for (const file of deckFiles) {
    const html = await readFile(file, "utf-8");
    const page = "/decks/" + relative(join(distDir, "decks"), file).replace(/index\.html$/, "");
    violations.push(...checkDeckHtml(html, page));
  }

  return { checked: deckFiles.length, violations };
}
