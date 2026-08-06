import { count } from "../digest.js";
import type { ActivityQueryResult } from "../github/types.js";
import { truncate } from "../render/svg.js";

/** How many repositories and items each section lists before it stops. */
const MAX_REPOS = 10;
const MAX_ITEMS = 8;

export interface NotesInput {
  activity: ActivityQueryResult;
  from: Date;
  to: Date;
  /** The tag these notes belong to, e.g. `v2026.08.07`. */
  tag: string;
  /** Files the release ships, for the manifest at the end. */
  assets: string[];
}

function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Release notes for one daily tag.
 *
 * Everything here comes from the contributions API for the window, so the notes describe
 * what actually happened rather than restating a template. A day with no activity produces
 * short notes, which is the honest outcome.
 */
export function renderNotes(input: NotesInput): string {
  const { activity, from, to, tag, assets } = input;
  const collection = activity.user.contributionsCollection;

  const sections: string[] = [
    `Profile snapshot for **${tag}**, covering ${isoDay(from)} to ${isoDay(to)}.`,
  ];

  const repos = [...collection.commitContributionsByRepository]
    .sort(
      (a, b) =>
        b.contributions.totalCount - a.contributions.totalCount ||
        a.repository.nameWithOwner.localeCompare(b.repository.nameWithOwner),
    )
    .slice(0, MAX_REPOS);

  if (repos.length > 0) {
    sections.push(
      "### Worked on",
      repos
        .map((entry) => {
          const { repository, contributions } = entry;
          const language = repository.primaryLanguage ? ` · ${repository.primaryLanguage.name}` : "";
          const description = repository.description
            ? ` — ${truncate(repository.description.trim(), 110)}`
            : "";
          return `- **[${repository.nameWithOwner}](${repository.url})** — ${count(
            contributions.totalCount,
            "commit",
          )}${language}${description}`;
        })
        .join("\n"),
    );
  }

  const pulls = collection.pullRequestContributions.nodes.slice(0, MAX_ITEMS);
  if (pulls.length > 0) {
    sections.push(
      "### Pull requests",
      pulls
        .map(({ pullRequest: pr }) => {
          const state = pr.merged ? "merged" : "opened";
          return `- [${pr.repository.nameWithOwner}#${pr.number}](${pr.url}) ${state} — ${truncate(
            pr.title,
            90,
          )}`;
        })
        .join("\n"),
    );
  }

  const issues = collection.issueContributions.nodes.slice(0, MAX_ITEMS);
  if (issues.length > 0) {
    sections.push(
      "### Issues",
      issues
        .map(
          ({ issue }) =>
            `- [${issue.repository.nameWithOwner}#${issue.number}](${issue.url}) — ${truncate(
              issue.title,
              90,
            )}`,
        )
        .join("\n"),
    );
  }

  if (repos.length === 0 && pulls.length === 0 && issues.length === 0) {
    sections.push(
      "No public contributions landed in this window. The cards below are still regenerated " +
        "from the trailing twelve months.",
    );
  }

  sections.push(
    "### This release ships",
    assets.map((asset) => `- \`${asset}\``).join("\n"),
    [
      `<sub>${count(collection.totalCommitContributions, "commit")} · `,
      `${count(collection.totalPullRequestContributions, "pull request")} · `,
      `${count(collection.totalPullRequestReviewContributions, "review")} · `,
      `${count(collection.totalIssueContributions, "issue")} in this window. `,
      "GitHub counts only commits on a repository's default branch, so work on a feature ",
      "branch appears here on the day it lands, not the day it was written.</sub>",
    ].join(""),
  );

  return sections.join("\n\n");
}
