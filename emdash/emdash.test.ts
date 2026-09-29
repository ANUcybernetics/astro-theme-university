import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import pkg from "../package.json" with { type: "json" };
import CalloutBlock from "./CalloutBlock.astro";
import CodeBlock from "./CodeBlock.astro";
import { blockComponents } from "./components.js";
import { universityBlocks } from "./index.js";
import { createPlugin } from "./plugin.js";

describe("EmDash plugin", () => {
  test("the descriptor's entry points resolve to package exports", () => {
    const descriptor = universityBlocks();
    const exported = Object.keys(pkg.exports).map((key) => key.replace(/^\./, pkg.name));
    expect(exported).toContain(descriptor.entrypoint);
    expect(exported).toContain(descriptor.componentsEntry);
    expect(descriptor.version).toBe(pkg.version);
  });

  test("every editor block type has a renderer", () => {
    for (const block of universityBlocks().portableTextBlocks ?? []) {
      expect(blockComponents).toHaveProperty(block.type);
    }
  });

  test("the native plugin passes EmDash's validation and declares the same blocks", () => {
    const plugin = createPlugin();
    expect(plugin.id).toBe(universityBlocks().id);
    expect(plugin.admin.portableTextBlocks).toEqual(universityBlocks().portableTextBlocks);
  });
});

describe("CalloutBlock", () => {
  test("renders the node's tone and splits its text into paragraphs", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CalloutBlock, {
      props: { node: { _type: "callout", tone: "warning", text: "First.\n\nSecond." } },
    });
    expect(html).toContain("at-callout--warning");
    expect(html).toContain("<p>First.</p>");
    expect(html).toContain("<p>Second.</p>");
  });

  test("defaults to the info tone", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CalloutBlock, {
      props: { node: { _type: "callout", text: "Note." } },
    });
    expect(html).toContain("at-callout--info");
  });
});

describe("CodeBlock", () => {
  test("highlights with the theme's Shiki themes rather than EmDash's defaults", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CodeBlock, {
      props: { node: { _type: "code", code: "const x = 1;", language: "ts" } },
    });
    expect(html).toContain('class="astro-code');
    expect(html).toContain("--shiki-dark");
    expect(html).not.toContain("emdash-code");
  });

  test("renders a node without a language as plain text", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(CodeBlock, {
      props: { node: { _type: "code", code: "plain words" } },
    });
    expect(html).toContain("plain words");
  });
});
