import type { ContributionDay, ProfileQueryResult } from "../github/types.js";

export interface ContributionStats {
  /** Every day in the window, oldest first. */
  days: ContributionDay[];
  total: number;
  /** Contributions to private repos, which the calendar itself does not include. */
  privateTotal: number;
  commits: number;
  pullRequests: number;
  reviews: number;
  issues: number;
  reposCreated: number;
  currentStreak: number;
  longestStreak: number;
  busiestDay: ContributionDay | null;
  /** Mean contributions per day across the window, to one decimal. */
  dailyAverage: number;
}

function flattenCalendar(result: ProfileQueryResult): ContributionDay[] {
  return result.user.contributionsCollection.contributionCalendar.weeks
    .flatMap((week) => week.contributionDays)
    .sort((a, b) => a.date.localeCompare(b.date));
}

/**
 * Longest run of consecutive days with at least one contribution.
 *
 * The calendar is dense — GitHub returns a row for every day including zeros — so
 * adjacency in the array is adjacency in time and no date arithmetic is needed.
 */
export function longestStreak(days: ContributionDay[]): number {
  let best = 0;
  let run = 0;

  for (const day of days) {
    run = day.contributionCount > 0 ? run + 1 : 0;
    if (run > best) best = run;
  }

  return best;
}

/**
 * Streak ending now.
 *
 * A zero on the final day does not break the streak: the build can run at 00:05 UTC, long
 * before you have committed anything that day, and reporting 0 then would be wrong. Only a
 * zero on the day *before* that ends it.
 */
export function currentStreak(days: ContributionDay[]): number {
  if (days.length === 0) return 0;

  let index = days.length - 1;
  if (days[index]!.contributionCount === 0) index -= 1;

  let streak = 0;
  for (; index >= 0; index--) {
    if (days[index]!.contributionCount === 0) break;
    streak += 1;
  }

  return streak;
}

export function summariseContributions(result: ProfileQueryResult): ContributionStats {
  const collection = result.user.contributionsCollection;
  const days = flattenCalendar(result);
  const total = collection.contributionCalendar.totalContributions;

  const busiestDay = days.reduce<ContributionDay | null>(
    (best, day) => (best === null || day.contributionCount > best.contributionCount ? day : best),
    null,
  );

  return {
    days,
    total,
    privateTotal: collection.restrictedContributionsCount,
    commits: collection.totalCommitContributions,
    pullRequests: collection.totalPullRequestContributions,
    reviews: collection.totalPullRequestReviewContributions,
    issues: collection.totalIssueContributions,
    reposCreated: collection.totalRepositoryContributions,
    currentStreak: currentStreak(days),
    longestStreak: longestStreak(days),
    busiestDay,
    dailyAverage: days.length === 0 ? 0 : Math.round((total / days.length) * 10) / 10,
  };
}

/**
 * Downsamples the calendar into `buckets` totals for the area chart.
 *
 * 365 points across 800-odd pixels is noise; roughly weekly buckets show the shape of the
 * year. The last bucket absorbs the remainder so no day is dropped.
 */
export function bucketDays(days: ContributionDay[], buckets: number): number[] {
  if (days.length === 0 || buckets <= 0) return [];

  const size = Math.ceil(days.length / buckets);
  const out: number[] = [];

  for (let start = 0; start < days.length; start += size) {
    const slice = days.slice(start, start + size);
    out.push(slice.reduce((sum, day) => sum + day.contributionCount, 0));
  }

  return out;
}
