import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import Icon, { IconifyIcon } from "./Icon.astro";

describe("Icon", () => {
  test("renders an svg for a known iconoir name", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Icon, {
      props: { name: "github" },
    });

    expect(html).toContain("<svg");
    // iconoir ships strokes with currentColor so the icon inherits text colour
    expect(html.toLowerCase()).toContain("currentcolor");
  });

  test("default attributes mark the icon as decorative", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Icon, {
      props: { name: "github" },
    });

    expect(html).toContain('aria-hidden="true"');
    expect(html).toContain('focusable="false"');
    expect(html).not.toContain('role="img"');
  });

  test("defaults to size 1em", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Icon, {
      props: { name: "github" },
    });

    expect(html).toContain('width="1em"');
    expect(html).toContain('height="1em"');
  });

  test("forwards size as a string", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Icon, {
      props: { name: "github", size: "1.5em" },
    });

    expect(html).toContain('width="1.5em"');
    expect(html).toContain('height="1.5em"');
  });

  test("forwards size as a number", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Icon, {
      props: { name: "github", size: 24 },
    });

    expect(html).toMatch(/width="24(px)?"/);
    expect(html).toMatch(/height="24(px)?"/);
  });

  test("aria-label flips it to a labelled image", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Icon, {
      props: { name: "warning-triangle", "aria-label": "Warning" },
    });

    expect(html).not.toContain('aria-hidden="true"');
    expect(html).toContain('role="img"');
    expect(html).toContain('aria-label="Warning"');
  });

  test("re-exports astro-icon's underlying Icon as IconifyIcon", () => {
    expect(IconifyIcon).toBeDefined();
  });

  test("forwards class and style to the rendered svg", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Icon, {
      props: { name: "github", class: "card-icon", style: "color: red" },
    });

    expect(html).toMatch(/class="[^"]*card-icon/);
    expect(html).toContain("color: red");
  });
});
