import { mkdirSync, writeFileSync } from "node:fs";
import { basename, dirname, resolve } from "node:path";
import { globSync } from "node:fs";
import {
  type ComponentProps,
  loadSharedTypes,
  processAstroFile,
  processSvelteFile,
  processTypeScriptFile,
} from "./extract-props-lib.ts";

const root = resolve(import.meta.dirname, "..");
const pkgDir = root;
const sharedTypes = loadSharedTypes(resolve(pkgDir, "types.ts"));

function componentName(filePath: string): string {
  return basename(filePath).replace(/\.(astro|svelte)$/, "");
}

const astroFiles = [
  ...globSync(resolve(pkgDir, "components/*.astro")),
  ...globSync(resolve(pkgDir, "layouts/*.astro")),
];

const svelteFiles = globSync(resolve(pkgDir, "components/*.svelte"));

const output: Record<string, ComponentProps> = {};

for (const file of astroFiles) {
  const result = processAstroFile(file, sharedTypes);
  if (result) {
    const name = componentName(file);
    const category = dirname(file).endsWith("layouts") ? "layouts" : "components";
    output[`${category}/${name}`] = result;
  }
}

for (const file of svelteFiles) {
  const result = processSvelteFile(file);
  if (result) {
    output[`components/${componentName(file)}`] = result;
  }
}

const themeOptions = processTypeScriptFile(resolve(pkgDir, "index.ts"), "ThemeOptions");
if (themeOptions) {
  output["ThemeOptions"] = themeOptions;
}

const outPath = resolve(root, "docs/src/data/props.json");
mkdirSync(dirname(outPath), { recursive: true });
writeFileSync(outPath, JSON.stringify(output, null, 2) + "\n");
console.log(`Wrote ${Object.keys(output).length} entries to ${outPath}`);
