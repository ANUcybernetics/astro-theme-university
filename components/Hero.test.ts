import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import Hero from "./Hero.astro";

const testImage = {
  src: "/_astro/hero.abc123.avif",
  width: 1600,
  height: 900,
  format: "avif" as const,
};

describe("Hero", () => {
  test("renders a section with hero class", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: { title: "Welcome", image: testImage, imageAlt: "Test image" },
    });

    expect(html).toContain('<section class="at-hero"');
  });

  test("renders an img with the provided src", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: { title: "Welcome", image: testImage, imageAlt: "Test image" },
    });

    expect(html).toContain('class="at-hero-image"');
    expect(html).toContain("<img");
  });

  test("renders the title in an h1", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: { title: "Research & Innovation", image: testImage, imageAlt: "Test image" },
    });

    expect(html).toContain("at-hero-title");
    expect(html).toContain("Research &amp; Innovation");
  });

  test("uses provided imageAlt", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: {
        title: "Welcome",
        image: testImage,
        imageAlt: "Campus aerial view",
      },
    });

    expect(html).toContain('alt="Campus aerial view"');
  });
});
