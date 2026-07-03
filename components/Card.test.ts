import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import Card from "./Card.astro";

const testImage = {
  src: "/_astro/hero.abc123.avif",
  width: 1600,
  height: 900,
  format: "avif" as const,
};

describe("Card", () => {
  test("renders as a div when no href is provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Card, {
      props: { title: "Static Card" },
      slots: { default: "<p>Body text</p>" },
    });

    expect(html).toContain('<div class="at-card"');
    expect(html).toContain("at-card-title");
    expect(html).toContain("Static Card");
    expect(html).toContain("<p>Body text</p>");
    expect(html).not.toContain("<a ");
  });

  test("renders as a link when href is provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Card, {
      props: { title: "Link Card", href: "/about/" },
    });

    expect(html).toContain("<a ");
    expect(html).toContain('href="/about/"');
    expect(html).toContain("at-card-title");
    expect(html).toContain("Link Card");
  });

  test("renders an image when image prop is provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Card, {
      props: { title: "Image Card", image: testImage, imageAlt: "A hero" },
    });

    expect(html).toContain("<img");
    expect(html).toContain('alt="A hero"');
  });

  test("defaults imageAlt to title when omitted", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Card, {
      props: { title: "Image Card", image: testImage },
    });

    expect(html).toContain('alt="Image Card"');
  });

  test("does not render an image when image prop is omitted", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Card, {
      props: { title: "No Image" },
    });

    expect(html).not.toContain("<img ");
  });
});
