import { definePlugin } from "emdash";
import pkg from "../package.json" with { type: "json" };
import { portableTextBlocks } from "./blocks.js";

export function createPlugin() {
  return definePlugin({
    id: "astro-theme-university",
    version: pkg.version,
    admin: { portableTextBlocks },
  });
}
