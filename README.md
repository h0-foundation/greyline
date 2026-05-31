# Greyline

**An offline intelligence workbench for people whose movements are sensitive — duty of care without surveillance. Everything runs on your machine; nothing leaves it.**

Greyline is a local-only, offline-first **travel-risk + OSINT workbench**. It leads with travel-risk management — an open, auditable country **Risk Score**, **road-safety-first** briefings, multi-government advisories, and visa/document engines — and layers two differentiating packs on the same private architecture:

- **Counter-surveillance** — a TEDD surveillance-detection scorer, pattern-of-life self-audit, device **threat-model wizard**, **Bluetooth-tracker defense**, an **SDR/egress route planner**, and a **CCTV/ALPR coverage-cone** map.
- **Investigative journalism / OSINT** — **chronolocation** from shadows, **perceptual image-hash** near-duplicate detection, and **SIFT verification + source-protection** playbooks.

It also keeps your **lifetime travel record** (SF-86-grade, civilian-useful) and renders a dark editorial cockpit answering: *what needs my attention right now?*

No accounts. No cloud. No telemetry. One folder of files on your computer, and one app you control. Built for journalists, NGO field staff, lawyers, activists, dual citizens, and security-conscious travelers. The cloud travel-risk incumbents sell the two things Greyline structurally *won't* — a 24/7 SOC and live GPS tracking — which are exactly the surveillance-heavy, subpoena-able parts. Everything else is computable offline from open data.

---

## Table of contents

