import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import OpenGraph from "./OpenGraph.astro";

const remoteCard = { src: "https://cdn.example.org/og/card.jpg", width: 1200, height: 630 };

const render = (props: Record<string, unknown>) =>
  AstroContainer.create().then((c) => c.renderToString(OpenGraph, { props }));

describe("OpenGraph", () => {
  test("emits the core tags from title and description", async () => {
    const html = await render({ title: "Research", description: "What we do", name: "Uni" });

    expect(html).toContain('<meta property="og:title" content="Research">');
    expect(html).toContain('<meta property="og:description" content="What we do">');
    expect(html).toContain('<meta property="og:site_name" content="Uni">');
    expect(html).toContain('<meta property="og:type" content="website">');
  });

  test("omits og:description when there is none", async () => {
    expect(await render({ title: "Research" })).not.toContain("og:description");
  });

  test("takes og:type from the type prop", async () => {
    const html = await render({ title: "A post", type: "article" });
    expect(html).toContain('<meta property="og:type" content="article">');
  });

  test("emits a remote card with its declared dimensions", async () => {
    const html = await render({ title: "Research", image: remoteCard, imageAlt: "A card" });

    expect(html).toContain(`<meta property="og:image" content="${remoteCard.src}">`);
    expect(html).toContain('<meta property="og:image:width" content="1200">');
    expect(html).toContain('<meta property="og:image:height" content="630">');
    expect(html).toContain('<meta property="og:image:alt" content="A card">');
  });

  test("asks for a large twitter card only when there is an image", async () => {
    expect(await render({ title: "Research", image: remoteCard })).toContain(
      '<meta name="twitter:card" content="summary_large_image">',
    );
    expect(await render({ title: "Research" })).toContain(
      '<meta name="twitter:card" content="summary">',
    );
  });

  test("emits no image tags when no card is set", async () => {
    const html = await render({ title: "Research" });
    expect(html).not.toContain("og:image");
  });

  // Without a `site` in the Astro config there is no origin to build an
  // absolute URL from, and Astro.url is the dev server's localhost — which is
  // worse baked into a canonical than left out.
  test("omits canonical and og:url when the site declares no origin", async () => {
    const html = await render({ title: "Research" });
    expect(html).not.toContain('rel="canonical"');
    expect(html).not.toContain("og:url");
  });

  test("leaves a card URL relative when there is no origin to absolutise it", async () => {
    const html = await render({ title: "Research", image: { src: "/og/card.jpg" } });
    expect(html).toContain('<meta property="og:image" content="/og/card.jpg">');
  });
});
