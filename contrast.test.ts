import { describe, expect, it } from "vitest";
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { AA_BODY_TEXT, parseLightDarkOklchTokens, tokenContrast } from "./contrast.js";

const TOKENS_CSS = fileURLToPath(new URL("./styles/tokens.css", import.meta.url));

// Every text token is used on every surface: body copy on --at-bg, cards and
// callouts on --at-bg-alt, elevated panels on --at-bg-elevated.
const TEXT_TOKENS = ["--at-text", "--at-text-secondary", "--at-text-muted"];
const SURFACE_TOKENS = ["--at-bg", "--at-bg-alt", "--at-bg-elevated"];

// The neutral ramp takes its hue from each brand's --at-primary, so the palette
// has to hold for any brand. Chroma is low (0.004–0.012) and luminance barely
// moves with hue, but sample the wheel rather than assume it.
const HUES = Array.from({ length: 24 }, (_, i) => i * 15);

describe("palette contrast", () => {
  it("meets WCAG AA for every text/surface pairing, in both modes, at any brand hue", async () => {
    const tokens = parseLightDarkOklchTokens(await readFile(TOKENS_CSS, "utf-8"));

    for (const name of [...TEXT_TOKENS, ...SURFACE_TOKENS]) {
      expect(tokens.get(name), `${name} missing from tokens.css`).toBeDefined();
    }

    const failures: string[] = [];
    for (const mode of ["light", "dark"] as const) {
      for (const textName of TEXT_TOKENS) {
        for (const surfaceName of SURFACE_TOKENS) {
          const text = tokens.get(textName)![mode];
          const surface = tokens.get(surfaceName)![mode];
          // Worst case over the hue wheel is what has to clear the bar.
          const worst = Math.min(...HUES.map((h) => tokenContrast(text, surface, h)));
          if (worst < AA_BODY_TEXT) {
            failures.push(
              `${mode}: ${textName} on ${surfaceName} = ${worst.toFixed(2)}:1 (needs ${AA_BODY_TEXT}:1)`,
            );
          }
        }
      }
    }

    expect(failures, `\n${failures.join("\n")}\n`).toEqual([]);
  });

  it("parses both the hue-inheriting core form and the literal brand-layer form", () => {
    const tokens = parseLightDarkOklchTokens(`
      :root {
        --at-text: light-dark(
          oklch(from var(--at-primary) 20% 0.01 h),
          oklch(from var(--at-primary) 95% 0.005 h)
        );
        --at-text-muted: light-dark(oklch(20% 0.01 75deg / 62%), oklch(95% 0.005 75deg / 56%));
      }
    `);

    // Core form: hue inherited from --at-primary, so left undefined.
    expect(tokens.get("--at-text")).toEqual({
      light: { l: 0.2, c: 0.01, alpha: 1, hue: undefined },
      dark: { l: 0.95, c: 0.005, alpha: 1, hue: undefined },
    });
    // Brand-layer form: literal hue and alpha.
    expect(tokens.get("--at-text-muted")).toEqual({
      light: { l: 0.2, c: 0.01, alpha: 0.62, hue: 75 },
      dark: { l: 0.95, c: 0.005, alpha: 0.56, hue: 75 },
    });
  });

  it("keeps the muted/secondary/body hierarchy visually distinct", async () => {
    // Guards the obvious way to "fix" a contrast failure: crank every alpha to
    // 1 and lose the de-emphasis the tokens exist to express.
    const tokens = parseLightDarkOklchTokens(await readFile(TOKENS_CSS, "utf-8"));
    for (const mode of ["light", "dark"] as const) {
      const body = tokens.get("--at-text")![mode].alpha;
      const secondary = tokens.get("--at-text-secondary")![mode].alpha;
      const muted = tokens.get("--at-text-muted")![mode].alpha;
      expect(muted, `${mode} muted should be lighter than secondary`).toBeLessThan(secondary);
      expect(secondary, `${mode} secondary should be lighter than body`).toBeLessThan(body);
    }
  });
});
