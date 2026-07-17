import { describe, expect, test } from "vitest";
import { matchCardItems, type CardItem } from "./match-card-items.js";

const items: CardItem[] = [
  {
    title: "Agent loops",
    href: "/topics/agent-loops/",
    description: "The read-edit-run cycle",
    tags: ["concept"],
  },
  {
    title: "Tool use",
    href: "/topics/tool-use/",
    description: "How agents call tools",
    tags: ["concept", "practice"],
  },
  {
    title: "Submitting work",
    href: "/topics/submitting-work/",
    description: "How to submit assessments",
    tags: ["practice"],
  },
  {
    title: "Academic integrity",
    href: "/topics/academic-integrity/",
    tags: ["admin"],
  },
  {
    title: "Prompt engineering",
    href: "/topics/prompt-engineering/",
    description: "Writing effective prompts",
    badges: ["Week 2", "Week 5"],
  },
];

describe("matchCardItems", () => {
  test("returns all items for empty query", () => {
    expect(matchCardItems(items, "")).toEqual(items);
  });

  test("returns all items for whitespace-only query", () => {
    expect(matchCardItems(items, "   ")).toEqual(items);
  });

  test("matches title case-insensitively", () => {
    const result = matchCardItems(items, "LOOPS");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Agent loops");
  });

  test("matches description text", () => {
    const result = matchCardItems(items, "cycle");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Agent loops");
  });

  test("matches tag values", () => {
    const result = matchCardItems(items, "admin");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Academic integrity");
  });

  test("matches badge values", () => {
    const result = matchCardItems(items, "week 5");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Prompt engineering");
  });

  test("treats null badges the same as undefined", () => {
    const nullable: CardItem[] = [{ title: "Nully", href: "/nully/", badges: null }];
    expect(matchCardItems(nullable, "nully")).toHaveLength(1);
    expect(matchCardItems(nullable, "week")).toHaveLength(0);
  });

  test("matches partial words within title", () => {
    const result = matchCardItems(items, "submit");
    expect(result.map((i) => i.title)).toContain("Submitting work");
  });

  test("requires every whitespace-separated token to match (AND)", () => {
    const result = matchCardItems(items, "tool concept");
    expect(result).toHaveLength(1);
    expect(result[0].title).toBe("Tool use");
  });

  test("returns empty array when no item matches all tokens", () => {
    expect(matchCardItems(items, "xyzzy")).toEqual([]);
  });

  test("returns empty array when only some tokens match", () => {
    expect(matchCardItems(items, "tool xyzzy")).toEqual([]);
  });

  test("preserves the input order in the filtered output", () => {
    const result = matchCardItems(items, "concept");
    expect(result.map((i) => i.title)).toEqual(["Agent loops", "Tool use"]);
  });

  test("does not mutate the input array", () => {
    const snapshot = JSON.stringify(items);
    matchCardItems(items, "agent");
    expect(JSON.stringify(items)).toBe(snapshot);
  });

  test("handles items with no description or tags", () => {
    const sparse: CardItem[] = [{ title: "Lonely", href: "/lonely/" }];
    expect(matchCardItems(sparse, "lonely")).toHaveLength(1);
    expect(matchCardItems(sparse, "missing")).toHaveLength(0);
  });

  test("treats null description and null tags the same as undefined", () => {
    const nullable: CardItem[] = [
      { title: "Nully", href: "/nully/", description: null, tags: null },
    ];
    expect(matchCardItems(nullable, "nully")).toHaveLength(1);
    expect(matchCardItems(nullable, "missing")).toHaveLength(0);
  });

  test("ignores surrounding whitespace in the query", () => {
    expect(matchCardItems(items, "  loops  ")).toHaveLength(1);
  });

  test("collapses runs of internal whitespace into token boundaries", () => {
    expect(matchCardItems(items, "tool   concept")).toHaveLength(1);
  });
});
