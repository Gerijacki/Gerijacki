/** Shapes returned by the single GraphQL query in `queries.ts`. */

export interface ContributionDay {
  date: string;
  contributionCount: number;
  weekday: number;
}

export interface ContributionWeek {
  contributionDays: ContributionDay[];
}

export interface LanguageEdge {
  size: number;
  node: { name: string; color: string | null };
}

export interface RepoNode {
  name: string;
  description: string | null;
  url: string;
  isArchived: boolean;
  stargazerCount: number;
  pushedAt: string;
  primaryLanguage: { name: string; color: string | null } | null;
  repositoryTopics: { nodes: { topic: { name: string } }[] };
  languages: { edges: LanguageEdge[] };
  latestRelease: { tagName: string; publishedAt: string | null; url: string } | null;
}

export interface ActivityQueryResult {
  rateLimit: { cost: number; remaining: number; limit: number; resetAt: string };
  user: {
    contributionsCollection: {
      totalCommitContributions: number;
      totalPullRequestContributions: number;
      totalIssueContributions: number;
      totalPullRequestReviewContributions: number;
      commitContributionsByRepository: {
        repository: {
          nameWithOwner: string;
          url: string;
          description: string | null;
          primaryLanguage: { name: string } | null;
        };
        contributions: { totalCount: number };
      }[];
      pullRequestContributions: {
        nodes: {
          pullRequest: {
            title: string;
            url: string;
            number: number;
            merged: boolean;
            repository: { nameWithOwner: string };
          };
        }[];
      };
      issueContributions: {
        nodes: {
          issue: {
            title: string;
            url: string;
            number: number;
            repository: { nameWithOwner: string };
          };
        }[];
      };
    };
  };
}

export interface ProfileQueryResult {
  rateLimit: { cost: number; remaining: number; limit: number; resetAt: string };
  user: {
    login: string;
    name: string | null;
    avatarUrl: string;
    location: string | null;
    followers: { totalCount: number };
    following: { totalCount: number };
    repositories: { totalCount: number; nodes: RepoNode[] };
    pullRequests: { totalCount: number };
    issues: { totalCount: number };
    contributionsCollection: {
      totalCommitContributions: number;
      totalPullRequestContributions: number;
      totalIssueContributions: number;
      totalPullRequestReviewContributions: number;
      totalRepositoryContributions: number;
      restrictedContributionsCount: number;
      contributionCalendar: {
        totalContributions: number;
        weeks: ContributionWeek[];
      };
    };
  };
}
