import { graphql } from "@octokit/graphql";
import { Octokit } from "@octokit/rest";
import { RequestError } from "@octokit/request-error";

import { LOGIN, REPO } from "../config.js";
import { ACTIVITY_QUERY, PROFILE_QUERY } from "./queries.js";
import type { ActivityQueryResult, ProfileQueryResult } from "./types.js";

const USER_AGENT = "gerijacki-profile-generator";

/** Counters surfaced in the build summary so a run is auditable after the fact. */
export interface ApiUsage {
  requests: number;
  graphqlCost: number;
  graphqlRemaining: number;
}

export const usage: ApiUsage = { requests: 0, graphqlCost: 0, graphqlRemaining: 0 };

function token(): string {
  const t = process.env["GITHUB_TOKEN"] ?? process.env["GH_TOKEN"];
  if (!t) {
    throw new Error(
      "No GITHUB_TOKEN in the environment. In Actions this is the built-in token; " +
        "locally, export a read-only PAT before running the generator.",
    );
  }
  return t;
}

/**
 * Retry on the failures that are actually transient: 5xx, secondary rate limits and
 * network resets. A 401/403/404 means the request is wrong or the token lacks a scope,
 * and retrying it just burns the rate limit — those propagate immediately.
 */
async function withRetry<T>(label: string, fn: () => Promise<T>, attempts = 4): Promise<T> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= attempts; attempt++) {
    try {
      usage.requests += 1;
      return await fn();
    } catch (error) {
      lastError = error;

      const retryable =
        !(error instanceof RequestError) ||
        error.status >= 500 ||
        error.status === 429 ||
        // Secondary rate limit: 403 with a retry hint, distinct from a permissions 403.
        (error.status === 403 && /rate limit|abuse/i.test(error.message));

      if (!retryable || attempt === attempts) break;

      const backoffMs = 2 ** attempt * 500 + Math.floor(Math.random() * 250);
      console.warn(`${label}: attempt ${attempt} failed (${describe(error)}), retrying in ${backoffMs}ms`);
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
    }
  }

  throw lastError;
}

function describe(error: unknown): string {
  if (error instanceof RequestError) return `HTTP ${error.status}: ${error.message}`;
  return error instanceof Error ? error.message : String(error);
}

/** Fetches everything the cards need in one round trip. */
export async function fetchProfile(now: Date): Promise<ProfileQueryResult> {
  const client = graphql.defaults({
    headers: { authorization: `token ${token()}`, "user-agent": USER_AGENT },
  });

  const from = new Date(now);
  from.setUTCFullYear(from.getUTCFullYear() - 1);
  from.setUTCDate(from.getUTCDate() + 1); // the API window is inclusive and capped at one year

  const result = await withRetry("profile query", () =>
    client<ProfileQueryResult>(PROFILE_QUERY, {
      login: LOGIN,
      from: from.toISOString(),
      to: now.toISOString(),
    }),
  );

  usage.graphqlCost += result.rateLimit.cost;
  usage.graphqlRemaining = result.rateLimit.remaining;

  return result;
}

/**
 * Contribution activity in an arbitrary window, for the release notes.
 *
 * Separate from `fetchProfile` because the window is days rather than a year and the shape
 * of the answer is different: what got worked on, not what the totals are.
 */
export async function fetchActivity(from: Date, to: Date): Promise<ActivityQueryResult> {
  const client = graphql.defaults({
    headers: { authorization: `token ${token()}`, "user-agent": USER_AGENT },
  });

  const result = await withRetry("activity query", () =>
    client<ActivityQueryResult>(ACTIVITY_QUERY, {
      login: LOGIN,
      from: from.toISOString(),
      to: to.toISOString(),
    }),
  );

  usage.graphqlCost += result.rateLimit.cost;
  usage.graphqlRemaining = result.rateLimit.remaining;

  return result;
}

/**
 * Unique visitors over the last 14 days, from the repository traffic API.
 *
 * This is the honest replacement for a third-party view counter: real data, from your own
 * repo, with no external service involved. The endpoint requires push access — the Actions
 * token has it, a bare read-only PAT does not — so a permissions failure degrades to
 * `null` and the KPI is simply omitted rather than failing the build.
 */
export async function fetchTrafficViews(): Promise<{ views: number; uniques: number } | null> {
  const octokit = new Octokit({ auth: token(), userAgent: USER_AGENT });

  try {
    const response = await withRetry("traffic views", () =>
      octokit.rest.repos.getViews({ owner: LOGIN, repo: REPO, per: "day" }),
    );
    return { views: response.data.count, uniques: response.data.uniques };
  } catch (error) {
    if (error instanceof RequestError && (error.status === 403 || error.status === 404)) {
      console.warn(`traffic views unavailable (${describe(error)}) — omitting the KPI`);
      return null;
    }
    throw error;
  }
}
