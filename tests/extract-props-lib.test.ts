import { describe, expect, test } from "vitest";
import { Project } from "ts-morph";
import { extractDefaultsFromAST } from "../scripts/extract-props-lib.ts";
import { mkdtempSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { tmpdir } from "node:os";

import { extractAstroFrontmatter, processAstroFile } from "../scripts/extract-props-lib.ts";

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

describe("extractDefaultsFromAST", () => {
  test("extracts defaults from Astro.props destructuring", () => {
    const sf = makeSourceFile(
      'const { title, href, imageAlt = "", headingLevel = "h3" } = Astro.props;',
    );
    const defaults = extractDefaultsFromAST(sf);
    expect(defaults).toEqual({ imageAlt: '""', headingLevel: '"h3"' });
  });

  test("returns empty object when no defaults", () => {
    const sf = makeSourceFile("const { a, b, c } = Astro.props;");
    expect(extractDefaultsFromAST(sf)).toEqual({});
  });

  test("returns empty object when no matching props call", () => {
    const sf = makeSourceFile("const { a = 1 } = someOtherThing();");
    expect(extractDefaultsFromAST(sf)).toEqual({});
  });

  test("handles numeric and array defaults", () => {
    const sf = makeSourceFile("const { columns = 3, items = [] } = Astro.props;");
    const defaults = extractDefaultsFromAST(sf);
    expect(defaults).toEqual({ columns: "3", items: "[]" });
  });

  test("handles complex default expressions", () => {
    const sf = makeSourceFile('const { config = { a: 1, b: "x" } } = Astro.props;');
    const defaults = extractDefaultsFromAST(sf);
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
