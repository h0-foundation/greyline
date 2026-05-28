# Contributing to Greyline

Greyline is a privacy-first, offline-only travel logbook. Contributions are
welcome — but the bar is **anything that compromises the offline-first or
privacy promise will be rejected**, no matter how convenient.

## What we welcome

- Bug fixes (with a Playwright e2e or a clear reproduction).
- New tools that compute results locally from bundled data.
- Country profile / airport data quality fixes (with a citation).
- Accessibility improvements (target: WCAG 2.2 AA, no regressions).
- Performance work (bundle-size, paint, hydration).
- Documentation, including the README and `docs/DESIGN.md`.

## What will be rejected

- Telemetry, analytics, or crash reporting packages of any kind.
- External tracking pixels, third-party fonts, or remote stylesheets.
- Features that require an account or a hosted service.
- Code that calls external APIs **without** going through
  `server/services/api-gateway.ts` (the proxy is the single audit point).
- Co-author trailers from generative-AI tools in commit messages.

## Dev setup

```bash
git clone https://github.com/h0-foundation/greyline.git
cd greyline
pnpm setup       # install + migrate + seed
pnpm dev         # http://localhost:3000
```

Requirements: **Node 20+**, **pnpm 9+**.

## Before opening a PR

```bash
pnpm typecheck      # must be 0 errors
pnpm lint           # must be clean
pnpm build          # must succeed
pnpm e2e            # Playwright suite must pass
```

A PR should include:
- A short description of the change and why.
- Screenshots for UI changes (before / after).
- Any new bundled data documented in [NOTICE](./NOTICE) and the
  per-license note in [THIRD_PARTY_LICENSES.md](./THIRD_PARTY_LICENSES.md).
- An entry under `[Unreleased]` in [CHANGELOG.md](./CHANGELOG.md).

## Commit hygiene

- **Conventional Commits** — prefix is the surface, e.g. `ui:`, `tools:`,
  `data:`, `vault:`, `map:`, `ci:`, `docs:`, `fix:`. This drives the
  release-please version bumps.
- **DCO sign-off** — pass `-s` to `git commit`. By signing off you certify
  the [Developer Certificate of Origin](https://developercertificate.org/).
- **No AI co-author trailers.** A repo-level hook strips them.

## Releases

We follow [Semantic Versioning](https://semver.org/). `release-please` will
open a "release PR" automatically when there are commits under `[Unreleased]`;
merging it cuts a new version, git tag, GitHub Release, and ghcr.io image.

## License

By contributing, you agree your contributions are **AGPL-3.0** licensed.
