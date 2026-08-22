import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import FilterableCardGrid from "./FilterableCardGrid.astro";

describe("FilterableCardGrid", () => {
  test("server-renders every card for progressive enhancement", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(FilterableCardGrid, {
      props: {
        items: [
          {
            title: "First item",
            href: "/first/",
            description: "A useful description",
            tags: ["Hidden tag"],
            badges: ["Week 1"],
          },
          { title: "Second item", href: "/second/" },
        ],
        columns: 2,
        headingLevel: "h2",
      },
    });

    expect(html).toContain("First item");
    expect(html).toContain("Second item");
    expect(html).toContain('href="/first/"');
    expect(html).toContain("first item a useful description hidden tag week 1");
    expect(html).toContain('<h2 class="at-card-title">First item</h2>');
    expect(html).not.toContain("astro-island");
  });
});
