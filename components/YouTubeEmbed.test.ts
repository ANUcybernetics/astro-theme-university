import { experimental_AstroContainer as AstroContainer } from "astro/container";
import { describe, expect, test } from "vitest";
import YouTubeEmbed from "./YouTubeEmbed.astro";

describe("YouTubeEmbed", () => {
  test("renders a lite-youtube element with the video id", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(YouTubeEmbed, {
      props: { id: "dQw4w9WgXcQ" },
    });

    expect(html).toContain("lite-youtube");
    expect(html).toContain("dQw4w9WgXcQ");
  });

  test("passes a custom title when provided", async () => {
    const container = await AstroContainer.create();
    const html = await container.renderToString(YouTubeEmbed, {
      props: { id: "abc123", title: "My Talk" },
    });

    expect(html).toContain("My Talk");
  });
});
