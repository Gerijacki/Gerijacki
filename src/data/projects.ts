import { EXCLUDED_REPOS, FEATURED_REPOS, PROJECT_COUNT } from "../config.js";
import type { RepoNode } from "../github/types.js";

export interface Project {
  name: string;
  description: string;
  url: string;
  language: string | null;
  languageColor: string | null;
  stars: number;
  topics: string[];
  pushedAt: string;
  release: { tag: string; url: string } | null;
}

const DAY_MS = 86_400_000;

/**
 * Ranks a repo for the "selected work" table.
 *
 * Stars alone would freeze the list — this account has almost none, so a pure star sort is
 * effectively random. Recency dominates instead, with stars and a real description as
 * tie-breakers, so the section tracks what you are actually working on.
 */
export function scoreRepo(repo: RepoNode, now: Date): number {
  const ageDays = (now.getTime() - Date.parse(repo.pushedAt)) / DAY_MS;

  // Halves every ~120 days: last month's work clearly outranks last year's.
  const recency = 100 * Math.pow(0.5, ageDays / 120);
  const popularity = repo.stargazerCount * 15;
  const documented = repo.description && repo.description.trim().length > 20 ? 20 : 0;
  const described = repo.repositoryTopics.nodes.length > 0 ? 10 : 0;
  const archived = repo.isArchived ? -40 : 0;

  return recency + popularity + documented + described + archived;
}

export function selectProjects(repos: RepoNode[], now: Date): Project[] {
  const eligible = repos.filter((repo) => !EXCLUDED_REPOS.has(repo.name));
  const byName = new Map(eligible.map((repo) => [repo.name, repo]));

  const featured = FEATURED_REPOS.map((name) => byName.get(name)).filter(
    (repo): repo is RepoNode => repo !== undefined,
  );

  const featuredNames = new Set(featured.map((repo) => repo.name));
  const rest = eligible
    .filter((repo) => !featuredNames.has(repo.name))
    .sort((a, b) => scoreRepo(b, now) - scoreRepo(a, now) || a.name.localeCompare(b.name));

  return [...featured, ...rest].slice(0, PROJECT_COUNT).map(toProject);
}

function toProject(repo: RepoNode): Project {
  return {
    name: repo.name,
    description: repo.description?.trim() ?? "",
    url: repo.url,
    language: repo.primaryLanguage?.name ?? null,
    languageColor: repo.primaryLanguage?.color ?? null,
    stars: repo.stargazerCount,
    topics: repo.repositoryTopics.nodes.map((node) => node.topic.name).slice(0, 4),
    pushedAt: repo.pushedAt,
    release: repo.latestRelease ? { tag: repo.latestRelease.tagName, url: repo.latestRelease.url } : null,
  };
}
