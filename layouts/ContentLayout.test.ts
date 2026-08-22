import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import ContentLayout from "./ContentLayout.astro";

async function createContainer() {
  return AstroContainer.create();
}

describe("ContentLayout", () => {
  test("renders a hero from a RemoteImage heroImage", async () => {
    const container = await createContainer();
    const html = await container.renderToString(ContentLayout, {
      props: {
        title: "Remote",
        heroImage: {
          src: "https://img.example.com/heroes/entry-1600.avif",
          width: 2048,
          height: 1144,
          srcset:
            "https://img.example.com/heroes/entry-800.avif 800w, " +
            "https://img.example.com/heroes/entry-1600.avif 1600w",
        },
        heroImageAlt: "",
      },
    });
    expect(html).toContain('src="https://img.example.com/heroes/entry-1600.avif"');
    expect(html).toContain('srcset="https://img.example.com/heroes/entry-800.avif 800w');
    expect(html).toContain('class="at-hero-image"');
  });

  test("an http(s) heroImage string renders a hero, not the NaN-sized regression", async () => {
    // Before resolveHeroImage, a string reached Hero's metadata math directly:
    // widths filtered against undefined gave an empty srcset and a NaN width.
    const container = await createContainer();
    const html = await container.renderToString(ContentLayout, {
      props: {
        title: "Remote",
        heroImage: "https://img.example.com/heroes/page.avif",
        heroImageAlt: "",
      },
    });
    expect(html).toContain('src="https://img.example.com/heroes/page.avif"');
    expect(html).not.toContain("NaN");
  });

  test("falls back to a plain heading when heroImage is absent", async () => {
    const container = await createContainer();
    const html = await container.renderToString(ContentLayout, {
      props: { title: "Plain" },
    });
    expect(html).not.toContain("at-hero-image");
    expect(html).toMatch(/<h1[^>]*>Plain<\/h1>/);
  });
});
