import type { ContributionDay, RepoNode } from "../src/github/types.js";

/**
 * A deterministic year of contributions.
 *
 * Snapshot tests need byte-stable input, so the counts come from a tiny LCG rather than
 * `Math.random()` — same sequence on every machine and every run.
 */
export function makeCalendar(days: number, from = "2025-08-04"): ContributionDay[] {
  const start = new Date(`${from}T00:00:00Z`);
  const out: ContributionDay[] = [];
  let seed = 42;

  for (let index = 0; index < days; index++) {
    seed = (seed * 1103515245 + 12345) % 2147483648;
    const date = new Date(start.getTime() + index * 86_400_000);

    out.push({
      date: date.toISOString().slice(0, 10),
      // Roughly a third of days empty, the rest 1..12 — a plausible-looking year.
      contributionCount: seed % 3 === 0 ? 0 : (seed % 12) + 1,
      weekday: date.getUTCDay(),
    });
  }

  return out;
}

export function makeRepo(overrides: Partial<RepoNode> & { name: string }): RepoNode {
  return {
    description: `Description for ${overrides.name}`,
    url: `https://github.com/Gerijacki/${overrides.name}`,
    isArchived: false,
    stargazerCount: 0,
    forkCount: 0,
    pushedAt: "2026-07-01T00:00:00Z",
    createdAt: "2025-01-01T00:00:00Z",
    primaryLanguage: { name: "TypeScript", color: "#3178C6" },
    repositoryTopics: { nodes: [] },
    languages: { edges: [{ size: 1000, node: { name: "TypeScript", color: "#3178C6" } }] },
    latestRelease: null,
    ...overrides,
  };
}

export const NOW = new Date("2026-08-04T12:00:00Z");
