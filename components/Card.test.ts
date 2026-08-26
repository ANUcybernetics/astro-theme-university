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

  test("renders the actions slot outside the card's link", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Card, {
      props: { title: "Action Card", href: "/about/" },
      slots: { actions: "<button type='button'>QR</button>" },
    });

    // A linked card with actions is a div: the anchor shrinks to the title and
    // stretches back over the card, so the button isn't nested in a link.
    expect(html).toContain('<div class="at-card"');
    expect(html).toContain('class="at-card-title-link" href="/about/"');
    expect(html).toContain('class="at-card-actions"');
    expect(html).toContain("<button type='button'>QR</button>");
  });

  test("leaves a linked card whole when the actions slot is empty", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Card, {
      props: { title: "Plain Link", href: "/about/" },
    });

    expect(html).toContain('<a class="at-card"');
    expect(html).not.toContain("at-card-title-link");
    expect(html).not.toContain("at-card-actions");
  });

  test("renders actions on an unlinked card without a stretched link", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Card, {
      props: { title: "Action Card" },
      slots: { actions: "<button type='button'>QR</button>" },
    });

    expect(html).toContain('class="at-card-actions"');
    expect(html).not.toContain("at-card-title-link");
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

  test("renders a remote image as a plain img, outside the asset pipeline", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Card, {
      props: {
        title: "Remote Card",
        image: {
          src: "https://img.example.com/thumbs/entry-960.avif",
          width: 960,
          height: 540,
          srcset:
            "https://img.example.com/thumbs/entry-320.avif 320w, " +
            "https://img.example.com/thumbs/entry-640.avif 640w, " +
            "https://img.example.com/thumbs/entry-960.avif 960w",
        },
        imageAlt: "A remote thumb",
      },
    });

    expect(html).toContain('src="https://img.example.com/thumbs/entry-960.avif"');
    expect(html).toContain('srcset="https://img.example.com/thumbs/entry-320.avif 320w');
    // srcset present, no per-image sizes → the component's default sizes apply.
    expect(html).toContain('sizes="(min-width: 48rem) 24rem, 100vw"');
    expect(html).toContain('width="960"');
    expect(html).toContain('height="540"');
    expect(html).toContain('alt="A remote thumb"');
    expect(html).toContain('class="at-card-image"');
    expect(html).toContain('loading="lazy"');
    expect(html).not.toContain("/_astro/");
  });

  test("remote image sizes field overrides the component default", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Card, {
      props: {
        title: "Remote Card",
        image: {
          src: "https://img.example.com/t-640.avif",
          srcset:
            "https://img.example.com/t-320.avif 320w, https://img.example.com/t-640.avif 640w",
          sizes: "9rem",
        },
      },
    });

    expect(html).toContain('sizes="9rem"');
  });

  test("minimal remote image emits no srcset, sizes, or dimension attrs", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Card, {
      props: {
        title: "Bare Remote",
        image: { src: "https://img.example.com/bare.avif" },
      },
    });

    expect(html).toContain('src="https://img.example.com/bare.avif"');
    expect(html).not.toContain("srcset=");
    expect(html).not.toContain("sizes=");
    expect(html).not.toContain("width=");
    expect(html).not.toContain("height=");
  });
});
