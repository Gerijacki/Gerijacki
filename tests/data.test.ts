import { describe, expect, it } from "vitest";

import { aggregateLanguages } from "../src/data/languages.js";
import { scoreRepo, selectProjects } from "../src/data/projects.js";
import { makeRepo, NOW } from "./fixtures.js";

describe("aggregateLanguages", () => {
  it("sums bytes across repos and reports percentages", () => {
    const result = aggregateLanguages([
      makeRepo({
        name: "a",
        languages: { edges: [{ size: 750, node: { name: "Go", color: "#00ADD8" } }] },
      }),
      makeRepo({
        name: "b",
        languages: { edges: [{ size: 250, node: { name: "Python", color: "#3776AB" } }] },
      }),
    ]);

    expect(result.map((l) => [l.name, l.percent])).toEqual([
      ["Go", 75],
      ["Python", 25],
    ]);
  });

  // HTML and CSS from any web project would otherwise dominate the bar and say
  // nothing about what he builds.
  it("drops markup and config languages", () => {
    const result = aggregateLanguages([
      makeRepo({
        name: "site",
        languages: {
          edges: [
            { size: 900, node: { name: "HTML", color: "#e34c26" } },
            { size: 100, node: { name: "Go", color: "#00ADD8" } },
          ],
        },
      }),
    ]);

    expect(result.map((l) => l.name)).toEqual(["Go"]);
    expect(result[0]!.percent).toBe(100);
  });

  it("collapses the tail into Other", () => {
    const edges = Array.from({ length: 12 }, (_, index) => ({
      size: 100 - index,
      node: { name: `Lang${index}`, color: null },
    }));

    const result = aggregateLanguages([makeRepo({ name: "many", languages: { edges } })]);

    expect(result).toHaveLength(9); // LANGUAGE_COUNT (8) + Other
    expect(result.at(-1)!.name).toBe("Other");
  });

  // An unstable sort would produce a different SVG every run and trigger an
  // empty commit every few hours.
  it("orders ties deterministically", () => {
    const edges = [
      { size: 100, node: { name: "Zig", color: null } },
      { size: 100, node: { name: "Ada", color: null } },
    ];

    const first = aggregateLanguages([makeRepo({ name: "x", languages: { edges } })]);
    const second = aggregateLanguages([
      makeRepo({ name: "x", languages: { edges: [...edges].reverse() } }),
    ]);

    expect(first.map((l) => l.name)).toEqual(["Ada", "Zig"]);
    expect(second.map((l) => l.name)).toEqual(first.map((l) => l.name));
  });

  it("returns nothing when there is no countable code", () => {
    expect(aggregateLanguages([])).toEqual([]);
  });
});

describe("scoreRepo", () => {
  it("ranks a recent push above an old one", () => {
    const fresh = makeRepo({ name: "fresh", pushedAt: "2026-08-01T00:00:00Z" });
    const stale = makeRepo({ name: "stale", pushedAt: "2024-01-01T00:00:00Z" });

    expect(scoreRepo(fresh, NOW)).toBeGreaterThan(scoreRepo(stale, NOW));
  });

  it("penalises archived repos", () => {
    const active = makeRepo({ name: "active" });
    const archived = makeRepo({ name: "archived", isArchived: true });

    expect(scoreRepo(archived, NOW)).toBeLessThan(scoreRepo(active, NOW));
  });
});

describe("selectProjects", () => {
  const repos = [
    makeRepo({ name: "soc" }),
    makeRepo({ name: "BreachMap", stargazerCount: 1 }),
    makeRepo({ name: "credweaver" }),
    makeRepo({ name: "Orgit" }),
    makeRepo({ name: "rans" }),
    makeRepo({ name: "noise", pushedAt: "2023-01-01T00:00:00Z" }),
    makeRepo({ name: "Gerijacki" }),
  ];

  it("puts featured repos first, in configured order", () => {
    const picked = selectProjects(repos, NOW).map((p) => p.name);
    expect(picked.slice(0, 5)).toEqual(["soc", "BreachMap", "credweaver", "Orgit", "rans"]);
  });

  it("excludes the profile repo itself", () => {
    expect(selectProjects(repos, NOW).map((p) => p.name)).not.toContain("Gerijacki");
  });

  it("caps the list at PROJECT_COUNT", () => {
    expect(selectProjects(repos, NOW)).toHaveLength(6);
  });

  it("ignores a featured name that no longer exists", () => {
    const picked = selectProjects([makeRepo({ name: "rans" })], NOW);
    expect(picked.map((p) => p.name)).toEqual(["rans"]);
  });
});
