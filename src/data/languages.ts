import { IGNORED_LANGUAGES, LANGUAGE_COUNT } from "../config.js";
import type { RepoNode } from "../github/types.js";

export interface LanguageShare {
  name: string;
  bytes: number;
  /** Percentage of the counted total, to one decimal. */
  percent: number;
  color: string;
}

/** GitHub omits a colour for a few languages; this keeps the bar from rendering gaps. */
const FALLBACK_COLOR = "#8B8B8B";

/**
 * Aggregate language mix across owned repositories.
 *
 * The GraphQL query already excludes forks — counting them would say more about what you
 * cloned than what you wrote. Archived repos still count: they are your code, just finished.
 * Markup and config languages are dropped via `IGNORED_LANGUAGES`, otherwise HTML and CSS
 * from any web project drown out the languages the profile is actually about.
 */
export function aggregateLanguages(repos: RepoNode[]): LanguageShare[] {
  const bytesByLanguage = new Map<string, { bytes: number; color: string }>();

  for (const repo of repos) {
    for (const edge of repo.languages.edges) {
      const name = edge.node.name;
      if (IGNORED_LANGUAGES.has(name)) continue;

      const existing = bytesByLanguage.get(name);
      if (existing) {
        existing.bytes += edge.size;
      } else {
        bytesByLanguage.set(name, { bytes: edge.size, color: edge.node.color ?? FALLBACK_COLOR });
      }
    }
  }

  const total = [...bytesByLanguage.values()].reduce((sum, entry) => sum + entry.bytes, 0);
  if (total === 0) return [];

  const ranked = [...bytesByLanguage.entries()]
    .map(([name, entry]) => ({
      name,
      bytes: entry.bytes,
      color: entry.color,
      percent: Math.round((entry.bytes / total) * 1000) / 10,
    }))
    // Ties are broken by name so the output is stable between runs; an unstable order
    // would produce a spurious diff and a pointless commit every few hours.
    .sort((a, b) => b.bytes - a.bytes || a.name.localeCompare(b.name));

  const top = ranked.slice(0, LANGUAGE_COUNT);
  const rest = ranked.slice(LANGUAGE_COUNT);

  if (rest.length > 0) {
    const restBytes = rest.reduce((sum, entry) => sum + entry.bytes, 0);
    top.push({
      name: "Other",
      bytes: restBytes,
      color: FALLBACK_COLOR,
      percent: Math.round((restBytes / total) * 1000) / 10,
    });
  }

  return top;
}
