import { execSync } from "node:child_process";
import {
  cpSync,
  existsSync,
  mkdtempSync,
  readFileSync,
  readdirSync,
  rmSync,
  writeFileSync,
} from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, test, expect, afterAll } from "vitest";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const EXAMPLES_DIR = join(REPO_ROOT, "examples");

// The theme package lives at the repo root.
const WORKSPACE_PACKAGES = ["astro-theme-university"];

const EXAMPLE_NAMES = ["base"];

const tempDirs: string[] = [];

afterAll(() => {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
});

function rewriteWorkspaceDependencies(packageJsonPath: string) {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  for (const name of WORKSPACE_PACKAGES) {
    if (pkg.dependencies?.[name]) {
      pkg.dependencies[name] = `file:${REPO_ROOT}`;
    }
  }
  writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");
}

function cleanEnv(extra: Record<string, string> = {}): NodeJS.ProcessEnv {
  const env = { ...process.env, CI: "true", ...extra };
  // Vitest/Vite inject BASE_URL, MODE, DEV, PROD, SSR into process.env.
  // These leak into child builds via execSync and override the child
  // Vite instance's own config. Strip them so each child build derives
  // its own values from its own astro.config.
  for (const key of Object.keys(env)) {
    if (
      key.startsWith("VITEST") ||
      key.startsWith("NODE_V8") ||
      key === "BASE_URL" ||
      key === "MODE" ||
      key === "DEV" ||
      key === "PROD" ||
      key === "SSR"
    ) {
      delete env[key];
    }
  }
  return env;
}

function run(command: string, cwd: string, env: Record<string, string> = {}) {
  execSync(command, {
    cwd,
    stdio: "pipe",
    timeout: 120_000,
    env: cleanEnv(env),
  });
}

function collectHtmlFiles(dir: string): string[] {
  const files: string[] = [];
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) files.push(...collectHtmlFiles(full));
    else if (entry.name.endsWith(".html")) files.push(full);
  }
  return files;
}

function findUnprefixedInternalLinks(distDir: string, base: string): string[] {
  const violations: string[] = [];
  const cleanBase = base.replace(/\/$/, "");
  for (const file of collectHtmlFiles(distDir)) {
    const rel = file.replace(distDir, "");
    // Skip deck slide pages — astromotion owns those routes and its
    // HTML template is outside the theme's control.
    if (/\/decks\/[^/]+\/index\.html$/.test(rel)) continue;

    const html = readFileSync(file, "utf-8");
    const hrefPattern = /href="(\/[^"]*?)"/g;
    let match;
    while ((match = hrefPattern.exec(html)) !== null) {
      const href = match[1];
      if (href.startsWith("//")) continue;
      if (href.startsWith(cleanBase + "/") || href === cleanBase) continue;
      violations.push(`${rel}: href="${href}"`);
    }
  }
  return violations;
}

describe("example builds", () => {
  for (const name of EXAMPLE_NAMES) {
    test(`${name} example builds successfully`, { timeout: 120_000 }, () => {
      const exampleDir = join(EXAMPLES_DIR, name);
      const tempDir = mkdtempSync(join(tmpdir(), `example-${name}-`));
      tempDirs.push(tempDir);

      cpSync(exampleDir, tempDir, { recursive: true });

      rewriteWorkspaceDependencies(join(tempDir, "package.json"));

      run("pnpm install --no-frozen-lockfile", tempDir);
      run("pnpm build", tempDir);

      expect(existsSync(join(tempDir, "dist"))).toBe(true);

      // Site-registered fonts (Lora, from this example's astro.config) must
      // be emitted alongside the theme pair, and both entries of the
      // example's preloadFonts list must yield font preload links.
      const indexHtml = readFileSync(join(tempDir, "dist", "index.html"), "utf-8");
      expect(indexHtml).toContain("Lora");
      const fontPreloads = indexHtml.match(/as="font"/g) ?? [];
      expect(fontPreloads.length).toBeGreaterThanOrEqual(2);
    });
  }
});

describe("base-path builds", () => {
  const BASE_PATH = "/test-base";

  for (const name of EXAMPLE_NAMES) {
    test(
      `${name} example has no un-prefixed internal links under base path`,
      { timeout: 120_000 },
      () => {
        const exampleDir = join(EXAMPLES_DIR, name);
        const tempDir = mkdtempSync(join(tmpdir(), `example-${name}-base-`));
        tempDirs.push(tempDir);

        cpSync(exampleDir, tempDir, { recursive: true });
        rewriteWorkspaceDependencies(join(tempDir, "package.json"));

        run("pnpm install --no-frozen-lockfile", tempDir);

        run("pnpm build", tempDir, {
          SITE_URL: "https://example.com",
          BASE_PATH,
        });

        const distDir = join(tempDir, "dist");
        expect(existsSync(distDir)).toBe(true);

        const violations = findUnprefixedInternalLinks(distDir, BASE_PATH);
        expect(violations, `Found un-prefixed internal links:\n${violations.join("\n")}`).toEqual(
          [],
        );
      },
    );
  }
});
