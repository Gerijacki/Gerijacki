import { describe, expect, it } from "vitest";

import { renderDigest } from "../src/digest.js";
import type { ContributionStats } from "../src/data/contributions.js";
import type { Project } from "../src/data/projects.js";
import { NOW } from "./fixtures.js";

const STATS: ContributionStats = {
  days: [],
  total: 400,
  privateTotal: 0,
  commits: 165,
  pullRequests: 23,
  reviews: 1,
  issues: 4,
  reposCreated: 12,
  currentStreak: 3,
  longestStreak: 9,
  busiestDay: null,
  dailyAverage: 1.1,
};

function project(overrides: Partial<Project> & { name: string }): Project {
  return {
    description: "A thing",
    url: `https://github.com/Gerijacki/${overrides.name}`,
    language: "Go",
    languageColor: "#00ADD8",
    stars: 0,
    topics: [],
    pushedAt: "2026-08-01T00:00:00Z",
    release: null,
    ...overrides,
  };
}

describe("renderDigest", () => {
  it("lists repositories pushed in the last 30 days", () => {
    const output = renderDigest([project({ name: "rans" })], STATS, NOW);
    expect(output).toContain("[rans]");
  });

  it("ignores repositories outside the window", () => {
    const output = renderDigest(
      [project({ name: "old", pushedAt: "2025-01-01T00:00:00Z" })],
      STATS,
      NOW,
    );
    expect(output).not.toContain("[old]");
    expect(output).toContain("Between pushes");
  });

  it("shows at most three", () => {
    const projects = ["a", "b", "c", "d", "e"].map((name) => project({ name }));
    const listed = renderDigest(projects, STATS, NOW).match(/^- \*\*\[/gm) ?? [];
    expect(listed).toHaveLength(3);
  });

  it("mentions the latest release when there is one", () => {
    const output = renderDigest(
      [project({ name: "rans", release: { tag: "v1.2.0", url: "https://example.invalid" } })],
      STATS,
      NOW,
    );
    expect(output).toContain("latest `v1.2.0`");
  });

  it("agrees in number", () => {
    const output = renderDigest([], STATS, NOW);
    expect(output).toContain("1 review ");
    expect(output).toContain("165 commits");
    expect(output).toContain("12 repositories created");
  });

  it("handles a repo with no description", () => {
    const output = renderDigest([project({ name: "bare", description: "" })], STATS, NOW);
    expect(output).toContain("no description yet");
  });
});
