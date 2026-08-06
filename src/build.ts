import { renderCard } from "./assets.js";
import { LOGIN, REPO, SITE } from "./config.js";
import { summariseContributions } from "./data/contributions.js";
import { aggregateLanguages } from "./data/languages.js";
import { selectProjects, type Project } from "./data/projects.js";
import { count, isoDay, renderDigest } from "./digest.js";
import { fetchProfile, fetchTrafficViews, usage } from "./github/client.js";
import { applySections } from "./markers.js";
import { renderActivity } from "./render/activity.svg.js";
import { renderHeatmap } from "./render/heatmap.svg.js";
import { renderLanguages } from "./render/languages.svg.js";
import { renderStack } from "./render/stack.svg.js";
import { renderStats, type Kpi } from "./render/stats.svg.js";
import { renderTerminal } from "./render/terminal.svg.js";

export interface BuildResult {
  /** Every file the build produces, keyed by repo-relative POSIX path. */
  files: Map<string, string>;
  /** Numbers for the workflow step summary. */
  stats: {
    apiRequests: number;
    graphqlCost: number;
    graphqlRemaining: number;
    contributions: number;
    projects: number;
    durationMs: number;
  };
}

const WORKFLOWS = [
  ["readme.yml", "build"],
  ["ci.yml", "ci"],
  ["security.yml", "security"],
  ["health.yml", "health"],
] as const;

/**
 * One full pass: fetch → transform → render → assemble.
 *
 * Returns the files rather than writing them so `--check` can compare against disk without
 * a separate code path that might drift from the real build.
 */
export async function build(template: string, now: Date): Promise<BuildResult> {
  const started = Date.now();

  const profile = await fetchProfile(now);
  const traffic = await fetchTrafficViews();

  const user = profile.user;
  const repos = user.repositories.nodes;

  const stats = summariseContributions(profile);
  const languages = aggregateLanguages(repos);
  const projects = selectProjects(repos, now);
  const totalStars = repos.reduce((sum, repo) => sum + repo.stargazerCount, 0);

  const kpis: Kpi[] = [
    { value: stats.total, label: "CONTRIBUTIONS" },
    { value: stats.commits, label: "COMMITS" },
    { value: stats.pullRequests, label: "PULL REQUESTS" },
    { value: user.repositories.totalCount, label: "PUBLIC REPOS" },
    { value: totalStars, label: "STARS EARNED" },
    { value: user.followers.totalCount, label: "FOLLOWERS" },
  ];

  const trafficMeta = traffic
    ? `${count(traffic.uniques, "unique visitor")} · last 14 days`
    : `${stats.dailyAverage}/day average · last 12 months`;

  const cards = [
    renderCard("terminal", `${LOGIN} — whoami`, (ctx) => renderTerminal(ctx)),
    renderCard("stats", "Profile snapshot", (ctx) => renderStats(ctx, kpis, trafficMeta)),
    renderCard("activity", "Contribution activity, last 12 months", (ctx) =>
      renderActivity(ctx, stats),
    ),
    renderCard("heatmap", "Commit calendar, last 12 months", (ctx) => renderHeatmap(ctx, stats)),
    renderCard("languages", "Language mix across owned repositories", (ctx) =>
      renderLanguages(ctx, languages),
    ),
    renderCard("stack", "Tools and technologies", (ctx) => renderStack(ctx)),
  ];

  const [terminal, snapshot, activity, heatmap, languageCard, stack] = cards;

  const files = new Map<string, string>();
  for (const card of cards) {
    for (const [file, content] of card.files) files.set(file, content);
  }

  const readme = applySections(template, {
    header: terminal!.markdown,
    snapshot: snapshot!.markdown,
    focus: renderDigest(projects, stats, now),
    activity: `${activity!.markdown}\n\n${heatmap!.markdown}`,
    stack: stack!.markdown,
    languages: languageCard!.markdown,
    projects: renderProjects(projects),
    buildinfo: renderBuildInfo(now),
  });

  files.set("README.md", `${readme.trimEnd()}\n`);

  return {
    files,
    stats: {
      apiRequests: usage.requests,
      graphqlCost: usage.graphqlCost,
      graphqlRemaining: usage.graphqlRemaining,
      contributions: stats.total,
      projects: projects.length,
      durationMs: Date.now() - started,
    },
  };
}

function renderProjects(projects: Project[]): string {
  if (projects.length === 0) return "_No public repositories to show yet._";

  const rows = projects.map((project) => {
    const description = project.description || "—";
    const language = project.language ?? "—";
    // An em dash rather than an empty cell: a blank between two pipes trips
    // markdownlint's table-column-style rule and reads as a rendering glitch.
    const topics =
      project.topics.length > 0 ? project.topics.map((topic) => `\`${topic}\``).join(" ") : "—";
    const stars = project.stars > 0 ? ` ⭐ ${project.stars}` : "";

    return `| **[${project.name}](${project.url})**${stars} | ${description} | ${language} | ${topics} |`;
  });

  return [
    "| Project | What it is | Language | Topics |",
    "| :-- | :-- | :-- | :-- |",
    ...rows,
  ].join("\n");
}

/**
 * The footer that makes the machinery visible.
 *
 * The point of this block is that the README stops claiming to be automated and starts
 * showing it: live workflow status, the timestamp of the run that produced this file, and
 * a link straight to the code that generated everything above.
 */
function renderBuildInfo(now: Date): string {
  const badges = WORKFLOWS.map(
    ([file, label]) =>
      `[![${label}](https://github.com/${LOGIN}/${REPO}/actions/workflows/${file}/badge.svg)]` +
      `(https://github.com/${LOGIN}/${REPO}/actions/workflows/${file})`,
  ).join(" ");

  return [
    "<div align=\"center\">",
    "",
    badges,
    "",
    `<sub>This page is a build artefact. Every card above is an SVG generated from the GitHub API by ` +
      `<a href="https://github.com/${LOGIN}/${REPO}/tree/main/src">this repository's own generator</a> ` +
      `and committed by <a href="https://github.com/${LOGIN}/${REPO}/blob/main/.github/workflows/readme.yml">a scheduled workflow</a> — ` +
      `no third-party widget services. Last generated ${isoDay(now)}. ` +
      `More at <a href="${SITE}">gerardloriz.com</a>.</sub>`,
    "",
    "</div>",
  ].join("\n");
}
