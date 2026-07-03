import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import Callout from "./Callout.astro";

describe("Callout", () => {
  test("defaults to info type", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Callout, {
      slots: { default: "<p>Heads up</p>" },
    });

    expect(html).toContain("at-callout--info");
    expect(html).toContain("<p>Heads up</p>");
  });

  test("applies the warning type class", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Callout, {
      props: { type: "warning" },
      slots: { default: "<p>Watch out</p>" },
    });

    expect(html).toContain("at-callout--warning");
  });

  test("applies the error type class", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Callout, {
      props: { type: "error" },
      slots: { default: "<p>Something broke</p>" },
    });

    expect(html).toContain("at-callout--error");
  });

  test("renders as an aside with role note", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Callout, {
      slots: { default: "<p>Info</p>" },
    });

    expect(html).toContain("<aside");
    expect(html).toContain('role="note"');
  });
});
