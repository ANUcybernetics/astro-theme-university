import { describe, expect, test } from "vitest";
import universityTheme from "./index.js";

describe("universityTheme integration", () => {
  test("astro:config:setup registers astro-icon and mdx", async () => {
    const integration = universityTheme();

    const addedIntegrations: string[] = [];
    const fakeUpdateConfig = (cfg: { integrations?: { name: string }[] }) => {
      for (const i of cfg.integrations ?? []) addedIntegrations.push(i.name);
    };

    const setup = integration.hooks["astro:config:setup"];
    if (!setup) throw new Error("astro:config:setup hook missing");

    await setup({
      updateConfig: fakeUpdateConfig,
      config: {
        integrations: [],
        srcDir: new URL("file:///tmp/src/"),
        site: "https://example.com",
        fonts: [],
      },
      injectRoute: () => {},
      logger: { info: () => {}, warn: () => {}, error: () => {} },
    } as never);

    expect(addedIntegrations).toContain("astro-icon");
    expect(addedIntegrations).toContain("@astrojs/mdx");
    expect(addedIntegrations).not.toContain("@astrojs/svelte");
  });
});
