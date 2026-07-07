import { experimental_AstroContainer as AstroContainer } from "astro/container";
import svelteRenderer from "@astrojs/svelte/server.js";
import { expect, test, vi } from "vitest";

// Override the null stub from vitest.config.ts so this file exercises the
// llmsTxt: true case, where the integration supplies a real href.
vi.mock("virtual:astro-theme-university/llms", () => ({
  llmsTxtHref: "/docs/llms.txt",
}));

test("advertises llms.txt in the head when the integration supplies an href", async () => {
  const { default: BaseLayout } = await import("./BaseLayout.astro");
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: svelteRenderer });
  const html = await container.renderToString(BaseLayout, {
    props: { title: "Test" },
  });
  expect(html).toMatch(
    /<link rel="alternate" type="text\/markdown" href="\/docs\/llms\.txt" title="llms\.txt"/,
  );
});
