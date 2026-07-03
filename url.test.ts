import { describe, expect, test } from "vitest";
import { withBase } from "./url.js";

describe("withBase", () => {
  test("prefixes internal absolute paths", () => {
    expect(withBase("/labs/", "/courses/comp4020")).toBe("/courses/comp4020/labs/");
  });

  test("handles base with trailing slash", () => {
    expect(withBase("/labs/", "/courses/comp4020/")).toBe("/courses/comp4020/labs/");
  });

  test("returns path unchanged when base is /", () => {
    expect(withBase("/labs/", "/")).toBe("/labs/");
  });

  test("returns path unchanged when base is empty", () => {
    expect(withBase("/labs/", "")).toBe("/labs/");
  });

  test("passes through external URLs", () => {
    expect(withBase("https://example.com", "/base")).toBe("https://example.com");
  });

  test("passes through protocol-relative URLs", () => {
    expect(withBase("//example.com/path", "/base")).toBe("//example.com/path");
  });

  test("passes through mailto links", () => {
    expect(withBase("mailto:test@example.com", "/base")).toBe("mailto:test@example.com");
  });

  test("passes through hash links", () => {
    expect(withBase("#section", "/base")).toBe("#section");
  });

  test("passes through empty string", () => {
    expect(withBase("", "/base")).toBe("");
  });

  test("avoids double-prefixing when href already includes base", () => {
    expect(withBase("/courses/comp4020/labs/", "/courses/comp4020")).toBe(
      "/courses/comp4020/labs/",
    );
  });

  test("avoids double-prefixing when href equals base", () => {
    expect(withBase("/courses/comp4020", "/courses/comp4020")).toBe("/courses/comp4020");
  });

  test("handles root path with base", () => {
    expect(withBase("/", "/courses/comp4020")).toBe("/courses/comp4020/");
  });

  test("handles single-segment base", () => {
    expect(withBase("/about/", "/docs")).toBe("/docs/about/");
  });
});
