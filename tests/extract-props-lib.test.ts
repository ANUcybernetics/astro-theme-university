import { describe, expect, test } from "vitest";
import { Project } from "ts-morph";
import { extractDefaultsFromAST } from "../scripts/extract-props-lib.ts";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import {
  extractAstroFrontmatter,
  extractSvelteScript,
  processAstroFile,
  processSvelteFile,
} from "../scripts/extract-props-lib.ts";

let tmpDir: string;

function writeTmp(name: string, content: string): string {
  const p = join(tmpDir, name);
  writeFileSync(p, content);
  return p;
}

function makeSourceFile(code: string) {
  const project = new Project({ useInMemoryFileSystem: true });
  return project.createSourceFile("test.ts", code);
}

describe("extractAstroFrontmatter", () => {
  tmpDir = mkdtempSync(join(tmpdir(), "extract-props-"));

  test("extracts frontmatter from a standard astro file", () => {
    const p = writeTmp(
      "Normal.astro",
      "---\ninterface Props {\n  title: string;\n}\nconst { title } = Astro.props;\n---\n<h1>{title}</h1>\n",
    );
    const result = extractAstroFrontmatter(p);
    expect(result).toBe("interface Props {\n  title: string;\n}\nconst { title } = Astro.props;");
  });

  test("returns empty string when file has no frontmatter", () => {
    const p = writeTmp("NoFM.astro", "<h1>Hello</h1>\n");
    expect(extractAstroFrontmatter(p)).toBe("");
  });

  test("returns empty string for empty frontmatter", () => {
    const p = writeTmp("Empty.astro", "---\n---\n<div />\n");
    expect(extractAstroFrontmatter(p)).toBe("");
  });
});

describe("extractSvelteScript", () => {
  test("extracts script from a standard svelte file", () => {
    const p = writeTmp(
      "Normal.svelte",
      '<script lang="ts">\n  let { x }: Props = $props();\n</script>\n<div>{x}</div>\n',
    );
    const result = extractSvelteScript(p);
    expect(result).toBe("\n  let { x }: Props = $props();\n");
  });

  test("returns empty string when no script tag", () => {
    const p = writeTmp("NoScript.svelte", "<div>static</div>\n");
    expect(extractSvelteScript(p)).toBe("");
  });

  test("returns empty string for non-ts script", () => {
    const p = writeTmp("JsScript.svelte", "<script>\n  let x = 1;\n</script>\n");
    expect(extractSvelteScript(p)).toBe("");
  });
});

describe("extractDefaultsFromAST", () => {
  test("extracts defaults from Astro.props destructuring", () => {
    const sf = makeSourceFile(
      'const { title, href, imageAlt = "", headingLevel = "h3" } = Astro.props;',
    );
    const defaults = extractDefaultsFromAST(sf, "Astro.props");
    expect(defaults).toEqual({ imageAlt: '""', headingLevel: '"h3"' });
  });

  test("extracts defaults from $props() destructuring", () => {
    const sf = makeSourceFile('let { deadline, label = "Due" }: Props = $props();');
    const defaults = extractDefaultsFromAST(sf, "$props()");
    expect(defaults).toEqual({ label: '"Due"' });
  });

  test("returns empty object when no defaults", () => {
    const sf = makeSourceFile("const { a, b, c } = Astro.props;");
    expect(extractDefaultsFromAST(sf, "Astro.props")).toEqual({});
  });

  test("returns empty object when no matching props call", () => {
    const sf = makeSourceFile("const { a = 1 } = someOtherThing();");
    expect(extractDefaultsFromAST(sf, "Astro.props")).toEqual({});
    expect(extractDefaultsFromAST(sf, "$props()")).toEqual({});
  });

  test("handles numeric and array defaults", () => {
    const sf = makeSourceFile("const { columns = 3, items = [] } = Astro.props;");
    const defaults = extractDefaultsFromAST(sf, "Astro.props");
    expect(defaults).toEqual({ columns: "3", items: "[]" });
  });

  test("handles complex default expressions", () => {
    const sf = makeSourceFile('const { config = { a: 1, b: "x" } } = Astro.props;');
    const defaults = extractDefaultsFromAST(sf, "Astro.props");
    expect(defaults.config).toBe('{ a: 1, b: "x" }');
  });
});

describe("processAstroFile", () => {
  test("processes a complete astro component", () => {
    const p = writeTmp(
      "TestComp.astro",
      [
        "---",
        "interface Props {",
        "  /** The title. */",
        "  title: string;",
        "  count?: number;",
        "}",
        "const { title, count = 5 } = Astro.props;",
        "---",
        "<h1>{title}</h1>",
      ].join("\n"),
    );
    const result = processAstroFile(p);
    expect(result).not.toBeNull();
    expect(result!.props).toHaveLength(2);
    expect(result!.props[0]).toMatchObject({
      name: "title",
      type: "string",
      required: true,
      description: "The title.",
    });
    expect(result!.props[1]).toMatchObject({
      name: "count",
      type: "number",
      required: false,
      default: "5",
    });
  });

  test("returns null when no Props interface", () => {
    const p = writeTmp("NoProps.astro", "---\nconst x = 1;\n---\n<div />\n");
    expect(processAstroFile(p)).toBeNull();
  });
});

describe("processSvelteFile", () => {
  test("processes svelte component with explicit Props interface", () => {
    const p = writeTmp(
      "Explicit.svelte",
      [
        '<script lang="ts">',
        "  interface Props {",
        "    /** The name. */",
        "    name: string;",
        "    greeting?: string;",
        "  }",
        '  let { name, greeting = "Hello" }: Props = $props();',
        "</script>",
        "<p>{greeting} {name}</p>",
      ].join("\n"),
    );
    const result = processSvelteFile(p);
    expect(result).not.toBeNull();
    expect(result!.props).toHaveLength(2);
    expect(result!.props[0]).toMatchObject({
      name: "name",
      type: "string",
      required: true,
      description: "The name.",
    });
    expect(result!.props[1]).toMatchObject({
      name: "greeting",
      default: '"Hello"',
    });
  });

  test("processes svelte component with inline type literal", () => {
    const p = writeTmp(
      "Inline.svelte",
      [
        '<script lang="ts">',
        "  let { x, y = 0 }: { x: string; y?: number } = $props();",
        "</script>",
        "<p>{x}{y}</p>",
      ].join("\n"),
    );
    const result = processSvelteFile(p);
    expect(result).not.toBeNull();
    expect(result!.props).toHaveLength(2);
    expect(result!.props[0]).toMatchObject({ name: "x", type: "string", required: true });
    expect(result!.props[1]).toMatchObject({
      name: "y",
      type: "number",
      required: false,
      default: "0",
    });
  });

  test("returns null when no $props() call", () => {
    const p = writeTmp(
      "NoProps.svelte",
      '<script lang="ts">\n  let x = $state(0);\n</script>\n<p>{x}</p>\n',
    );
    expect(processSvelteFile(p)).toBeNull();
  });

  test("returns null when no script tag", () => {
    const p = writeTmp("Static.svelte", "<p>static</p>\n");
    expect(processSvelteFile(p)).toBeNull();
  });
});
