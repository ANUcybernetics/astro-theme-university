import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

/**
 * Regression test for the `hidden` attribute doing nothing on themed elements.
 *
 * `[hidden] { display: none }` comes only from the UA stylesheet, and any
 * author `display` beats the UA origin regardless of specificity. The theme
 * sets `display` on most of its layout classes, so before base.css carried a
 * reset, `el.hidden = true` on a `.at-card` set an attribute and changed
 * nothing: `FilterableCardGrid` counted matches down in its status line while
 * every card stayed on screen.
 *
 * If this test fails, any component that filters by toggling `hidden` —
 * `FilterableCardGrid` and `SearchDialog` here, and the same pattern in
 * consumer components — silently stops hiding anything.
 */

const baseCss = readFileSync(fileURLToPath(new URL("./base.css", import.meta.url)), "utf-8");
const componentsCss = readFileSync(
  fileURLToPath(new URL("./components.css", import.meta.url)),
  "utf-8",
);

const resetPattern = /^\[hidden\]:not\(\[hidden="until-found" i\]\)\s*\{([^}]*)\}/m;

describe("hidden attribute reset", () => {
  test("base.css resets [hidden] to display:none", () => {
    const match = baseCss.match(resetPattern);
    expect(match, "the [hidden] reset must exist in base.css").not.toBeNull();
    expect(match![1]).toMatch(/display:\s*none\b/);
  });

  test("the reset is important", () => {
    // Deliberate, and the one place in this theme where !important is right:
    // the rule has to beat a consumer's own unlayered `display` on a themed
    // element, which specificity and layering alone cannot promise. Dropping
    // it re-opens the bug for every consumer that styles a card. (The
    // astro-island overrides carry no !important for the opposite reason —
    // see island-grid-placement.test.ts.)
    const match = baseCss.match(resetPattern);
    expect(match![1]).toMatch(/!important/);
  });

  test("the reset sits outside @layer at.base", () => {
    // Layered normal declarations lose to unlayered ones, and `at.base` is
    // ordered before `at.components` — so inside the layer this rule would
    // lose to `.at-card` twice over. Approximated structurally: the rule must
    // appear before the `@layer at.base { ... }` block opens.
    const layerStart = baseCss.search(/@layer\s+at\.base\s*\{/);
    const resetStart = baseCss.search(resetPattern);
    expect(layerStart).toBeGreaterThan(-1);
    expect(resetStart).toBeGreaterThan(-1);
    expect(resetStart).toBeLessThan(layerStart);
  });

  test("[hidden] is not re-displayed anywhere else", () => {
    // A later rule setting `display` on `[hidden]` (or on `[hidden]`'s
    // element via a more specific important selector) would undo the reset.
    for (const css of [baseCss, componentsCss]) {
      const others = [...css.matchAll(/\[hidden\][^{]*\{([^}]*)\}/g)].filter(
        (match) => !match[0].startsWith("[hidden]:not(["),
      );
      for (const other of others) {
        expect(other[1]).not.toMatch(/display:\s*(?!none)/);
      }
    }
  });
});
