import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import Pagination from "./Pagination.astro";

describe("Pagination", () => {
  test("renders prev and next links when both exist", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Pagination, {
      props: {
        page: {
          url: { prev: "/blog/", next: "/blog/3/" },
          currentPage: 2,
          lastPage: 5,
        },
      },
    });

    expect(html).toContain('href="/blog/"');
    expect(html).toContain('href="/blog/3/"');
    expect(html).toContain("Page 2 of 5");
  });

  test("omits prev link on first page", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Pagination, {
      props: {
        page: {
          url: { prev: undefined, next: "/blog/2/" },
          currentPage: 1,
          lastPage: 3,
        },
      },
    });

    expect(html).not.toContain("Previous");
    expect(html).toContain('href="/blog/2/"');
    expect(html).toContain("Page 1 of 3");
  });

  test("omits next link on last page", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Pagination, {
      props: {
        page: {
          url: { prev: "/blog/2/", next: undefined },
          currentPage: 3,
          lastPage: 3,
        },
      },
    });

    expect(html).toContain("Previous");
    expect(html).not.toContain("Next");
    expect(html).toContain("Page 3 of 3");
  });

  test("has pagination aria label", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Pagination, {
      props: {
        page: {
          url: { prev: undefined, next: undefined },
          currentPage: 1,
          lastPage: 1,
        },
      },
    });

    expect(html).toContain('aria-label="Pagination"');
  });
});
