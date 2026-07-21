// WCAG contrast maths for the theme's oklch palette.
//
// Why this exists rather than a browser-based scanner: axe-core cannot evaluate
// contrast on oklch colours. Point pa11y/axe at a site using this theme and
// every text element comes back "needs further review" — thousands of
// non-verdicts, zero signal. Since the palette is defined as design tokens, the
// honest check is on the token values themselves, which is exact, needs no
// browser, and works regardless of what colour syntax CSS grows next.
//
// Brand packages that pin their own semantic tokens (astro-theme-anu's anu.css,
// astro-theme-slop's slop.css) should import these helpers and assert over
// their own values — the theme's defaults being AA-clean says nothing about a
// brand layer that overrides them.

/** Gamma-encoded sRGB, each channel 0–1. */
export type Rgb = [number, number, number];

/**
 * Convert an oklch colour to gamma-encoded sRGB.
 *
 * @param L lightness, 0–1 (CSS writes it as a percentage)
 * @param C chroma
 * @param H hue in degrees
 */
export function oklchToSrgb(L: number, C: number, H: number): Rgb {
  const h = (H * Math.PI) / 180;
  const a = C * Math.cos(h);
  const b = C * Math.sin(h);

  // OKLab -> LMS (cube roots undone), then LMS -> linear sRGB.
  const l = (L + 0.3963377774 * a + 0.2158037573 * b) ** 3;
  const m = (L - 0.1055613458 * a - 0.0638541728 * b) ** 3;
  const s = (L - 0.0894841775 * a - 1.291485548 * b) ** 3;

  const linear: Rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];

  return linear.map((u) => {
    const c = Math.min(1, Math.max(0, u));
    return c <= 0.0031308 ? 12.92 * c : 1.055 * c ** (1 / 2.4) - 0.055;
  }) as Rgb;
}

/**
 * Composite a translucent colour over an opaque background. CSS alpha blending
 * happens in gamma-encoded space, so this deliberately does not linearise.
 */
export function compositeOver(fg: Rgb, alpha: number, bg: Rgb): Rgb {
  return fg.map((c, i) => c * alpha + bg[i] * (1 - alpha)) as Rgb;
}

/** WCAG 2.1 relative luminance. */
export function relativeLuminance([r, g, b]: Rgb): number {
  const lin = (c: number) => (c <= 0.04045 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4);
  return 0.2126 * lin(r) + 0.7152 * lin(g) + 0.0722 * lin(b);
}

/** WCAG 2.1 contrast ratio between two opaque colours, 1–21. */
export function contrastRatio(a: Rgb, b: Rgb): number {
  const [hi, lo] = [relativeLuminance(a), relativeLuminance(b)].sort((x, y) => y - x);
  return (hi + 0.05) / (lo + 0.05);
}

/** WCAG 2.1 AA minimums: 4.5:1 for body text, 3:1 for large or non-text. */
export const AA_BODY_TEXT = 4.5;
export const AA_LARGE_TEXT = 3;

export interface OklchToken {
  l: number;
  c: number;
  /** Fractional alpha; 1 when the token is opaque. */
  alpha: number;
}

export interface LightDarkToken {
  light: OklchToken;
  dark: OklchToken;
}

/**
 * Parse `--at-*: light-dark(oklch(from var(--at-primary) L% C h / A%), …)`
 * declarations out of a stylesheet.
 *
 * Hue is inherited from each brand's `--at-primary`, so it isn't captured here;
 * callers sample across hues instead (chroma is low enough in the neutral ramp
 * that luminance barely moves, but sampling proves it rather than assuming it).
 */
export function parseLightDarkOklchTokens(css: string): Map<string, LightDarkToken> {
  const oklch = String.raw`oklch\(\s*from\s+var\(--at-primary\)\s+([\d.]+)%\s+([\d.]+)\s+h\s*(?:\/\s*([\d.]+)%\s*)?\)`;
  const re = new RegExp(
    String.raw`(--at-[\w-]+)\s*:\s*light-dark\(\s*${oklch}\s*,\s*${oklch}\s*\)`,
    "g",
  );

  const tokens = new Map<string, LightDarkToken>();
  for (const m of css.matchAll(re)) {
    const [, name, ll, lc, la, dl, dc, da] = m;
    tokens.set(name, {
      light: { l: Number(ll) / 100, c: Number(lc), alpha: la === undefined ? 1 : Number(la) / 100 },
      dark: { l: Number(dl) / 100, c: Number(dc), alpha: da === undefined ? 1 : Number(da) / 100 },
    });
  }
  return tokens;
}

/** Contrast of a (possibly translucent) foreground token over a background token. */
export function tokenContrast(fg: OklchToken, bg: OklchToken, hue: number): number {
  const bgRgb = oklchToSrgb(bg.l, bg.c, hue);
  const fgRgb = oklchToSrgb(fg.l, fg.c, hue);
  return contrastRatio(compositeOver(fgRgb, fg.alpha, bgRgb), bgRgb);
}
