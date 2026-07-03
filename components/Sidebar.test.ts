import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import Sidebar from "./Sidebar.astro";

describe("Sidebar", () => {
  test("renders sections with links", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Sidebar, {
      props: {
        sections: [
          {
            title: "Getting started",
            items: [
              { label: "Install", href: "/docs/install/" },
              { label: "Usage", href: "/docs/usage/" },
            ],
          },
        ],
        currentPath: "/docs/install/",
      },
    });

    expect(html).toContain("Getting started");
    expect(html).toContain('href="/docs/install/"');
    expect(html).toContain('href="/docs/usage/"');
    expect(html).toContain("Install");
    expect(html).toContain("Usage");
  });

  test("marks current page with aria-current", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Sidebar, {
      props: {
        sections: [
          {
            title: "Docs",
            items: [
              { label: "Install", href: "/docs/install/" },
              { label: "Usage", href: "/docs/usage/" },
            ],
          },
        ],
        currentPath: "/docs/install/",
      },
    });

    expect(html).toContain('aria-current="page"');
    const matches = html.match(/aria-current="page"/g);
    expect(matches).toHaveLength(1);
  });

  test("skips empty sections", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Sidebar, {
      props: {
        sections: [
          { title: "Empty", items: [] },
          { title: "Has items", items: [{ label: "One", href: "/one/" }] },
        ],
        currentPath: "/",
      },
    });

    expect(html).not.toContain("Empty");
    expect(html).toContain("Has items");
  });

  test("uses custom label for nav landmark", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Sidebar, {
      props: {
        sections: [{ title: "S", items: [{ label: "A", href: "/a/" }] }],
        currentPath: "/",
        label: "Course navigation",
      },
    });

    expect(html).toContain('aria-label="Course navigation"');
  });
});
