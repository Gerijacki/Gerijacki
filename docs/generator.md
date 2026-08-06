# The profile generator

`README.md` in this repository is not written by hand. It is the output of a TypeScript
generator that reads the GitHub API, renders its own SVG cards, and fills marked regions of
`README.tpl.md`. Nothing on the page is fetched from a third-party widget service.

## Running it locally

```bash
npm ci
export GITHUB_TOKEN="$(gh auth token)"   # any read-only token works

npm run generate    # build, fetch, render, write README.md + assets/
npm run dry-run     # same, but writes nothing and reports what would change
npm test            # unit tests + SVG snapshots
npm run typecheck
```

Running `npm run generate` twice in a row must leave the working tree clean on the second
run. If it doesn't, something in the pipeline is non-deterministic — that is a bug, because
the scheduled workflow commits only when files actually change and non-determinism would
turn it into four empty commits a day.

## Layout

| Path | What lives there |
| :-- | :-- |
| `src/config.ts` | Every tunable: palette, card sizes, featured repos, stack contents |
| `src/github/` | The single GraphQL query, its types, and the API client |
| `src/data/` | Pure transforms: contribution stats, language mix, project ranking |
| `src/render/` | SVG primitives and one module per card |
| `src/markers.ts` | Region substitution into the template |
| `src/build.ts` | Orchestration — the only place that knows about all of the above |
| `src/index.ts` | CLI entry point and the Actions job summary |

The data layer never imports the render layer, and neither imports `build.ts`. That is what
keeps the cards testable without touching the network.

## Adding a section

1. Add a `<!-- gen:NAME:start -->` / `<!-- gen:NAME:end -->` pair to `README.tpl.md`.
2. Add a matching `NAME:` key to the `applySections` call in `src/build.ts`.

Doing only one of the two fails the build. That is deliberate: a template region with no
content would ship a blank hole in the page, and generated content with no region would be
work that never reaches the reader.

## Adding a card

Write `src/render/<name>.svg.ts` exporting `render<Name>(ctx: CardContext, …): string`,
built with the `card()` wrapper from `render/theme.ts`. Register it in `build.ts` via
`renderCard(name, alt, …)`, which renders every theme, writes the files, and returns the
`<picture>` element.

Two constraints the snapshot tests enforce for every card:

- **No external references.** No `http(s)` URLs, no `<image>`, no `<script>`. GitHub proxies
  README images through Camo, so anything remote either fails to load or leaks a request.
- **Deterministic output.** Coordinates go through `n()`, which rounds to 2dp; ties in any
  sort are broken by name.

## Theming

Cards render once per entry in `THEMES` and are referenced with a `<picture>` element, which
is GitHub's supported mechanism for theme-aware images — `prefers-color-scheme` inside an SVG
loaded via `<img>` is not reliable through Camo.

Each `srcset` carries a `?v=<content hash>` so a regenerated card is a new URL and Camo
serves it immediately instead of a cached copy of the old one.

Anything animated must have its **resting state be the finished state**, with the animation
running `backwards` from the starting position. If it were the other way round, a viewer with
reduced motion enabled, a throttled tab, or a renderer that ignores CSS would see an empty
card. The terminal card's typing effect is built this way.

## Workflows

| Workflow | Trigger | What it does |
| :-- | :-- | :-- |
| `readme.yml` | every 6h, manual, push to `main` | Regenerates and commits — only if something changed |
| `ci.yml` | pull requests, push to `main` | Typecheck, tests, markdownlint, generator dry-run |
| `security.yml` | push, PR, weekly | zizmor (workflow audit), CodeQL, OpenSSF Scorecard |
| `health.yml` | weekly | Verifies referenced assets exist and links resolve; files an issue if not |

All actions are pinned by commit SHA with the version in a trailing comment, every job
declares least-privilege `permissions`, and Dependabot keeps the pins current. `zizmor` runs
clean at its `pedantic` persona; keep it that way.

CI deliberately does **not** fail when the committed README differs from a fresh build. The
inputs are live — the contribution count changes daily — so such a gate would fail on almost
every pull request for reasons unrelated to the change under review. What CI asserts is that
the build *runs*: markers and sections agree, every card renders, the query still parses.

## Why the prose is generated, not written

Every sentence the pipeline produces — the "currently building" digest, the release notes — is
derived from the same API data as the cards. Nothing is invented, so nothing on the page can
claim something the data doesn't support, and a run costs nothing beyond Actions minutes.

If a generative layer is ever added, two rules keep that property: it goes behind a flag that
is off when its credential is absent, and the deterministic function stays as the fallback
path, so a missing secret or a failed call degrades the wording instead of breaking the page.
