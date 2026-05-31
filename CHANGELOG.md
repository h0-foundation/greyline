# Changelog

All notable changes to Greyline are documented here.

The format is based on
[Keep a Changelog](https://keepachangelog.com/en/1.1.0/), and this project
adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

## [1.1.0] — 2026-05-31

Greyline 1.1 — the opt-in **connector & intelligence** release. Six new data
sources (two bundled and fully offline, four live and gated), an offline
sanctions screen, an offline gazetteer behind search, a pillar **focus mode**,
and a Felt-style resizable map workspace. Everything stays offline-first:
connectors are OFF by default, bundled datasets need no network, and no telemetry.

### Added
- **OFAC sanctions screening** (`/tools/sanctions`) — screen a name against the
  bundled US Treasury **SDN + Consolidated** lists (incl. a.k.a. aliases) entirely
  on-device; the name never leaves the machine. Honest "screening aid, not legal
  advice" posture.
- **UCDP armed-conflict** — a compact slice derived at build time from the Uppsala
  GED: the deadliest recent georeferenced events power an **Armed conflict** map
  layer, and per-country-year fatalities drive a trend card on the country dossier.
  Fully offline (the 350 MB raw GED never enters the repo).
- **Offline GeoNames gazetteer** — `geonames_cities` (~69 k places) backs
  `/api/cities`, the map's **Search** tab, and an offline fallback for
  `/api/geocode`, so place lookup works air-gapped.
- **Live map connectors** (opt-in, no key): **EMSC** seismic (complements USGS),
  **NWS** US weather alerts (severity-tinted zones).
- **Key-required map connectors** (opt-in, free personal key): **NASA FIRMS**
  active fires, **OpenAQ** air-quality stations. Keys are entered in
  Settings → Connections and stored locally; the toggles API never returns them
  (only `has_key`).
- **Per-connector API keys** — `proxyFetch` injects a stored key as a header,
  query param, or URL path segment (FIRMS), gating a key-required connector until
  its key is set. Keys are kept out of the response cache key.
- **Pillar focus mode** — a top-bar switch narrows the sidebar + tools catalog to
  one of *Travel risk · Counter-surveillance · Investigation*, or All (default,
  the full surface). Persisted via settings; a focus aid, not access control.
- **Felt-style map workspace** — the floating control box on `/map` is now a
  docked, **collapsible, resizable** panel with tabs: **Layers**, **Features**
  (saved routes — fit / delete / show-hide), **Search** (offline gazetteer), and
  **Packs** (offline street tiles). Panel size persists.

### Changed
- **CI/e2e fully decoupled from live APIs.** `build:countries` and `build:data`
  are bundle-first under `process.env.CI`, seeding from committed gzipped
  snapshots (REST Countries, OurAirports, passport-index, GeoNames, OFAC, UCDP) —
  an upstream outage can no longer red the pipeline.
- User-Agent bumped to `Greyline/1.1`.

### Deferred (within #84)
- **NOTAM-US / NOTAM-EU** (now require multi-part developer credentials; EAD
  redistribution terms) and **AISStream** (websocket-only, outside the
  `proxyFetch` HTTP/cache + offline-first egress model) are intentionally not
  shipped this release.

## [1.0.0] — 2026-05-30

Greyline 1.0 — a professional, **offline-first** travel & field-intelligence
workbench. Plan trips, keep a lifetime travel log, and run counter-surveillance,
journalism/OSINT, and travel-risk workflows entirely on-device. No account, no
cloud, no telemetry. AGPL-3.0.

### Added
- **Offline maps.** A committed whole-world vector basemap
  (`public/geo/world.pmtiles`, Natural Earth z0–6, ~2.3 MB) renders the map fully
  air-gapped by default. Add **regional street-level packs** — a free Protomaps
  `.pmtiles` dropped into `data/bundles/maps/` and registered via the "Map packs"
  dialog — for full street detail per area, served by a range-aware
  `/api/tiles/[id]`. CARTO detail tiles, NASA GIBS satellite, and RainViewer radar
  are opt-in layers on top. `pnpm build:tiles` (maintainer-only; needs
  `tippecanoe`) regenerates the basemap; the `offline_bundles` table tracks packs.
- **Offline route drawing on `/map`** — surveillance-detection / extraction /
  variation routes with great-circle metrics, saved locally to `saved_routes`. No
  waypoints ever leave the device.
- **Per-trip tabbed workspace** (Overview / Flights / Briefing / Documents /
  Packing) replacing the long scroll; cockpit hash deep-links open the right tab.
- **Command-palette entity search** — Cmd+K jumps straight to a trip by name.
- **Settings → Connections hub** — opt-in connectors grouped by purpose (Travel
  intelligence · Live map layers), each showing the exact host it contacts.
- **First-run orientation** signposts in the empty cockpit.
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
- **Connectors pruned** to an honest, used-only set: removed `gdelt` (had a
  client but no callers) and `ip-api` (plaintext-IP leak on the free tier).
  (migration `016_prune_connectors`)
- Motion-token system: `lib/motion.ts` is the single source of truth for
  durations and easings; ~10 framer-motion call sites refactored.
- `.surface-interactive` hover-lift applied to clickable card surfaces.
- README rewritten to match the Next.js stack + lifetime-log niche.

### Fixed
- **Hardening:** standardized API error envelope (`lib/api.ts`) across every route
  handler — no raw exception strings (which can carry SQL fragments, file paths,
  or upstream URLs) reach the client; the real error is logged server-side.
- Stale-fetch race where an in-flight aircraft/camera request could re-add markers
  after its layer was toggled off (per-layer fetch generation guard).
- `/api/places` returned HTTP 500 because the query selected `d.name` from
  `destinations` (the column is `city`). Aliased `city AS name` with a
  `country_code` fallback. Broke the PlacePicker on Weather + Airports.
- Scratch-map: theme toggle no longer replays the first-load fill animation
  (theme change recolors via `setPaintProperty` instead of re-init).

### Security
- Adversarial multi-agent review over the release diff — SSRF/egress, path
  traversal, input validation, vault crypto, and error leakage. The offline-first
  invariant was verified: no default-on external calls; the world basemap and
  street packs are served same-origin (range-aware); online tiles/satellite/radar
  stay opt-in. CodeQL is scoped to the deployed app surface.
- Online turn-by-turn directions are intentionally **not** offered — sending
  route waypoints to a third party would leak planned movements.

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
