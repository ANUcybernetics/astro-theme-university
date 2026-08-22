import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import Nav from "./Nav.astro";

async function createContainer() {
  return AstroContainer.create();
}

describe("Nav", () => {
  test("renders a text wordmark when no logo prop is passed", async () => {
    const container = await createContainer();
    const html = await container.renderToString(Nav, {
      props: { name: "Test" },
    });
    expect(html).toMatch(/<span class="at-nav-wordmark">Test<\/span>/);
    expect(html).not.toContain("at-nav-logo");
  });

  test("uses custom logo / logoDark when provided", async () => {
    const container = await createContainer();
    const html = await container.renderToString(Nav, {
      props: {
        name: "Test",
        logo: { src: "/light.svg", width: 100, height: 30, format: "svg" } as ImageMetadata,
        logoDark: { src: "/dark.svg", width: 100, height: 30, format: "svg" } as ImageMetadata,
      },
    });
    expect(html).toContain('src="/light.svg"');
    expect(html).toContain('src="/dark.svg"');
    expect(html).toContain("at-nav-logo--has-dark");
    expect(html).not.toContain("at-nav-wordmark");
  });

  test("renders a single logo without dark-variant classes when only logo is provided", async () => {
    const container = await createContainer();
    const html = await container.renderToString(Nav, {
      props: {
        name: "Test",
        logo: { src: "/light.svg", width: 100, height: 30, format: "svg" } as ImageMetadata,
      },
    });
    expect(html).toContain('src="/light.svg"');
    expect(html).not.toContain("at-nav-logo--has-dark");
    expect(html).not.toContain("at-nav-logo--dark");
  });
});
