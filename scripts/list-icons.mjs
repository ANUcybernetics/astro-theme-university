#!/usr/bin/env node
import { readFileSync } from "node:fs";
import { createRequire } from "node:module";
import { resolve } from "node:path";

const themePkgDir = resolve(import.meta.dirname, "..", "packages", "astro-theme-university");
const require = createRequire(themePkgDir + "/");
const iconsJsonPath = require.resolve("@iconify-json/iconoir/icons.json");
const data = JSON.parse(readFileSync(iconsJsonPath, "utf-8"));

const names = Object.keys(data.icons ?? {});
const filter = (process.argv[2] ?? "").toLowerCase();

const matches = filter ? names.filter((n) => n.toLowerCase().includes(filter)) : names;

if (matches.length > 0) console.log(matches.sort().join("\n"));
