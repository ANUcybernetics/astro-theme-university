import type { PluginDescriptor } from "emdash";
import pkg from "../package.json" with { type: "json" };
import { portableTextBlocks } from "./blocks.js";

/**
 * EmDash plugin descriptor: pass it to `emdash({ plugins: [...] })`. It adds
 * the theme's block types to the rich-text editor and renders them (and
 * EmDash's built-in code block) with the theme's components, so a site picks
 * up new blocks by bumping its theme pin.
 */
export function universityBlocks(): PluginDescriptor {
  return {
    id: "astro-theme-university",
    version: pkg.version,
    format: "native",
    entrypoint: "astro-theme-university/emdash/plugin",
    componentsEntry: "astro-theme-university/emdash/components",
    portableTextBlocks,
  };
}
