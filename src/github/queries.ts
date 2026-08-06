/**
 * One query for the whole build.
 *
 * Everything the cards need — identity, contribution calendar, owned repos with their
 * language breakdown, topics and latest release — comes back in a single round trip.
 * Splitting this into per-card queries would cost six requests per run and six chances
 * to half-fail, leaving the README in a mixed state.
 *
 * `contributionsCollection` accepts at most a one-year window, which is why `from`/`to`
 * are parameters rather than baked in.
 */
export const PROFILE_QUERY = /* GraphQL */ `
  query Profile($login: String!, $from: DateTime!, $to: DateTime!) {
    rateLimit {
      cost
      remaining
      limit
      resetAt
    }
    user(login: $login) {
      login
      name
      avatarUrl
      location
      followers {
        totalCount
      }
      following {
        totalCount
      }
      pullRequests {
        totalCount
      }
      issues {
        totalCount
      }
      contributionsCollection(from: $from, to: $to) {
        totalCommitContributions
        totalPullRequestContributions
        totalIssueContributions
        totalPullRequestReviewContributions
        totalRepositoryContributions
        restrictedContributionsCount
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              date
              contributionCount
              weekday
            }
          }
        }
      }
      repositories(
        first: 100
        privacy: PUBLIC
        isFork: false
        ownerAffiliations: OWNER
        orderBy: { field: PUSHED_AT, direction: DESC }
      ) {
        totalCount
        nodes {
          name
          description
          url
          isArchived
          stargazerCount
          forkCount
          pushedAt
          createdAt
          primaryLanguage {
            name
            color
          }
          repositoryTopics(first: 8) {
            nodes {
              topic {
                name
              }
            }
          }
          languages(first: 12, orderBy: { field: SIZE, direction: DESC }) {
            edges {
              size
              node {
                name
                color
              }
            }
          }
          latestRelease {
            tagName
            publishedAt
            url
          }
        }
      }
    }
  }
`;
