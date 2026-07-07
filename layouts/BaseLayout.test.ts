import { experimental_AstroContainer as AstroContainer } from "astro/container";
import svelteRenderer from "@astrojs/svelte/server.js";
import { describe, expect, test } from "vitest";
import BaseLayout from "./BaseLayout.astro";

async function createContainer() {
  const container = await AstroContainer.create();
  container.addServerRenderer({ renderer: svelteRenderer });
  return container;
}

describe("BaseLayout", () => {
  test("emits no favicon link when no favicon prop is passed", async () => {
    const container = await createContainer();
    const html = await container.renderToString(BaseLayout, {
      props: { title: "Test" },
    });
    expect(html).not.toMatch(/<link rel="icon"/);
  });

  test("uses custom favicon when favicon prop is passed", async () => {
    const container = await createContainer();
    const html = await container.renderToString(BaseLayout, {
      props: {
        title: "Test",
        favicon: {
          src: "/custom-favicon.svg",
          width: 32,
          height: 32,
          format: "svg",
        } as ImageMetadata,
      },
    });
    expect(html).toContain('href="/custom-favicon.svg"');
  });

  test("emits no llms.txt alternate link when llmsTxt generation is off", async () => {
    // The test stub sets llmsTxtHref to null (see vitest.config.ts), matching
    // an llmsTxt: false setup.
    const container = await createContainer();
    const html = await container.renderToString(BaseLayout, {
      props: { title: "Test" },
    });
    expect(html).not.toMatch(/rel="alternate"[^>]*llms\.txt/);
  });

  test("renders the auto-detect script when colorScheme is 'auto'", async () => {
    const container = await createContainer();
    const html = await container.renderToString(BaseLayout, {
      props: { title: "Test", colorScheme: "auto" },
    });
    expect(html).toContain('localStorage.getItem("at-theme")');
  });

  test("forces data-theme=dark and skips toggle script when colorScheme is 'dark'", async () => {
    const container = await createContainer();
    const html = await container.renderToString(BaseLayout, {
      props: { title: "Test", colorScheme: "dark" },
    });
    expect(html).toMatch(/<html[^>]*data-theme="dark"/);
    expect(html).not.toContain('localStorage.getItem("at-theme")');
  });

  test("forces data-theme=light and skips toggle script when colorScheme is 'light'", async () => {
    const container = await createContainer();
    const html = await container.renderToString(BaseLayout, {
      props: { title: "Test", colorScheme: "light" },
    });
    expect(html).toMatch(/<html[^>]*data-theme="light"/);
    expect(html).not.toContain('localStorage.getItem("at-theme")');
  });

  test("forwards acknowledgement to Footer", async () => {
    const container = await createContainer();
    const html = await container.renderToString(BaseLayout, {
      props: {
        title: "Test",
        acknowledgement: { text: "Forwarded acknowledgement text." },
      },
    });
    expect(html).toContain("Forwarded acknowledgement text.");
  });

  test("renders content passed to the head slot inside <head>", async () => {
    const container = await createContainer();
    const html = await container.renderToString(BaseLayout, {
      props: { title: "Test" },
      slots: { head: '<meta name="custom-head-marker" content="x" />' },
    });
    expect(html).toMatch(/<head>[\s\S]*custom-head-marker[\s\S]*<\/head>/);
  });
});
