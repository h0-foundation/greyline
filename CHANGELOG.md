# Changelog

All notable changes to Greyline are documented here.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added
- Editorial type voice: **Fraunces** wired as `--font-display`. `.font-display`
  is now the serif voice for hero titles, country names, trip names.
  `--font-display-sans` escape hatch for surfaces where serif is wrong.
- `.dropcap` utility for first-paragraph emphasis on editorial surfaces.
- `@tailwindcss/typography` plugin for long-form `.prose` content.
- Native **View Transitions** on the scratch-map → `/countries/[code]`
  navigation (Baseline 2026, graceful fallback).
- **Editorial dossier header** on `/countries/[code]`: mono dossier row +
  Fraunces 5xl→7xl country name + mono caption (`official · capital · lat,lng · pop.`).
- `docs/DESIGN.md` — the structural design system spec.
- Production governance: `SECURITY.md`, `NOTICE`, `THIRD_PARTY_LICENSES.md`,
  `CONTRIBUTING.md`, `CODE_OF_CONDUCT.md`, `CHANGELOG.md`.
- **GitHub Actions CI** (`.github/workflows/ci.yml`) — lint, typecheck, build,
  Playwright e2e on every PR.
- **Dependabot** weekly updates for npm + GitHub Actions.
- Security headers in `next.config.ts` (CSP, HSTS, COOP, Permissions-Policy,
  X-Content-Type-Options, X-Frame-Options, Referrer-Policy).

### Changed
- Motion-token system: `lib/motion.ts` is the single source of truth for
  durations and easings; ~10 framer-motion call sites refactored.
- `.surface-interactive` hover-lift applied to clickable card surfaces.
- README rewritten to match the Next.js stack + lifetime-log niche.

### Fixed
- `/api/places` returned HTTP 500 because the query selected `d.name` from
  `destinations` (the column is `city`). Aliased `city AS name` with a
  `country_code` fallback. Broke the PlacePicker on Weather + Airports.
- Scratch-map: theme toggle no longer replays the first-load fill animation
  (theme change recolors via `setPaintProperty` instead of re-init).

## [0.1.0] — 2026-05-27

Initial Next.js release. Migrated from SvelteKit.

- Privacy-first, offline-only lifetime travel logbook.
- 24 pages + 32 local API routes.
- Hero scratch-map with click-through, rich hover, first-load fill animation,
  PNG export.
- 11 tools (Airports, Visa, Weather, Advisories, Currency, Hotel & room
  security, Border crossing, Flying data-footprint, Packing, EXIF stripper,
  Self-doxxing audit).
- AES-256-GCM + Argon2id encrypted document vault.
- 250 country profiles bundled offline.
- AGPL-3.0.
