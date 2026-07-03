import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { execFileSync } from "node:child_process";
import { describe, test, expect, beforeAll } from "vitest";

const root = resolve(import.meta.dirname, "..");
const propsPath = resolve(root, "docs/src/data/props.json");

let data: Record<string, any>;

beforeAll(() => {
  execFileSync("node", ["--experimental-strip-types", "scripts/extract-props.ts"], {
    cwd: root,
  });
  data = JSON.parse(readFileSync(propsPath, "utf-8"));
});

describe("extract-props", () => {
  test("extracts all expected components", () => {
    const keys = Object.keys(data);
    expect(keys).toContain("components/Card");
    expect(keys).toContain("components/Callout");
    expect(keys).toContain("components/CardGrid");
    expect(keys).toContain("components/Footer");
    expect(keys).toContain("components/Hero");
    expect(keys).toContain("components/Nav");
    expect(keys).toContain("components/Pagination");
    expect(keys).toContain("components/Sidebar");
    expect(keys).toContain("components/YouTubeEmbed");
    expect(keys).toContain("components/Countdown");
    expect(keys).toContain("components/P5Sketch");
    expect(keys).toContain("components/FillInTheBlank");
    expect(keys).toContain("components/FilterableCardGrid");
    expect(keys).toContain("layouts/BaseLayout");
    expect(keys).toContain("layouts/ContentLayout");
    expect(keys).toContain("layouts/SidebarLayout");
    expect(keys).toContain("ThemeOptions");
  });

  test("extracts prop names and types from astro components", () => {
    const card = data["components/Card"];
    const names = card.props.map((p: any) => p.name);
    expect(names).toEqual(["title", "href", "image", "imageAlt", "headingLevel"]);
    expect(card.props[0]).toMatchObject({
      name: "title",
      type: "string",
      required: true,
    });
  });

  test("extracts JSDoc descriptions", () => {
    const card = data["components/Card"];
    expect(card.props[0].description).toBe("The card heading text.");
    expect(card.props[1].description).toContain(
      "URL to link to. When provided, the card renders as an anchor element.",
    );
  });

  test("extracts defaults from astro destructuring", () => {
    const callout = data["components/Callout"];
    expect(callout.props[0]).toMatchObject({
      name: "type",
      default: '"info"',
    });

    const cardGrid = data["components/CardGrid"];
    expect(cardGrid.props[0]).toMatchObject({
      name: "columns",
      default: "3",
    });
  });

  test("extracts supporting types", () => {
    const footer = data["components/Footer"];
    expect(footer.supportingTypes).toBeDefined();
    expect(footer.supportingTypes.ContactInfo).toBeDefined();
    expect(footer.supportingTypes.SocialLink).toBeDefined();

    const contactNames = footer.supportingTypes.ContactInfo.map((p: any) => p.name);
    expect(contactNames).toEqual(["description", "address", "email", "phone"]);
  });

  test("extracts props from svelte components", () => {
    const countdown = data["components/Countdown"];
    expect(countdown.props).toHaveLength(2);
    expect(countdown.props[0]).toMatchObject({
      name: "deadline",
      type: "string",
      required: true,
      description: "An ISO 8601 datetime string for the deadline.",
    });
    expect(countdown.props[1]).toMatchObject({
      name: "label",
      default: '"Due"',
    });
  });

  test("extracts svelte component with function type", () => {
    const p5 = data["components/P5Sketch"];
    expect(p5.props[0]).toMatchObject({
      name: "sketch",
      type: "(p: p5) => void",
      required: true,
    });
  });

  test("extracts ThemeOptions from index.ts", () => {
    const opts = data["ThemeOptions"];
    const names = opts.props.map((p: any) => p.name);
    expect(names).toEqual([
      "name",
      "defaultLayout",
      "search",
      "checkLinks",
      "checkA11y",
      "checkDecks",
      "llmsTxt",
      "svelte",
      "mdx",
      "icon",
      "fonts",
      "brandCss",
      "extraRemarkPluginsBefore",
      "extraRemarkPlugins",
      "extraRehypePlugins",
    ]);
    expect(opts.props[0].description).toBe("Site name displayed in the header and meta tags");
  });

  test("required flag is correct", () => {
    const hero = data["components/Hero"];
    const titleProp = hero.props.find((p: any) => p.name === "title");
    const imageAltProp = hero.props.find((p: any) => p.name === "imageAlt");
    expect(titleProp.required).toBe(true);
    expect(imageAltProp.required).toBe(true);
  });
});
