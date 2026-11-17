import type { AstroIntegration } from "astro";
import { test } from "vitest";
import { mkdtemp, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";

export const fsTest = test.extend<{ tmpDir: string }>({
  // eslint-disable-next-line no-empty-pattern -- vitest fixtures require a destructured first arg
  tmpDir: async ({}, use) => {
    const dir = await mkdtemp(join(tmpdir(), "theme-test-"));
    await use(dir);
    await rm(dir, { recursive: true });
  },
});

type Hooks = AstroIntegration["hooks"];
interface HookParamMap {
  "astro:config:setup": Parameters<NonNullable<Hooks["astro:config:setup"]>>[0];
  "astro:build:done": Parameters<NonNullable<Hooks["astro:build:done"]>>[0];
}

/**
 * Astro's hook parameters carry dozens of fields (a full AstroConfig, route
 * tables, ...) that the theme never reads, so tests supply only the ones it
 * does and this types the result as the real parameter for the named hook.
 */
export function hookParams<K extends keyof HookParamMap>(
  partial: object,
  _hook: K,
): HookParamMap[K] {
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion -- a partial stub of Astro's huge hook params; building every field would just be noise
  return partial as HookParamMap[K];
}
