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
        root: new URL("file:///tmp/"),
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

function run(options: Parameters<typeof universityTheme>[0], preRegistered: string[] = []) {
  const integration = universityTheme(options);
  const added: string[] = [];
  const warnings: string[] = [];
  let remarkPluginCount = 0;
  const setup = integration.hooks["astro:config:setup"];
  if (!setup) throw new Error("astro:config:setup hook missing");
  const done = setup({
    updateConfig: (cfg: {
      integrations?: { name: string }[];
      markdown?: { processor?: { remarkPlugins?: unknown[] } };
    }) => {
      for (const i of cfg.integrations ?? []) added.push(i.name);
    },
    config: {
      integrations: preRegistered.map((name) => ({ name })),
      root: new URL("file:///tmp/"),
      srcDir: new URL("file:///tmp/src/"),
      site: "https://example.com",
      base: "/",
      fonts: [],
    },
    injectRoute: () => {},
    injectScript: () => {},
    logger: { info: () => {}, warn: (m: string) => warnings.push(m), error: () => {} },
  } as never);
  return { added, warnings, remarkPluginCount, done };
}
describe("decks option", () => {
  test("decks: true registers astromotion", async () => {
    const { added, warnings, done } = run({ decks: true });
    await done;
    expect(added).toContain("astromotion");
    expect(warnings).toEqual([]);
  });

  test("decks is ignored with a warning when astromotion is already registered", async () => {
    const { added, warnings, done } = run({ decks: true }, ["astromotion"]);
    await done;
    expect(added).not.toContain("astromotion");
    expect(warnings.length).toBe(1);
  });

  test("astromotion is not registered by default", async () => {
    const { added, done } = run({});
    await done;
    expect(added).not.toContain("astromotion");
  });
});
