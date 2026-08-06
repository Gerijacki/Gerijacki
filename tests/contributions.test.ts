import { describe, expect, it } from "vitest";

import { bucketDays, currentStreak, longestStreak } from "../src/data/contributions.js";
import type { ContributionDay } from "../src/github/types.js";

/** Builds a calendar from counts; dates are sequential and only ordering matters here. */
function days(counts: number[]): ContributionDay[] {
  return counts.map((contributionCount, index) => {
    const date = new Date(Date.UTC(2026, 0, 1) + index * 86_400_000);
    return {
      date: date.toISOString().slice(0, 10),
      contributionCount,
      weekday: date.getUTCDay(),
    };
  });
}

describe("longestStreak", () => {
  it("finds the longest run of active days", () => {
    expect(longestStreak(days([1, 1, 0, 1, 1, 1, 0, 1]))).toBe(3);
  });

  it("is 0 for an empty year", () => {
    expect(longestStreak(days([0, 0, 0]))).toBe(0);
    expect(longestStreak([])).toBe(0);
  });

  it("counts a run that reaches the end of the window", () => {
    expect(longestStreak(days([0, 1, 1, 1, 1]))).toBe(4);
  });
});

describe("currentStreak", () => {
  it("counts back from the last day", () => {
    expect(currentStreak(days([0, 1, 1, 1]))).toBe(3);
  });

  // The build can run at 00:05 UTC, before anything has been committed that day;
  // reporting 0 then would be wrong.
  it("does not break the streak on an empty final day", () => {
    expect(currentStreak(days([1, 1, 1, 0]))).toBe(3);
  });

  it("breaks on two consecutive empty days", () => {
    expect(currentStreak(days([1, 1, 0, 0]))).toBe(0);
  });

  it("is 0 for an empty calendar", () => {
    expect(currentStreak([])).toBe(0);
  });
});

describe("bucketDays", () => {
  it("sums each bucket and keeps every day", () => {
    const input = days([1, 2, 3, 4, 5, 6]);
    const buckets = bucketDays(input, 3);

    expect(buckets).toEqual([3, 7, 11]);
    expect(buckets.reduce((a, b) => a + b, 0)).toBe(21);
  });

  it("keeps the remainder rather than dropping it", () => {
    const input = days([1, 1, 1, 1, 1, 1, 1]);
    expect(bucketDays(input, 3).reduce((a, b) => a + b, 0)).toBe(7);
  });

  it("returns nothing for empty input", () => {
    expect(bucketDays([], 52)).toEqual([]);
  });
});
