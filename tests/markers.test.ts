import { describe, expect, it } from "vitest";

import { applySections, findRegions, MarkerError, replaceRegion } from "../src/markers.js";

const TEMPLATE = [
  "# Title",
  "",
  "<!-- gen:one:start -->",
  "stale content",
  "<!-- gen:one:end -->",
  "",
  "prose the generator must not touch",
  "",
  "<!-- gen:two:start -->",
  "<!-- gen:two:end -->",
].join("\n");

describe("findRegions", () => {
  it("lists regions in document order", () => {
    expect(findRegions(TEMPLATE)).toEqual(["one", "two"]);
  });

  it("rejects a duplicated region", () => {
    const doc = `${TEMPLATE}\n<!-- gen:one:start -->\n<!-- gen:one:end -->`;
    expect(() => findRegions(doc)).toThrow(MarkerError);
  });
});

describe("replaceRegion", () => {
  it("replaces only the content between the markers", () => {
    const result = replaceRegion(TEMPLATE, "one", "fresh content");

    expect(result).toContain("fresh content");
    expect(result).not.toContain("stale content");
    expect(result).toContain("prose the generator must not touch");
  });

  it("is idempotent", () => {
    const once = replaceRegion(TEMPLATE, "one", "fresh");
    expect(replaceRegion(once, "one", "fresh")).toBe(once);
  });

  it("throws when the start marker is absent", () => {
    expect(() => replaceRegion(TEMPLATE, "missing", "x")).toThrow(/Missing start marker/);
  });

  it("throws when the end marker is absent", () => {
    const broken = TEMPLATE.replace("<!-- gen:two:end -->", "");
    expect(() => replaceRegion(broken, "two", "x")).toThrow(/Missing end marker/);
  });
});

describe("applySections", () => {
  it("fills every region", () => {
    const result = applySections(TEMPLATE, { one: "A", two: "B" });
    expect(result).toContain("A");
    expect(result).toContain("B");
  });

  // Both directions are bugs that would otherwise ship a half-empty README silently.
  it("throws when a region has no generated content", () => {
    expect(() => applySections(TEMPLATE, { one: "A" })).toThrow(/no generated content: two/);
  });

  it("throws when generated content has no region", () => {
    expect(() => applySections(TEMPLATE, { one: "A", two: "B", three: "C" })).toThrow(
      /no template region: three/,
    );
  });
});
