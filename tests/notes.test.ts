import { describe, expect, it } from "vitest";

import type { ActivityQueryResult } from "../src/github/types.js";
import { renderNotes } from "../src/release/notes.js";

const FROM = new Date("2026-08-03T12:00:00Z");
const TO = new Date("2026-08-06T12:00:00Z");

function activity(
  overrides: Partial<ActivityQueryResult["user"]["contributionsCollection"]> = {},
): ActivityQueryResult {
  return {
    rateLimit: { cost: 1, remaining: 4999, limit: 5000, resetAt: TO.toISOString() },
    user: {
      contributionsCollection: {
        totalCommitContributions: 0,
        totalPullRequestContributions: 0,
        totalIssueContributions: 0,
        totalPullRequestReviewContributions: 0,
        commitContributionsByRepository: [],
        pullRequestContributions: { nodes: [] },
        issueContributions: { nodes: [] },
        ...overrides,
      },
    },
  };
}

function repo(name: string, commits: number, description: string | null = "A thing") {
  return {
    repository: {
      nameWithOwner: `Gerijacki/${name}`,
      url: `https://github.com/Gerijacki/${name}`,
      description,
      primaryLanguage: { name: "Go" },
    },
    contributions: { totalCount: commits },
  };
}

const BASE = { from: FROM, to: TO, tag: "v2026.08.06", assets: ["README.md"] };

describe("renderNotes", () => {
  it("states the tag and the window", () => {
    const notes = renderNotes({ ...BASE, activity: activity() });
    expect(notes).toContain("**v2026.08.06**");
    expect(notes).toContain("2026-08-03 to 2026-08-06");
  });

  it("ranks repositories by commit count", () => {
    const notes = renderNotes({
      ...BASE,
      activity: activity({
        commitContributionsByRepository: [repo("quiet", 2), repo("busy", 14)],
      }),
    });

    expect(notes.indexOf("Gerijacki/busy")).toBeLessThan(notes.indexOf("Gerijacki/quiet"));
    expect(notes).toContain("14 commits");
    expect(notes).toContain("2 commits");
  });

  it("distinguishes merged from opened pull requests", () => {
    const notes = renderNotes({
      ...BASE,
      activity: activity({
        pullRequestContributions: {
          nodes: [
            {
              pullRequest: {
                title: "Ship it",
                url: "https://example.invalid/1",
                number: 1,
                merged: true,
                repository: { nameWithOwner: "Gerijacki/rans" },
              },
            },
          ],
        },
      }),
    });

    expect(notes).toContain("Gerijacki/rans#1");
    expect(notes).toContain("merged");
  });

  // A quiet window is a real outcome, not an error — the notes have to say so plainly
  // rather than render three empty headings.
  it("says so when nothing landed", () => {
    const notes = renderNotes({ ...BASE, activity: activity() });
    expect(notes).toContain("No public contributions landed");
    expect(notes).not.toContain("### Worked on");
    expect(notes).not.toContain("### Pull requests");
  });

  // Without this caveat a day spent on a feature branch reads as a day of doing nothing.
  it("explains the default-branch rule", () => {
    const notes = renderNotes({ ...BASE, activity: activity() });
    expect(notes).toContain("default branch");
  });

  it("lists the shipped assets", () => {
    const notes = renderNotes({
      ...BASE,
      assets: ["README.md", "assets/terminal-dark.svg"],
      activity: activity(),
    });
    expect(notes).toContain("`assets/terminal-dark.svg`");
  });

  it("survives a repository with no description or language", () => {
    const entry = repo("bare", 3, null);
    entry.repository.primaryLanguage = null as never;

    const notes = renderNotes({
      ...BASE,
      activity: activity({ commitContributionsByRepository: [entry] }),
    });

    expect(notes).toContain("Gerijacki/bare");
    expect(notes).not.toContain("undefined");
    expect(notes).not.toContain("null");
  });

  it("agrees in number for a single commit", () => {
    const notes = renderNotes({
      ...BASE,
      activity: activity({ commitContributionsByRepository: [repo("one", 1)] }),
    });
    expect(notes).toContain("1 commit ");
  });
});
