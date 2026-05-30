# Changelog

All notable changes to Greyline are documented here.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## 1.0.0 (2026-05-30)


### Features

* **field:** SDR / egress route planner — wires the schema-only saved_routes ([#52](https://github.com/h0-foundation/greyline/issues/52)) ([740ea26](https://github.com/h0-foundation/greyline/commit/740ea265577e119144424ddeeb5af7faf72aed7a))
* **intel:** road-safety reframe on the country dossier (M2) ([#53](https://github.com/h0-foundation/greyline/issues/53)) ([19221bd](https://github.com/h0-foundation/greyline/commit/19221bd2152a37ddcab0e285583ebd2c709c6c36))
* **map:** CCTV/ALPR coverage cones + colour-blind-safe classification ([#51](https://github.com/h0-foundation/greyline/issues/51)) ([516dfa2](https://github.com/h0-foundation/greyline/commit/516dfa21a47c710234adff5f4c0f95e2e84a66a2))
* **surveillance:** pattern-of-life self-audit + new-code robustness fixes ([#48](https://github.com/h0-foundation/greyline/issues/48)) ([1453d36](https://github.com/h0-foundation/greyline/commit/1453d360b2b0dd1db6db51dfb8443c714b4a9d25))
* **surveillance:** real TEDD scorer — score recurrences by time + distance ([#46](https://github.com/h0-foundation/greyline/issues/46)) ([87609ca](https://github.com/h0-foundation/greyline/commit/87609ca27318ced2456901f915a64143ba1193cb))
* **tools:** Bluetooth tracker-stalking defense (offline, safety-first) ([#50](https://github.com/h0-foundation/greyline/issues/50)) ([23dba56](https://github.com/h0-foundation/greyline/commit/23dba56a75061be09d41fdaa8443f1f3030c264f))
* **tools:** offline emergency card — per-country numbers + printable panic card (M2) ([#56](https://github.com/h0-foundation/greyline/issues/56)) ([cd2ff29](https://github.com/h0-foundation/greyline/commit/cd2ff29b66e93d95258aaac0d3ed93a252389c43))
* **tools:** perceptual image-hash near-duplicate detector (M4) ([#57](https://github.com/h0-foundation/greyline/issues/57)) ([c8f1150](https://github.com/h0-foundation/greyline/commit/c8f1150650cc1a764188fda5b1b019b469b32483))
* **tools:** SIFT verification + source-protection playbooks (M4) ([#54](https://github.com/h0-foundation/greyline/issues/54)) ([dcac8fb](https://github.com/h0-foundation/greyline/commit/dcac8fb4e6a373c62e649d6960eab1b10d6d52d3))
* **tools:** threat-model wizard — device + tier signature-reduction plan (offline) ([#49](https://github.com/h0-foundation/greyline/issues/49)) ([10cb77c](https://github.com/h0-foundation/greyline/commit/10cb77ca0466c0c6f0653eade91d0124d1a56908))


### Bug Fixes

* **security:** patch column-name SQL injection + harden egress/crypto (sweep findings) ([#45](https://github.com/h0-foundation/greyline/issues/45)) ([ee8bfe4](https://github.com/h0-foundation/greyline/commit/ee8bfe4249d1d17e18f3f349dea7accd7e574598)), closes [#42](https://github.com/h0-foundation/greyline/issues/42)

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
