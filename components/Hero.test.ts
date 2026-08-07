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

  test("renders a remote image as a plain img with eager priority attrs", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: {
        title: "Remote Hero",
        image: {
          src: "https://img.example.com/heroes/entry-2560.avif",
          width: 2752,
          height: 1536,
          srcset:
            "https://img.example.com/heroes/entry-800.avif 800w, " +
            "https://img.example.com/heroes/entry-1600.avif 1600w, " +
            "https://img.example.com/heroes/entry-2560.avif 2560w",
        },
        imageAlt: "",
      },
    });

    expect(html).toContain('src="https://img.example.com/heroes/entry-2560.avif"');
    expect(html).toContain('srcset="https://img.example.com/heroes/entry-800.avif 800w');
    // srcset present, no per-image sizes → the component's default applies.
    expect(html).toContain('sizes="100vw"');
    expect(html).toContain('width="2752"');
    expect(html).toContain('height="1536"');
    expect(html).toContain('loading="eager"');
    expect(html).toContain('fetchpriority="high"');
    expect(html).toContain('class="at-hero-image"');
    expect(html).not.toContain("/_astro/");
  });

  test("minimal remote image emits no srcset, sizes, or dimension attrs", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: {
        title: "Bare Remote",
        image: { src: "https://img.example.com/bare.avif" },
        imageAlt: "",
      },
    });

    expect(html).toContain('src="https://img.example.com/bare.avif"');
    expect(html).not.toContain("srcset=");
    expect(html).not.toContain("sizes=");
    // The hero's CSS pins layout, so no dimension attrs is fine.
    expect(html).not.toContain('width="');
    expect(html).not.toContain('height="');
  });

  test("imageSizes prop reaches the srcset sizes attribute", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(Hero, {
      props: {
        title: "Sized Hero",
        image: testImage,
        imageAlt: "",
        imageSizes: "(min-width: 90rem) 90rem, 100vw",
      },
    });

    expect(html).toContain('sizes="(min-width: 90rem) 90rem, 100vw"');
  });
});
