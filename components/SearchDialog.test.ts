import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import SearchDialog from "./SearchDialog.astro";

describe("SearchDialog", () => {
  test("renders a native dialog and normalizes the Pagefind base", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(SearchDialog, {
      props: { basePath: "/course" },
    });

    expect(html).toContain("<dialog");
    expect(html).toContain('data-pagefind-base="/course/"');
    expect(html).toContain('type="search"');
    expect(html).not.toContain("astro-island");
  });
});
