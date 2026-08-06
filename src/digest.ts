import type { ContributionStats } from "./data/contributions.js";
import type { Project } from "./data/projects.js";

const DAY_MS = 86_400_000;
const RECENT_DAYS = 30;

/**
 * The "currently building" blurb.
 *
 * Fully deterministic: it reads the same GitHub data the cards do and states what the
 * activity actually shows. No model, no API key, no per-run cost — and no chance of the
 * README asserting something that isn't in the data.
 */
export function renderDigest(projects: Project[], stats: ContributionStats, now: Date): string {
  const cutoff = now.getTime() - RECENT_DAYS * DAY_MS;
  const recent = projects.filter((project) => Date.parse(project.pushedAt) >= cutoff);

  const lines: string[] = [];

  if (recent.length > 0) {
    for (const project of recent.slice(0, 3)) {
      const language = project.language ? ` \`${project.language}\`` : "";
      const release = project.release ? ` · latest \`${project.release.tag}\`` : "";
      const summary = project.description || "no description yet";
      lines.push(`- **[${project.name}](${project.url})**${language} — ${summary}${release}`);
    }
  } else {
    lines.push("- Between pushes — the code is in the repositories below.");
  }

  const totals = [
    count(stats.commits, "commit"),
    count(stats.pullRequests, "pull request"),
    count(stats.reviews, "review"),
    count(stats.issues, "issue"),
    `${count(stats.reposCreated, "repository", "repositories")} created`,
  ];

  // Private work is only worth a mention when there is some; a "0 private" reads as an
  // apology rather than a fact.
  if (stats.privateTotal > 0) {
    totals.push(`${stats.privateTotal} private`);
  }

  lines.push("");
  lines.push(`<sub>${totals.join(" · ")}, last 12 months.</sub>`);

  return lines.join("\n");
}

/** `1 review` / `2 reviews` — a stray "1 reviews" undercuts everything else on the page. */
export function count(value: number, singular: string, plural = `${singular}s`): string {
  return `${value} ${value === 1 ? singular : plural}`;
}

/** ISO date (UTC, day precision) — used in the build-info footer. */
export function isoDay(date: Date): string {
  return date.toISOString().slice(0, 10);
}
