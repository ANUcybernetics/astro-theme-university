import type { ImageMetadata } from "astro";
import type { RemoteImage } from "./types.js";

// Vite rewrites import.meta.glob at build time relative to the consumer's
// project root, so this glob indexes the *site's* assets even though the code
// ships in the theme package. It must stay in a Vite-processed module — never
// import this file from index.ts (the integration entry), which Astro bundles
// with esbuild for config loading, where import.meta.glob does not exist.
const imageModules = import.meta.glob<{ default: ImageMetadata }>(
  "/src/assets/**/*.{avif,png,jpg,jpeg,webp,gif,svg}",
  { eager: true },
);

/**
 * Narrows a Card/Hero image source. RemoteImage carries no `format` (there is
 * no build-time pipeline to tell), which is exactly the field every
 * ImageMetadata has.
 */
export function isRemoteImage(image: ImageMetadata | RemoteImage): image is RemoteImage {
  return !("format" in image);
}

/**
 * Resolves a layout `heroImage` prop to something Hero can render.
 *
 * - `ImageMetadata` / `RemoteImage` objects pass through.
 * - `http(s)://` strings become a minimal `RemoteImage` (no dimensions or
 *   srcset — the CSS-pinned hero layout doesn't need them).
 * - `/src/assets/...` strings resolve through the project-wide glob (the
 *   frontmatter-friendly form for MDX pages).
 * - Anything else warns and drops the hero, so the page falls back to its
 *   plain heading rather than rendering a broken image.
 */
export function resolveHeroImage(
  heroImage: string | ImageMetadata | RemoteImage | undefined,
): ImageMetadata | RemoteImage | undefined {
  if (typeof heroImage !== "string") return heroImage;
  if (/^https?:\/\//.test(heroImage)) return { src: heroImage };
  if (heroImage.startsWith("/src/")) {
    const mod = imageModules[heroImage];
    if (mod) return mod.default;
    console.warn(
      `[astro-theme-university] heroImage "${heroImage}" could not be resolved. ` +
        `String paths must start with "/src/assets/" and point to an existing image file.`,
    );
    return undefined;
  }
  console.warn(
    `[astro-theme-university] heroImage "${heroImage}" is not a supported string value. ` +
      `Use an imported ImageMetadata, a RemoteImage, an absolute http(s) URL, ` +
      `or a "/src/assets/..." path.`,
  );
  return undefined;
}
