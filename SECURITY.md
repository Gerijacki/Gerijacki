# Security policy

This repository generates a GitHub profile page. It holds no user data and exposes no
service, so the interesting surface is not the rendered output — it is the automation that
produces it and the dependency chain underneath.

## Reporting

Report anything you find through
[private security advisories](https://github.com/Gerijacki/Gerijacki/security/advisories/new).
Please do not open a public issue for a vulnerability.

Expect an acknowledgement within a few days. If a report turns out to affect one of the
upstream actions or packages rather than this repository, I will say so and point you at the
right project rather than sitting on it.

## What is in scope

- **The workflows.** Anything that could get code or data into `.github/workflows/`, escalate
  a job's permissions, or exfiltrate the `GITHUB_TOKEN`. Every job declares least-privilege
  `permissions`, all actions are pinned by commit SHA, and `zizmor` runs on every push.
- **The generator.** Everything under `src/` runs against untrusted-ish input: repository
  names, descriptions and topics come back from the GitHub API and end up in Markdown and
  SVG. Anything that escapes the escaping in `src/render/svg.ts` is a real finding.
- **The published release artefacts.** The bundles attached to each release are built by
  `.github/workflows/release.yml`; a way to get unexpected content into one is in scope.

## What is not

- The content of the profile itself — counts, streaks and language percentages come straight
  from the GitHub API.
- Rate-limit exhaustion of my own token.
- Findings that require write access to this repository to begin with.

## Supported versions

Only the current `main` is supported. Releases are dated snapshots of the profile, not
software versions, so there is nothing to backport to.
