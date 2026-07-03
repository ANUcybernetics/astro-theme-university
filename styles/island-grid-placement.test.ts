import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { describe, expect, test } from "vitest";

/**
 * Regression test for the island-placement bug fixed in TASK-11.
 *
 * `.at-main` and `.at-footer` are CSS subgrids that place direct children
 * (`> *`) into the `content` column. A hydrated Svelte/React/Vue island
 * gets wrapped by Astro in `<astro-island style="display:contents">`. With
 * `display: contents`, the wrapper drops out of layout and the inner element
 * becomes the actual grid item — at `grid-column: auto`, collapsing into
 * the narrow leading gutter column.
 *
 * The fix is a CSS rule that turns `<astro-island>` (when it's a direct
 * child of one of these subgrids) into a transparent grid container that
 * participates in the parent grid via `subgrid`.
 *
 * If this test fails, an island used as a top-level page block will render
 * in the wrong column. Visual repro: comp4020's /admin/ page (FilterableCardGrid).
 */

const cssPath = fileURLToPath(new URL("./components.css", import.meta.url));
const css = readFileSync(cssPath, "utf-8");

function ruleBody(selector: string): string | null {
  // Match `selector { ... }` non-greedily; only handles flat blocks (no
  // nested at-rules), which is sufficient for the layout selectors we care
  // about.
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = css.match(new RegExp(`${escaped}\\s*\\{([^}]*)\\}`));
  return match ? match[1] : null;
}

describe("island grid placement", () => {
  test(".at-main > astro-island opts out of display:contents and participates in the grid", () => {
    const body = ruleBody(".at-main > astro-island");
    expect(body, ".at-main > astro-island rule must exist").not.toBeNull();
    expect(body).toMatch(/display:\s*grid\b/);
    expect(body).toMatch(/grid-template-columns:\s*subgrid\b/);
    // Must NOT use !important — the rule is supposed to win via specificity
    // by being unlayered. Reaching for !important means the rule is
    // accidentally inside `@layer at.components` again, defeating the
    // architectural choice to keep framework-override rules unlayered.
    expect(body).not.toMatch(/!important/);
  });

  test(".at-footer > astro-island opts out of display:contents and participates in the grid", () => {
    const body = ruleBody(".at-footer > astro-island");
    expect(body, ".at-footer > astro-island rule must exist").not.toBeNull();
    expect(body).toMatch(/display:\s*grid\b/);
    expect(body).toMatch(/grid-template-columns:\s*subgrid\b/);
    expect(body).not.toMatch(/!important/);
  });

  test("astro-island override rules sit outside @layer at.components", () => {
    // Astro injects `astro-island { display: contents }` as an unlayered
    // rule. Because unlayered styles win over layered ones in the cascade,
    // our override has to be unlayered too — otherwise the cascade flips
    // and the bug returns. We approximate "unlayered" structurally: the
    // override rules must appear before the `@layer at.components { ... }`
    // block opens in the source file. The `\{` anchor distinguishes the
    // real declaration from the layer name being mentioned in comments.
    const layerStart = css.search(/@layer\s+at\.components\s*\{/);
    const mainRuleStart = css.search(/^\.at-main\s*>\s*astro-island\s*\{/m);
    const footerRuleStart = css.search(/^\.at-footer\s*>\s*astro-island\s*\{/m);
    expect(layerStart).toBeGreaterThan(-1);
    expect(mainRuleStart).toBeGreaterThan(-1);
    expect(footerRuleStart).toBeGreaterThan(-1);
    expect(mainRuleStart).toBeLessThan(layerStart);
    expect(footerRuleStart).toBeLessThan(layerStart);
  });
});
