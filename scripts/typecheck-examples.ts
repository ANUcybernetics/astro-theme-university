import { execFileSync } from "node:child_process";
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const EXAMPLES_DIR = join(REPO_ROOT, "examples");
const PACKAGES_DIR = join(REPO_ROOT, "packages");

const WORKSPACE_PACKAGES = ["astro-theme-university"];
const EXAMPLE_NAMES = ["base"];

function rewriteWorkspaceDependencies(packageJsonPath: string) {
  const pkg = JSON.parse(readFileSync(packageJsonPath, "utf-8"));
  for (const name of WORKSPACE_PACKAGES) {
    if (pkg.dependencies?.[name]) {
      pkg.dependencies[name] = `file:${join(PACKAGES_DIR, name)}`;
    }
  }
  writeFileSync(packageJsonPath, JSON.stringify(pkg, null, 2) + "\n");
}

function run(cmd: string, args: string[], cwd: string) {
  execFileSync(cmd, args, {
    cwd,
    stdio: "inherit",
    timeout: 180_000,
    // pnpm 11 prompts for TTY confirmation on modules-dir purge unless CI is set.
    env: { ...process.env, CI: "true" },
  });
}

const tempDirs: string[] = [];

try {
  for (const name of EXAMPLE_NAMES) {
    console.log(`\n[typecheck-examples] ${name}`);
    const exampleDir = join(EXAMPLES_DIR, name);
    const tempDir = mkdtempSync(join(tmpdir(), `typecheck-${name}-`));
    tempDirs.push(tempDir);

    cpSync(exampleDir, tempDir, { recursive: true });
    rewriteWorkspaceDependencies(join(tempDir, "package.json"));

    run("pnpm", ["install", "--no-frozen-lockfile", "--prefer-offline"], tempDir);
    run("pnpm", ["typecheck"], tempDir);
  }
  console.log("\n[typecheck-examples] all examples typechecked cleanly");
} finally {
  for (const dir of tempDirs) {
    rmSync(dir, { recursive: true, force: true });
  }
}