1. [Why this exists](#why-this-exists)
2. [Quick start](#quick-start)
3. [Architecture at a glance](#architecture-at-a-glance)
4. [Pages — every surface, what it does](#pages--every-surface-what-it-does)
5. [Tools — what each computes locally](#tools--what-each-computes-locally)
6. [Auto-generated trip kit](#auto-generated-trip-kit)
7. [Data layer — every table, every bundle](#data-layer--every-table-every-bundle)
8. [Build scripts — how the bundles get there](#build-scripts--how-the-bundles-get-there)
9. [External connectors](#external-connectors)
10. [Cyber & posture analysis](#cyber--posture-analysis)
11. [Tech stack](#tech-stack)
12. [Project layout](#project-layout)
13. [All commands](#all-commands)
14. [What could be coming soon](#what-could-be-coming-soon)
15. [License](#license)

---

## Why this exists

Every existing travel app wants to be the place your itinerary lives. They have to — the data is the product. But your **lifetime movement history** is the single richest piece of personal information you produce, and the consequences of it leaking (or being mined, or quietly profiled, or one day subpoenaed) are real.

Greyline takes the opposite stance:

- **Your whole travel life, in one private record.** Every trip you've taken, every country day-counted, every passport you've held — kept locally, exportable on demand, deletable at will.
- **SF-86-grade rigor, civilian-useful.** The same disclosure logic the U.S. government uses for foreign-travel reporting (the 7-year rolling window, per-country day totals, residency, Schengen 90/180) — without ever calling it "SF-86." For most people it's just *"the record I'd want if I ever had to remember exactly where I was."*
- **Decision tools, not engagement loops.** Multi-government advisories, packing recipes, document requirements, airline carry-on rules, layover risk, weather-as-go/no-go, currency, country dossiers — all computed locally from bundled data.
- **A cockpit, not a feed.** The home page is designed against 47 sources of primary HCI research (consolidated, with the full cited research corpus, in [`research/`](research/)): a single "what needs my attention?" tile, temporal chunks (today / upcoming / recent), data-ink-ratio numbers strip, and a hero scratch-map showing every country you've been.

Built for journalists, frequent travelers, security-minded professionals, dual citizens, NGO field staff, and anyone who would rather not feed their movement history to ad-tech. AGPL-3.0.

---

## Quick start

```bash
# 1. clone, install, create the local SQLite DB, seed default settings
git clone https://github.com/h0-foundation/greyline.git
cd greyline
pnpm setup

# 2. (optional but recommended) bundle the dossier + advisory + trip-data layers
pnpm build:countries    # ~250 country profiles (REST Countries)
pnpm build:data         # ~45k airports (OurAirports) + visa matrix (passport-index)
pnpm build:dossier      # CPI, RSF, visa-free counts, CIA Factbook (per country)
pnpm build:advisories   # US State Dept + UK FCDO travel advisories
pnpm build:trip-data    # Packing / OPSEC / airline / document templates

# 3. run it
pnpm dev
```

Open **http://localhost:3000**. That's it.

`Ctrl+C` to stop. Your data lives in `data/` and persists between sessions; next time, just `pnpm dev` again.

**Prefer a production build?** `pnpm build && pnpm start` — same port, faster, no hot reload.

**Prefer Docker?** `docker compose up -d` — exposes the app at `127.0.0.1:3000` (loopback-only). Your `data/` is volume-mounted, so it survives container restarts.

---

## Architecture at a glance

```
┌─────────────────────────────────────────────────────────────────┐
│  Browser (single tab, localhost)                                │
│  ─ React 19 + shadcn/ui (Radix), Tailwind 4, motion/react       │
│  ─ MapLibre GL 5 + PMTiles (offline basemap + scratch-map)      │
│  ─ View Transitions API (cross-route shared elements)           │
└─────────────────────────────────────────────────────────────────┘
                              │ HTTP (loopback only)
┌─────────────────────────────────────────────────────────────────┐
│  Next.js 16 server  (single process)                            │
│  ─ App Router with server components doing direct SQLite reads  │
│  ─ Route handlers under /api for CRUD + JSON                    │
│  ─ Security headers: HSTS · COOP · CORP · CSP · Permissions-PT  │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────────┐
        ▼                     ▼                         ▼
┌──────────────┐   ┌──────────────────────┐   ┌──────────────────┐
│ SQLite (WAL) │   │ Vault (AES-256-GCM)  │   │ External proxies │
│ better-sqlite3│  │ Argon2id KDF         │   │ (gateway)         │
│ ─ 32 tables  │   │ per-doc nonce + tag  │   │ ─ disabled by     │
│ ─ migrations │   │ no recovery          │   │   default          │
│ ─ data_sources│  └──────────────────────┘   │ ─ user-toggled    │
└──────────────┘                              │ ─ all responses   │
                                              │   cached locally  │
                                              └──────────────────┘
```

Everything runs as one Node process. There is no background worker, no cron, no daemon. Server components do reads at request time; the home page is a `force-dynamic` route that aggregates from 8+ tables on every request and renders straight to RSC stream.

---

## Pages — every surface, what it does

The app has **14 user-facing routes** plus **32 local API handlers**. Every route is server-rendered from local data.

### Cockpit & navigation

| Route | What it does | Pulls from |
|---|---|---|
| `/` | The **cockpit**. Status hairline (date · privacy posture) → cockpit tile for the trip needing attention now (Fraunces lede, four 44×44 instruments) → Up Next + Recent columns → six-KPI numbers strip → scratch map → On-this-day → conditional Hotspots panel → four primary actions. An empty cockpit shows **first-run orientation** signposts so a fresh install isn't a dead end. The **Cmd+K** palette searches pages, tools, actions **and trips by name** (entity search — jump straight to a trip). Built from 47 sources of primary research. | trips, destinations, flights, checklists, dossier, indices, advisories, vault, settings |
| `/trips` | **Planning focus.** Lists active + planning trips only with rich row cards (destinations, flights, carriers, packing %, docs %, peak advisory). New-trip dialog. | trips (filtered), checklists, flights, peak advisories |
| `/logbook` | **The archive.** Wrapped trips index, the full lifetime atlas with the animated scratch-map, year-by-year Wrapped recaps. Read-only. | trips (wrapped), travel stats, visited |
| `/trips/[id]` | **Trip workspace** — a tabbed hub (Overview / Flights / Briefing / Documents / Packing) instead of one long scroll. Threat dial, destinations, flights + layover analysis, trip-limits card (tightest carry-on/lithium/liquids across carriers), auto-generated briefing per destination, documents checklist, packing list. | trips, destinations, flights, airline rules, dossier, intel, practical, visa, exchange rates |
| `/disclosure` | **SF-86-style export.** 7-year rolling window, per-country day totals, Schengen 90/180. Markdown + JSON download. | trips, destinations |

### Country intelligence

| Route | What it does | Pulls from |
|---|---|---|
| `/countries` | **Browser.** 250-country index with filter chips by region + advisory threshold. Each row shows the peak advisory dot + level chip. Deep-link `?advisory=N`. | country_profiles, peak advisories |
| `/countries/[code]` | **Full dossier.** Editorial Fraunces header (flag, name, region, population, coordinates) → multi-source advisories stack → indices grid (CPI, RSF, visa-free reach) → at-a-glance facts → money / languages / time zones / neighbors / arrival / airports → privacy posture → CIA Factbook accordion (Government / Economy / People / Comms / Transport / Military). | every dossier table |

### Map & field

| Route | What it does | Pulls from |
|---|---|---|
| `/map` | **Offline-first OSINT map.** Renders air-gapped by default on a committed PMTiles world basemap (Natural Earth, z0–6); drop a regional `.pmtiles` street pack into `data/bundles/maps/` + register it ("Map packs" dialog) for full street detail in that region. Opt-in layers on top: detailed online tiles (CARTO), satellite (NASA GIBS), radar (RainViewer), aircraft (ADS-B), earthquakes (USGS), disasters (GDACS), surveillance cameras (OSM Overpass). **Draw route** mode (SDR / extraction / variation / normal) reuses the offline waypoint planner — great-circle metrics, saved to `saved_routes` locally, nothing sent anywhere. Click-to-place rally points. | destinations, sightings, rally points, saved routes + opt-in overlays |
| `/surveillance` | **TEDD-principle counter-surveillance log.** Sightings + repeat-pattern detection + rally-point manager. | counter_surveillance_log, rally_points |

### Vault & settings

| Route | What it does | Pulls from |
|---|---|---|
| `/vault` | **Encrypted document store.** Passphrase unlock (Argon2id KDF, in-memory only) → list with categories → upload/download/delete. Locked titles render as redaction bars; unlock sweeps them away. | vault_docs |
| `/settings` | Units, locale, home country, passport country, **per-connection toggles** (one switch per external API, OFF by default), master "Fully offline" switch. | settings, api_toggles |
| `/settings/data` | **Local data management.** JSON export + import + wipe. | settings |
| `/about/data-sources` | **Attributions page.** Every bundled dataset and every optional connection with license + URL + row count + last-updated. | data_sources |

### Tools index

| Route | What it does |
|---|---|
| `/tools` | Workflow-grouped index of the 17 individual tools below. |

---

## Tools — what each computes locally

All tools are server-rendered + run computation locally. Anything that needs a live connection clearly labels it; everything else has the "Offline" tag.

| Tool | Route | What it computes | Mode |
|---|---|---|---|
| **Airports** | `/tools/airports` | Search ~45k airports by IATA / ICAO / name. Nearest scheduled airports with bearing + dispersion (egress check). Country filters. | Offline |
| **Visa matrix** | `/tools/visa` | Your passport → any destination from the offline ilyankou matrix. Schengen 90/180 calculator. Passport-validity-rule check. | Offline |
| **Weather** | `/tools/weather` | 7-day Open-Meteo forecast + go/no-go signal (heat, UV, photography light). | Live opt-in |
| **Currency** | `/tools/currency` | Live (cached) rate, per-diem math, channel-cost variance (ATM vs cash vs XE). | Live opt-in |
| **Packing library** | `/tools/packing` | Filterable explorer over the 50 bundled packing templates (climate / activity / threat tier). The *trip-aware* persistent list lives on the trip detail page. | Offline |
| **Border crossing** | `/tools/border` | Device-prep exposure score by destination + status + threat → before / at / after checklist. | Offline |
| **Hotel & room security** | `/tools/hotel` | Room-selection scorecard (executive-protection tradecraft) + on-arrival walkthrough + front-desk request script. | Offline |
| **Data footprint of flying** | `/tools/flying` | What API/PNR/EU EES/ETIAS/US biometric/transit systems capture when you fly. Reference + per-route exposure. | Offline |
| **EXIF stripper** | `/tools/exif` | Drag-and-drop GPS / device-fingerprint / timestamp removal. Browser-only — no upload. | Offline (client-only) |
| **Self-doxxing audit** | `/tools/self-doxxing` | Generates copy-ready OSINT queries (name / email / phone / username / reverse-image) + broker opt-out tracker. Doesn't search anything — shows you what to check in private. | Offline |
| **Threat-model wizard** | `/tools/threat-model` | Device OS + risk tier → prioritized, evidence-cited signature-reduction plan (IMSI/2G, Wi-Fi/BLE fingerprinting, ALPR, BLE trackers, face recognition, Faraday). | Offline |
| **Bluetooth tracker defense** | `/tools/ble-tracker` | Find an unwanted AirTag / Tile / SmartTag — per-platform detection, interactive physical-sweep checklist, safety-first guidance (DULT / CDC NISVS). | Offline |
| **Route planner (SDR / egress)** | `/tools/route-planner` | Draw surveillance-detection, extraction & variation routes; on-device length + deviation-ratio scoring; routes persist locally. | Offline |
| **Verify & protect sources** | `/tools/verify` | SIFT + lateral-reading checklist, image/video verification steps, and source-protection playbooks (SecureDrop/GlobaLeaks, border-device prep). | Offline |
| **Image fingerprint** | `/tools/image-hash` | Perceptual hash (aHash + dHash) to detect near-duplicate / recycled images; compare two images for a Hamming-distance verdict. In-browser; images never leave the machine. | Offline (client-only) |
| **Chronolocation lab** | `/tools/chrono` | Date and place a daytime photo from its shadows — sun azimuth/altitude + reverse time-of-day (Bellingcat method, NOAA/Meeus solar math). | Offline |
| **Emergency card** | `/tools/emergency` | Per-country emergency numbers + first-actions + a printable panic card, from bundled data. | Offline |

> The country dossier (`/countries/[code]`) also surfaces the open-methodology **Greyline Risk Score** and a **road-safety** panel (road crashes are the leading cause of traveller injury death — CDC Yellow Book). `/disclosure` adds a **pattern-of-life self-audit** (de Montjoye unicity). `/surveillance` runs the **TEDD** scorer. `/map` draws **CCTV/ALPR coverage cones**.

---

## Auto-generated trip kit

The biggest piece of the recent build: **every tool's output is auto-baked into every trip.** Open `/trips/[id]` and Greyline assembles, server-side, from the trip's destinations + threat tier + flights:

### 1. Briefing (per destination)
- **Advisories** — every source we have for that country, colour-keyed Level 1..4, summary, last-updated, deep-link.
- **Entry & cash** — visa requirement from your home passport → that country, cash declaration threshold, exchange rate if the connector is on.
- **Posture** — VPN / SIM-registration / device-unlock-compulsion / LGBTQ+ legal risk / photography legality (from `country_intel`).
- **Practical** — emergency numbers, plug types + voltage + driving side.
- **Airports** — nearest scheduled airports by IATA/ICAO.
- **Pre-departure checklist** — auto-generated bullets (apply for KR e-Visa, carry IDP for Italy, declare cash > USD 10,000 for US, etc.).

### 2. Flights & layovers
- **Flights editor** — add carrier IATA, flight number, dep/arr IATA + times, seat, status (planned / booked / flown / cancelled).
- **Inline carry-on chip** per flight — when the carrier IATA is known, the row shows that carrier's cabin dimensions inline.
- **Layover analysis** — detects tight (< 60 min), overnight, and misroute (arrival ≠ next departure) connections. Enriches each layover with transit country, transit-visa requirement (your passport → that country), peak advisory, and posture flags (SIM registration, device unlock, APIS/PNR).
- **Route exposure score** — single number rolling everything up.
- **Trip limits card** — most-restrictive carry-on dims, weight, liquids ml, lithium Wh across every carrier on the trip, with the source carrier called out.

### 3. Documents
Auto-generated from `document_templates`:
- **Universal** — passport ≥ 6 months past departure, 2 blank pages, onward ticket, proof of funds, insurance card, emergency contact, vaccination card, license + IDP, prescription letter.
- **Country-specific** — ESTA (US), ETIAS (Schengen), UK ETA, AU ETA, K-ETA, NZeTA, Canadian eTA, India / Türkiye / Egypt e-Visa; yellow fever for Kenya / Uganda / Tanzania / Ghana / Brazil / Peru; insurance proof for Cuba / Schengen visa applicants; IDP requirement for Japan / Korea / Italy / Greece / Australia; cash declarations for US / EU / UK.
- **Check-state persisted** locally via the existing `checklists` table.

### 4. Packing
Auto-generated from `packing_templates` filtered by climate (inferred from destination latitude band), activity tags, threat tier, and country-specific items. 50 items across documents / money / electronics / OPSEC / clothing / health / ground. Each item has a "rationale chip" telling you *why* it showed up (e.g. "tropical · hike · tier ≥ 2"). Source URLs on every item (REI, FAA, EFF SSD, AAA, CDC). Check-state persisted.

### 5. OPSEC
50 templates across four phases — **pre-trip / border / during / post-trip** — threat-tiered and cited (EFF SSD, CPJ, GIJN, CBP Directive 3340-049A, UK Schedule 7, FAA, HIBP). The trip's threat dial selects which items apply.

---

## Data layer — every table, every bundle

### Schema (SQLite, 16 migrations)

| Table | Purpose | Size |
|---|---|---|
| `settings` | User preferences + master offline switch | ~10 rows |
| `api_toggles` | Per-connector enable + use-Tor flag | 9 rows |
| `api_cache` | Server-proxied response cache with TTL | grows |
| `data_sources` | Attribution registry — every bundled dataset's name, license, URL, row count, downloaded_at | ~12 rows |
| `offline_bundles` | Registered offline map bundles — the committed world basemap + any regional `.pmtiles` street packs dropped into `data/bundles/maps/` (type, region, path, size, checksum). Served range-aware at `app/api/tiles/[id]`. | user + 1 |
| `trips` | User-created trips (name, status, dates, date_precision, notes) | user |
| `destinations` | Per-trip stops (country, city, lat/lng, dates, sort_order) | user |
| `trip_flights` | Flights belonging to a trip (carrier_iata, flight_number, dep/arr IATA + times, seat, status) | user |
| `checklists` | Generic checklist rows (type='packing' / 'documents' / 'opsec' / custom), items JSON | user |
| `threat_models` | Per-trip wizard answers + computed level (routine / elevated / high / extreme) | user |
| `incident_log` | Trip-scoped events (border / surveillance / theft / detention / other) | user |
| `counter_surveillance_log` | TEDD-principle sightings + repeat detection | user |
| `rally_points` | Named safe locations with lat/lng | user |
| `vault_docs` | Encrypted document records (filename, mime, size, ciphertext, nonce, tag) | user |
| `country_profiles` | REST Countries JSON per country (name, region, capital, currencies, languages, borders, flags, timezones) | ~250 rows |
| `country_intel` | **Curated** privacy/security per country — freedom score, advisory level, VPN legality, decryption compulsion, SIM registration, GDPR adequacy, LGBTQ+ risk, photography legality, APIS/PNR note, biometric entry note | ~150 rows |
| `country_practical` | Emergency numbers (JSON), plug types, voltage, frequency, driving side, IDP required, cash declaration threshold | ~250 rows |
| `country_indices` | Comparable indices: Corruption Perceptions Index, RSF Press Freedom score + rank, visa-free destination count for that passport | ~250 rows |
| `country_advisories` | Multi-source travel advisories — one row per (iso2, source). Sources today: `us_state`, `uk_fcdo` | ~400 rows |
| `country_factbook` | Full CIA World Factbook JSON per country (~10–20 KB each) | ~236 rows |
| `airports` | OurAirports master — IATA / ICAO / name / coords / runway / scheduled flag | ~45,000 |
| `visas` | Passport × destination matrix from ilyankou/passport-index-dataset | ~50,000 rows |
| `packing_templates` | 50 packing items tagged by category / climate / activity / threat tier / iso2 | 50 |
| `airline_rules` | Cabin / personal / checked / liquids / lithium per IATA carrier | 24 |
| `opsec_templates` | OPSEC items by phase, threat tier, category, with source URLs | 50 |
| `document_templates` | Universal + per-country docs with fee / processing / when-required + source URL | 39 |

### Bundled datasets

Every dataset Greyline ships **runs offline**. Sources:

| Dataset | Source | License | Size |
|---|---|---|---|
| Country profiles | [REST Countries](https://restcountries.com) | MPL-2.0 (data) | ~1.5 MB |
| Country intel (curated) | EFF SSD, Freedom House, CPJ, government legal references | CC-BY where applicable | ~80 KB |
| Country practical | Curated (emergency numbers, electrical standards, driving) | Public-domain facts | ~30 KB |
| Indices — CPI | [Transparency International via OWID](https://ourworldindata.org/grapher/ti-corruption-perception-index) | CC-BY 4.0 | ~50 KB |
| Indices — RSF | [Reporters Without Borders via OWID](https://ourworldindata.org/grapher/press-freedom-index-rsf) | CC-BY 4.0 | ~30 KB |
| Indices — visa-free | computed from the visas matrix | derived (MIT) | tiny |
| CIA World Factbook | [factbook/factbook.json](https://github.com/factbook/factbook.json) | Public domain | ~3 MB |
| Airports | [OurAirports CSV](https://davidmegginson.github.io/ourairports-data/airports.csv) | Public domain | ~7 MB |
| Visa matrix | [ilyankou/passport-index-dataset](https://github.com/ilyankou/passport-index-dataset) | MIT | ~1.5 MB |
| Natural Earth (map) | [Natural Earth](https://www.naturalearthdata.com/) — 1:110m countries GeoJSON (scratch-map) + the committed `public/geo/world.pmtiles` z0–6 vector world basemap | Public domain | ~2.6 MB |
| Packing / OPSEC / airline / docs templates | Curated from EFF SSD, REI, FAA 49 CFR 175.10, IATA, CBP / UK FCDO / AAA / CDC | AGPL-3.0 | ~60 KB |

The full registry is queryable at `/about/data-sources`.

---

## Build scripts — how the bundles get there

Run any time. All idempotent (upsert).

| Command | What it does | Time |
|---|---|---|
| `pnpm setup` | install + migrate + seed | ~30s |
| `pnpm migrate` | apply DB migrations | <1s |
| `pnpm seed` | seed default settings + toggles | <1s |
| `pnpm build:countries` | fetch REST Countries → upsert ~250 country profiles | ~10s |
| `pnpm build:data` | fetch OurAirports + visa matrix → upsert ~45k airports + 50k visa rows | ~30s |
| `pnpm build:dossier` | fetch OWID CPI + RSF, compute visa-free counts, fetch factbook per country | ~60s |
| `pnpm build:advisories` | fetch US State Dept + UK FCDO advisories, upsert into `country_advisories` | ~40s |
| `pnpm build:trip-data` | seed packing / airline / OPSEC / documents from `data/templates/*.json` | <1s |
| `pnpm build:tiles` | (maintainer-only; requires the `tippecanoe` binary) builds the committed `public/geo/world.pmtiles` world basemap from Natural Earth. Not run in CI. | ~30s |
| `pnpm typecheck` | `tsc --noEmit` | ~5s |
| `pnpm lint` | ESLint | ~5s |
| `pnpm e2e` | build + Playwright | ~90s |

All build scripts temporarily enable the API toggles they need (and restore the prior state afterward), so they work even on a fresh install with everything off.

---

## External connectors

**Every connector is OFF by default.** Each is a discrete toggle in the Settings → Connections hub, grouped under **Travel intelligence** (weather, exchange rates, US/UK advisories) and **Live map layers** (geocoding, OSM POIs, ADS-B, earthquakes, disasters). A master "Fully offline" switch blocks them all instantly. (The orphaned `gdelt` and the HTTP-only `ip-api` connectors were pruned in migration 016.)

When enabled, requests go through `server/services/api-gateway.ts`, which:

- checks the master offline switch + the per-API toggle,
- strips `User-Agent` (replaces with a generic `Greyline/1.0` identifier where the upstream requires one — Nominatim / Overpass / gov.uk),
- caches responses in `api_cache` with a per-call TTL,
- never accepts cookies, never sets `Authorization` headers (no API keys exist).

| `api_id` | Source host | What it returns | Used by |
|---|---|---|---|
| `open-meteo` | `api.open-meteo.com` | Hourly + daily forecast for coords | `/tools/weather`, trip briefing weather column |
| `exchange-rates` | `cdn.jsdelivr.net` (fawazahmed0) | 150+ currency rates, base-relative | `/tools/currency`, trip briefing rate row |
| `travel-advisory` | `cadataapi.state.gov` | US State Department advisories | `country_advisories.source='us_state'` |
| `uk-fcdo` | `www.gov.uk` (Content API) | UK Foreign Office travel advice with structured `alert_status` | `country_advisories.source='uk_fcdo'` |
| `nominatim` | `nominatim.openstreetmap.org` | Geocoding + reverse | place picker |
| `overpass` | `overpass-api.de` | OSM POI queries (cameras, embassies, hospitals) | `/map` camera layer |
| `adsb` | `api.adsb.lol` | Live ADS-B aircraft positions | `/map` aircraft layer |
| `usgs` | `earthquake.usgs.gov` | M2.5+ earthquakes past day | `/map` quakes layer |
| `gdacs` | `www.gdacs.org` | Global disaster alerts (cyclone / flood / volcano / wildfire) | `/map` disasters layer |

The `/map` page renders offline by default from the committed PMTiles world basemap (and any registered street packs, streamed by the local range-aware `app/api/tiles/[id]` route). Only its **opt-in online layers** fetch **map tiles directly from the browser** (no proxy) — detailed CARTO tiles, NASA GIBS satellite, RainViewer radar. Those hosts are explicitly allow-listed in the CSP `img-src` + `connect-src` (because MapLibre v5 uses `fetch()` for tiles, not `<img>`). Documented in `next.config.ts`.

No API keys are required for any connector. They're all free and open. Where a provider requires a User-Agent (Nominatim / Overpass usage policy), Greyline sends `Greyline/1.0 (privacy-first local travel app; self-hosted)` — the software name only, never the user.

---

## Cyber & posture analysis

Greyline aims for a **local-first, minimal-attack-surface, defense-in-depth** posture. This section is the honest version — what's protected, what's not, what an attacker can still see.

### Threat model

| Threat | Mitigation |
|---|---|
| **Network adversary** (Wi-Fi sniffer, ISP, captive portal) | Greyline makes no outbound calls unless you toggle one on; when toggled on, all requests go through the local proxy with a generic UA, no cookies, no auth headers. Master "Fully offline" switch hard-blocks every connector. |
| **Web tracker / ad-tech** | Zero analytics, zero third-party scripts, zero remote fonts (Fraunces is bundled locally). CSP `default-src 'self'`. |
| **Compromised browser tab / extension** | App is loopback-only (`127.0.0.1:3000`) so external pages can't reach it (no DNS rebinding because there's no public hostname); `X-Frame-Options: DENY` + `frame-ancestors 'none'` block iframe embedding; `Permissions-Policy` denies camera / mic / geolocation / payment / USB / Bluetooth / serial / topics / cohort. |
| **MITM on optional connectors** | All external calls upgrade-insecure-requests + use HTTPS endpoints. Tiles are CSP-pinned to known hosts. |
| **Data exfiltration via misconfigured site** | CSP `default-src 'self'`, `object-src 'none'`, `base-uri 'self'`, `form-action 'self'`, `frame-ancestors 'none'`. RSC streaming requires `'unsafe-inline'` on `script-src` (Next 15+/16 limitation — upgrade path: nonce-based CSP via middleware, on the roadmap). |
| **Encrypted vault contents at rest** | AES-256-GCM, per-doc 12-byte nonce, 16-byte auth tag. Key derived via **Argon2id** (64 MiB / 3 iterations / 4 lanes parallelism). Passphrase never stored — only an Argon2id-derived verifier on disk. |
| **Vault passphrase brute force** | Argon2id parameters are tuned to roughly 1s per attempt on modern hardware. No recovery mode by design. |
| **Disk forensics on the rest of the DB** | The travel log itself is in **plaintext SQLite**. Anyone with disk access reads every trip. *This is a known gap — see "What's not protected" below.* |
| **Supply-chain via dependencies** | Pinned versions; small set of well-known maintainers; CI runs `gitleaks` before every commit; Dependabot weekly grouped updates. AGPL-3.0 forces forks to publish modifications. |
| **OS-level compromise** | Out of scope. Greyline trusts the OS it runs on — same trust model as any local app. Recommendation: run inside a fresh user account / VM / container if you operate at that threat tier. |

### Security headers shipped (`next.config.ts`)

```
Strict-Transport-Security: max-age=63072000; includeSubDomains; preload
X-Content-Type-Options: nosniff
X-Frame-Options: DENY
Referrer-Policy: no-referrer
Cross-Origin-Opener-Policy: same-origin
Cross-Origin-Resource-Policy: same-origin
Permissions-Policy: camera=() microphone=() geolocation=() payment=() usb=()
                    bluetooth=() serial=() browsing-topics=() interest-cohort=()
Content-Security-Policy:
  default-src 'self';
  script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval';
  worker-src 'self' blob:;
  style-src 'self' 'unsafe-inline';
  img-src 'self' data: blob:
          https://*.basemaps.cartocdn.com
          https://tilecache.rainviewer.com
          https://gibs.earthdata.nasa.gov;
  font-src 'self';
  connect-src 'self'
          https://*.basemaps.cartocdn.com
          https://tilecache.rainviewer.com
          https://gibs.earthdata.nasa.gov
          https://api.rainviewer.com;
  object-src 'none';
  base-uri 'self';
  form-action 'self';
  frame-ancestors 'none';
  upgrade-insecure-requests;
```

### What's protected

- **Vault contents** — AES-256-GCM + Argon2id.
- **Network egress** — opt-in per connector, master kill switch, cached + cleaned at the proxy.
- **Telemetry** — none. No analytics, no error reporting, no remote fonts, no images from third parties (except map tiles when `/map` is loaded).
- **Identity at upstream APIs** — generic UA, no cookies, no auth, no referrer.
- **Site-level XSS** — CSP enforces same-origin scripts (with the noted `'unsafe-inline'` caveat).
- **Error-message leakage** — every API route returns a standardized generic error envelope (`{ ok: false, error }`); the real exception is logged server-side, never sent to the client, so SQL fragments / file paths / upstream URLs can't leak.
- **Clickjacking / iframe attacks** — `frame-ancestors 'none'`.
- **Permission surface** — every browser permission API is denied (`Permissions-Policy`).
- **Data destruction** — `rm -rf data/` is *the* delete. There is no copy elsewhere.

### What's not protected (be honest)

- **Plaintext SQLite for the travel log itself.** Trips, destinations, intel, advisories, and dossier rows are queryable by anyone with read access to the file. Only the vault is encrypted. *Mitigation today: run on a FileVault / BitLocker / LUKS volume. Roadmap: optional at-rest encryption for the whole DB via SQLite Multiple Ciphers.*
- **Vault passphrase lives in browser memory while unlocked.** A RAM-dump of the unlocked tab recovers the key. Lock the vault when you're done.
- **Single-factor vault.** No hardware-key second factor yet (Yubikey + WebAuthn is on the roadmap).
- **No anti-forensic / duress passphrase.** A second-passphrase plausible-deniability volume is on the roadmap.
- **`'unsafe-inline'` on `script-src`.** Required by Next 16's RSC streaming. The upgrade path is nonce-based CSP via middleware — not a fundamental blocker, just hasn't been built yet.
- **Opt-in online map tiles are CSP-allow-listed.** `/map` is air-gapped by default (committed PMTiles world basemap + optional regional street packs). Only if you *enable* an online layer (detailed CARTO tiles / GIBS satellite / RainViewer radar) does the browser reveal to that host that *some* client fetched its tiles (IP + timing). The base map — and the rest of the app — stays fully offline.
- **No Tor proxy yet.** Each `api_toggles` row has a `use_tor` flag, but no SOCKS proxy is wired through. Roadmap.
- **No tamper-evident logging.** The incident log is regular SQLite; an attacker who edits the DB can rewrite history. Roadmap: Merkle-chained log rows.
- **Self-doxxing tool generates queries you can paste into public search engines.** That's by design — you copy them and run them against the engine of your choice — but the resulting searches are not anonymous unless you take care.

### Defense in depth: the layers

1. **Don't talk** — no connector enabled = no outbound traffic.
2. **Talk minimally** — when enabled, proxy strips identifying headers, caches aggressively.
3. **Talk over CSP** — every external host is allow-listed; default-deny.
4. **Encrypt where it matters** — vault is AES-256-GCM + Argon2id.
5. **Don't run as root** — Docker image runs as uid 1001, non-root user with no shell.
6. **Make the supply chain auditable** — pinned versions, Dependabot, gitleaks, AGPL-3.0.
7. **Make the user's exit clean** — `rm -rf data/` is the entire delete operation.

---

## Tech stack

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack, standalone output) | One process; server components read SQLite directly; route handlers for the local APIs. |
| UI | **React 19** + **shadcn/ui** (Radix primitives, vendored under `components/ui/`) | Vendored — no design lock-in, full control. |
| Styling | **Tailwind CSS 4** + OKLCH design tokens + `@plugin "@tailwindcss/typography"` | "Oak & Gold" palette (deep oak-green + gold spark) + warm-neutral stone surfaces. Dark by default. Editorial Fraunces + JetBrains-ish mono pairing. |
| Motion | **motion** (Matt Perry's post-Framer fork) + `lib/motion.ts` token system | Single source of truth for durations + easings; honors `prefers-reduced-motion`. View Transitions API used for `/countries` → `/countries/[code]`. |
| Maps | **MapLibre GL JS v5** + the `pmtiles` protocol + bundled Natural Earth | Offline scratch-map on `/`, `/trips`, `/logbook`. `/map` renders air-gapped on a committed PMTiles world basemap (`public/geo/world.pmtiles`); regional street packs and online tiles (CARTO / GIBS / RainViewer) are opt-in on top. |
| DB | **better-sqlite3** in WAL mode | One file. Zero config. Backup = copy a file. Native addon, marked as `serverExternalPackages`. |
| Vault crypto | **AES-256-GCM** (Node `crypto`) + **Argon2id** (`argon2` package) | 256-bit AEAD; memory-hard KDF tuned to ~1s per attempt. |
| Form runtime | Zod absent — small hand-rolled validators in `/api/*` route handlers. | Keeps surface tiny. |
| Type system | **TypeScript** strict mode, `tsc --noEmit` in CI | No `any` in app code. |
| Process | **One Node process** | No daemons, no background workers, no cron. Server components do reads at request time. |
| License | **AGPL-3.0-only** | Copyleft — forks must stay open. |

---

## Project layout

```
greyline/
├── app/                              Next.js App Router
│   ├── page.tsx                      cockpit home (research-backed)
│   ├── trips/                        planning + active list, detail
│   ├── logbook/                      lifetime archive + atlas
│   ├── countries/                    browser + per-country dossier
│   ├── map/                          online OSINT map
│   ├── surveillance/                 counter-surveillance log
│   ├── tools/                        10 tools
│   ├── vault/                        encrypted document vault
│   ├── settings/                     connections + preferences + data
│   ├── disclosure/                   SF-86-style 7-year export
│   ├── about/data-sources/           attributions
│   ├── api/                          32+ route handlers
│   ├── loading.tsx                   shared skeleton
│   └── error.tsx                     client error boundary
├── components/
│   ├── ui/                           shadcn primitives (vendored)
│   ├── travel/                       world-map, atlas, wrapped
│   ├── trip/                         planning-list, trip-briefing,
│   │                                 flights-editor, itinerary-panel,
│   │                                 trip-limits, trip-packing, trip-documents
│   ├── intel/                        advisory-stack, indices-grid,
│   │                                 factbook-panel, privacy-posture
│   ├── countries/                    countries-browser (advisory filter)
│   ├── tools/                        packing-explorer, exif-stripper, …
│   ├── map/                          map-view (online OSINT)
│   ├── vault/                        vault-client (redaction sweep)
│   ├── shell/                        sidebar, top-bar, page-transition
│   └── …
├── lib/
│   ├── motion.ts                     motion tokens (single source)
│   ├── nav.ts                        sidebar definition
│   ├── trip-kit.ts                   packing / docs / airline aggregators
│   ├── trip-briefing.ts              per-destination briefing payload
│   ├── itinerary.ts                  layover detection + enrichment
│   ├── opsec.ts                      OPSEC template lookups (lib-side)
│   ├── countries.ts                  REST Countries normalizers
│   ├── disclosure.ts                 SF-86 7-year window
│   ├── on-this-day.ts                anniversary computation
│   └── …
├── server/
│   ├── db/
│   │   ├── index.ts                  better-sqlite3 connection
│   │   ├── migrations/               16 SQL migrations
│   │   └── repositories/             trip, flight, dossier, templates,
│   │                                 knowledge, intel, airports, settings,
│   │                                 vault, threat, checklist, travel, …
│   ├── services/
│   │   ├── api-gateway.ts            proxyFetch with toggle + cache + UA strip
│   │   ├── vault.ts                  encrypt / decrypt + KDF
│   │   └── exif.ts
│   ├── crypto/                       AES-GCM, Argon2id wrappers
│   └── api-clients/                  open-meteo, exchange-rates,
│                                      travel-advisory, advisories-multi,
│                                      nominatim, overpass,
│                                      adsb, gdacs
├── scripts/
│   ├── migrate.ts                    apply migrations
│   ├── seed-db.ts                    seed default toggles + settings
│   ├── build-country-data.ts         REST Countries upsert
│   ├── build-data.ts                 OurAirports + visa matrix upsert
│   ├── build-dossier.ts              CPI + RSF + visa-free + factbook
│   ├── build-advisories.ts           multi-source advisory aggregator
│   └── build-trip-data.ts            packing / airlines / opsec / docs
├── data/
│   ├── greyline.db                   SQLite (gitignored)
│   ├── greyline.db-wal
│   ├── greyline.db-shm
│   ├── vault/                        encrypted docs
│   └── templates/                    packing.json, airlines.json,
│                                      opsec.json, documents.json (tracked)
├── research/                         cited research corpus (10 reports + 47-source home study)
├── public/geo/                       Natural Earth countries-110m.geojson
├── e2e/                              Playwright specs (incl. axe a11y sweep)
├── next.config.ts                    security headers + standalone output
├── docker-compose.yml                loopback-only port mapping
├── Dockerfile                        multi-stage, non-root, healthcheck
└── .github/workflows/ci.yml          lint + typecheck + build + e2e
```

---

## All commands

| Command | What it does |
|---|---|
| `pnpm setup` | Install + migrate + seed (first-time) |
| `pnpm dev` | Next dev server on :3000 |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build (use `node .next/standalone/server.js` for standalone) |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm migrate` | Apply DB migrations |
| `pnpm seed` | Seed default settings + toggles |
| `pnpm build:countries` | Bundle the ~250 country profiles |
| `pnpm build:data` | Build airports + visa matrix |
| `pnpm build:dossier` | Build CPI + RSF + visa-free + factbook |
| `pnpm build:advisories` | Fetch US + UK advisories |
| `pnpm build:trip-data` | Seed packing / airline / OPSEC / docs templates |
| `pnpm e2e` | Build + Playwright e2e |
| `pnpm e2e:headed` | Playwright headed (debug) |

---

## What could be coming soon

These are concrete, scoped extensions — every one is something we already have the data layer or schema column for. None of them require new dependencies.

### Security & posture
- **Nonce-based CSP** via middleware to drop the `'unsafe-inline'` on `script-src`.
- **Tor SOCKS proxy** wired through to the existing `use_tor` flag on every `api_toggles` row.
- **SQLite-level at-rest encryption** for the whole DB (SQLite Multiple Ciphers / SEE), so the travel log itself is opaque to disk forensics.
- **Plausible-deniability vault** — a second passphrase that opens a different volume; gives a credible "I unlocked it, there's nothing in there" answer at borders.
- **Yubikey / WebAuthn 2FA on the vault** — second factor on top of the passphrase.
- **Tamper-evident incident log** — Merkle-chained rows; any edit invalidates the chain.
- **Wipe-on-duress passphrase** — typing a designated phrase irreversibly destroys the vault.

### Data layer
- **AU Smartraveller + CA Global Affairs + DE Auswärtiges Amt + FR France-Diplomatie** advisory aggregators. Same schema, more sources per country.
- **Fragile States Index + Global Peace Index + Freedom in the World** added to `country_indices` (CSVs already identified in the dossier research).
- **WHO Yellow Fever bulk dataset** to replace the curated subset in `document_templates`.
- **AAA IDP country list** in full — currently 5 example countries.
- **OurAirports runways + frequencies tables** so airport tools can show ILS / runway-length / pattern info.
- **OpenStreetMap embassy + hospital POIs** baked into per-country dossiers (currently only fetched live in `/map`).

### Trip kit
- **Per-trip packing custom items** — let the user add to the auto-generated list and persist them.
- **Document scanning into the vault** — drag a passport PDF and it goes straight to vault as `category='passport'` (currently manual upload).
- **Per-flight seat-map heuristics** — emergency-row / over-wing / lavatory-adjacency from carrier metadata.
- **Itinerary import** — TripIt-style ICS + email parsing to auto-create flights + destinations.
- **Layover dining / lounge data** — when carriers offer lounge access on the trip's status.
- **Climate calendars** — best-time-to-visit + monsoon windows from open climate data.

### Map & field
- **Offline maps + offline routing — shipped.** `/map` renders air-gapped on the committed PMTiles world basemap; regional `.pmtiles` street packs add street detail; the offline waypoint planner draws SDR / extraction / variation routes with great-circle metrics. (Whole-world *street-level* offline isn't feasible — that's what the regional packs cover. Online turn-by-turn directions are intentionally NOT offered: sending waypoints to a routing service would leak your planned movements, a misfeature for a counter-surveillance tool.)
- **Surveillance heatmap** — density layer generated from OSM cameras across destination cities.
- **Drone route avoidance** — OpenDroneID feed overlay.
- **ADS-B route reconstruction** — given a trip's flight numbers, replay the historical ADS-B trail from the trip ledger.
- **Photo geofence sanity check** — given a photo's EXIF and your itinerary, flag inconsistencies before you share.

### UX & build
- **Native shell** (Tauri or Electron-lite) with a system-tray launcher and FileVault-style at-rest disk locking on close.
- **Local-only AI assistant** (`llama.cpp` quantized 7B) for itinerary review + briefing summarization — model runs in-process, never leaves the machine.
- **Mobile companion** as a PWA first, native shell second.
- **Signed disclosure-grade PDF export** for SF-86-equivalent foreign-travel reporting.
- **Air-gap export** — single signed ZIP to USB, including the vault, the travel log, and the dossier snapshots.
- **Wrapped → MP4** — auto-render a private year-in-review video from the trip ledger.
- **Trip planning AI assistant** that watches your dossier + draft itinerary and surfaces "what you've forgotten" (consular notification, vaccination boosters, currency declaration thresholds).

Most of these are 1–3 day extensions on top of the existing architecture.

---

## License

[AGPL-3.0](LICENSE). If you fork and distribute, your modifications stay open — no closed, hosted, telemetry-laden Greyline can be made from this code.

If you're packaging or redistributing, see `NOTICE` and `THIRD_PARTY_LICENSES.md` for required attributions (REST Countries / MPL-2.0, OurAirports / public domain, passport-index-dataset / MIT, Natural Earth / public domain, OWID / CC-BY 4.0, factbook.json / public domain).

Security disclosures: see [`SECURITY.md`](SECURITY.md).
