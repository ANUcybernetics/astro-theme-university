import { execFileSync } from "node:child_process";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

const REPO_ROOT = resolve(import.meta.dirname, "..");
const SCRIPT = resolve(REPO_ROOT, "scripts/list-icons.mjs");

function run(args: string[] = []): string {
  return execFileSync("node", [SCRIPT, ...args], {
    cwd: REPO_ROOT,
    encoding: "utf-8",
  });
}

describe("scripts/list-icons.mjs", () => {
  test("with no args, prints a non-empty list of icon names", () => {
    const out = run();
    const names = out.split("\n").filter(Boolean);
    expect(names.length).toBeGreaterThan(100);
    // bare names, no iconoir: prefix
    for (const n of names.slice(0, 20)) {
      expect(n).not.toContain(":");
    }
  });

  test("with a substring, every line contains it (case-insensitive)", () => {
    const out = run(["github"]);
    const names = out.split("\n").filter(Boolean);
    expect(names.length).toBeGreaterThan(0);
    for (const n of names) expect(n.toLowerCase()).toContain("github");
  });

  test("with a definitely-missing substring, exits 0 with empty output", () => {
    const out = run(["zzzz-no-such-icon"]);
    expect(out).toBe("");
  });
});
