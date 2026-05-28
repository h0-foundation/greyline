# Greyline

**Your private lifetime travel log — kept, mapped, and explained on your own machine. Nothing leaves it.**

Greyline is a local-only, offline-first travel app for people who want a complete, durable record of every trip they've ever taken — and a calm way to plan the ones still ahead — without handing that history to anyone else.

No accounts. No cloud. No telemetry. One folder of files on your computer, and one app you control.

---

## Why this exists

Every existing travel app wants to be the place your itinerary lives. They have to — the data is the product. But your **lifetime movement history** is the single richest piece of personal information you produce, and the consequences of it leaking (or being mined, or quietly profiled, or one day subpoenaed) are real.

Greyline takes the opposite stance:

- **Your whole travel life, in one private record.** Every trip you've taken, every country day-counted, every passport you've held — kept locally, exportable on demand, deletable at will.
- **SF-86-grade rigor, civilian-useful.** The same disclosure logic the U.S. government uses for foreign-travel reporting (the 7-year rolling window, per-country day totals, residency, Schengen 90/180) — without ever calling it "SF-86." For most people it's just *"the record I'd want if I ever had to remember exactly where I was."*
- **Decision tools, not engagement loops.** Visa eligibility, weather-as-go/no-go, currency, country briefings, hotel-room security, border device-prep, EXIF stripping, self-doxxing audits — all computed locally from bundled data.
- **A map of you, only for you.** A hero scratch-map fills in every country you've been — fully offline, click any country for its briefing, export the whole thing as a PNG.

Built for journalists, frequent travelers, security-minded professionals, people with public profiles, dual citizens, and anyone who would rather not feed their movement history to ad-tech. AGPL-3.0 — you can read every line of code that touches your data.

---

## Quick start

```bash
# 1. clone, install, create the local SQLite db, seed default settings
git clone https://github.com/h0-foundation/greyline.git
cd greyline
pnpm setup

# 2. (optional) bundle 250 country profiles for the briefings
pnpm build:countries

# 3. run it
pnpm dev
```

Open **http://localhost:3000**. That's it.

`Ctrl+C` to stop. Your data lives in `data/` and persists between sessions; next time, just `pnpm dev` again.

**Prefer a production build?** `pnpm build && pnpm start` — same port, faster, no hot reload.

**Prefer Docker?** `docker compose up -d` — exposes the app at **http://localhost:3000** (loopback-only). Your `data/` is volume-mounted, so it survives container restarts.

---

## What's in it

**24 pages, 32 local API routes**, all rendering at request time from local SQLite. Every external network call is **off by default** and goes through a local proxy you control.

### The lifetime record
- **Dashboard** — scratch-map + lifetime stats (countries · % of world · days · continents), most-recent trip, privacy posture, OPSEC readiness.
- **Trips atlas** (`/trips`) — full-width animated scratch-map, year-by-year days bar, "On this day," Greyline Wrapped per-year recaps, passport-stamp wall, the full lifetime trip ledger.
- **Trip detail** — destinations, threat model (assets · adversaries · capability · consequence), destination-aware OPSEC checklists with readiness scoring.
- **Countries** — searchable 250-country directory + per-country briefing (capital · currencies · languages · timezones · neighbors · airports · emergency numbers · power specs · privacy posture).
- **Vault** — AES-256-GCM encrypted document store, passphrase-protected (Argon2id KDF). No recovery — by design.
- **Map** — offline MapLibre OSINT map with destinations, rally points, surveillance sightings, plus optional layers (GDACS disasters, USGS earthquakes, OSM cameras, live ADS-B).
- **Surveillance** — TEDD-principle counter-surveillance log with repeat-pattern detection + rally-point manager.

### The hero scratch-map
The emotional anchor — your visited world made visible. Bundled Natural Earth geometry (177 features, 248 KB; zero network), oak-green visited / gold home / stone unvisited.

- **Hover** → flag · trips · days · year range.
- **Click any country** → its briefing.
- **First-load fill** → countries light up most-traveled-first (`prefers-reduced-motion` skips to the final state instantly).
- **Export "My world" as PNG** → theme-matched, title-banded, downloads locally.
- **Theme-reactive** → light/dark toggle recolors live without replaying the animation.

### Tools (11, all linkable from `/tools`)
| | Tool | What it computes |
|---|---|---|
| ✈ | **Airports** | Search 85k airports; nearest scheduled airports + bearing + dispersion (egress check). Offline. |
| 🪪 | **Visa checker** | Your passport → any destination (offline matrix). Schengen 90/180 days. Passport validity rules. Offline. |
| ☁ | **Weather** | 7-day Open-Meteo forecast + go/no-go signal (heat, UV, photography light). Connection optional. |
| ⚠ | **Travel advisories** | Per-country risk scores. Connection optional. |
| 💱 | **Currency** | Live (cached) exchange + per-diem math. Connection optional. |
| 🏨 | **Hotel & room security** | Room-selection scoring (executive-protection tradecraft) + on-arrival walkthrough checklist. Offline. |
| 🛂 | **Border crossing** | Device-prep exposure score by destination/status/threat + before/at/after checklist. Offline. |
| 🛩 | **Data footprint of flying** | What API/PNR/EU EES/ETIAS/US biometric/transit systems capture when you fly. Offline reference. |
| 🧳 | **Packing** | Threat-aware packing checklist (6 sections). Offline. |
| 🖼 | **EXIF stripper** | Drag-and-drop GPS/metadata removal. Processed in-memory, never uploaded. |
| 👁 | **Self-doxxing audit** | Generated search queries + broker opt-out tracker. Doesn't search anything — just shows you what to check, in private. |

### Settings + data
- **Settings** — units, locale, home country, passport country, per-connection toggles, traveler profile.
- **Data management** (`/settings/data`) — back up, restore, or wipe your local data (JSON export/import).
- **Data sources** (`/about/data-sources`) — every bundled dataset and optional connection, with its license and what it returns.

---

## Your data, your machine

```
data/
├── greyline.db            ← SQLite (trips, destinations, countries, settings, cache)
├── greyline.db-wal        ← Write-ahead log (auto-managed)
├── greyline.db-shm        ← Shared memory file (auto-managed)
└── vault/
    ├── .verify            ← Argon2id-derived passphrase verifier
    └── *.enc              ← Your encrypted documents (AES-256-GCM)
```

**Back it up:** `cp -r data/ data-backup-$(date +%F)/`
**Start the DB over (keeps the vault):** `rm data/greyline.db* && pnpm migrate && pnpm seed`
**Nuke everything:** `rm -rf data/ && pnpm setup`. Encrypted vault docs are unrecoverable after this.

---

## External connections (all off by default)

Greyline makes **zero outbound network requests** until you turn one on. Each is a discrete toggle in Settings → Connections, and a master "Fully offline" switch blocks them all instantly. When enabled, every request goes through a local proxy that:

- strips identifying headers (`User-Agent`, `Referer`),
- respects the master offline switch,
- caches responses in SQLite to minimize repeats.

| Source | Used for | Limit |
|---|---|---|
| Open-Meteo | Weather forecasts | 10k/day |
| travel-advisory.info | Country risk scores | Unlimited |
| fawazahmed0/exchange-api | Currency rates (150+) | Unlimited |
| Nominatim (OSM) | Geocoding | 1 req/sec |
| Overpass (OSM) | Surveillance camera locations | Fair use |
| GDELT | Global events | Unlimited |
| USGS | Earthquakes (past day, M2.5+) | Unlimited |
| GDACS | Global disaster alerts | Unlimited |
| ADSB.lol | Live ADS-B aircraft | Unlimited |

No API keys required for any of them — they're all free and open.

---

## Tech

| Layer | Choice | Why |
|---|---|---|
| Framework | **Next.js 16** (App Router, Turbopack) | One process; server components read SQLite directly; route handlers for the local APIs. |
| UI | **React 19** + **shadcn/ui** (Radix) | Vendored primitives — no design lock-in, full control. |
| Styling | **Tailwind CSS 4** + OKLCH design tokens | "Oak & Gold" palette (deep oak-green + gold spark), warm-neutral stone surfaces, "Field Atlas / Dossier" voice. Dark by default. |
| Motion | **motion/react** + `lib/motion.ts` token system | Single source of truth for durations and easings; honors `prefers-reduced-motion`. |
| DB | **SQLite (better-sqlite3)** in WAL mode | One file. Zero config. Backup = copy a file. |
| Vault | **AES-256-GCM** + **Argon2id** | 256-bit authenticated encryption; memory-hard KDF. |
| Maps | **MapLibre GL JS 5** + bundled **Natural Earth** GeoJSON | Vector, offline, no tile-server dependency. |
| Package manager | **pnpm** | Fast, disk-efficient. |
| License | **AGPL-3.0** | Copyleft — forks must stay open. |

---

## Project layout

```
greyline/
├── app/                      Next.js App Router
│   ├── page.tsx              dashboard
│   ├── trips/                trips atlas + per-trip detail
│   ├── countries/            country directory + briefings
│   ├── map/                  OSINT map
│   ├── surveillance/         counter-surveillance log
│   ├── tools/                11 tools (airports, visa, weather, …)
│   ├── vault/                encrypted document vault
│   ├── settings/             app + connections + traveler profile
│   ├── about/data-sources/   bundled datasets + connections inventory
│   ├── api/                  32 route handlers (all local)
│   ├── loading.tsx           shared skeleton
│   └── error.tsx             client error boundary
├── components/               shell, ui/*, travel/world-map.tsx, tools/*, …
├── lib/                      countries.ts, motion.ts, connections.ts, …
├── server/
│   ├── db/                   index + migrations + repositories
│   ├── services/             api-gateway, vault, exif
│   ├── crypto/               encryption, key-derivation
│   └── api-clients/          per-source wrappers (open-meteo, nominatim, …)
├── scripts/                  migrate, seed, build-country-data, build-data
├── public/geo/               countries-110m.geojson (Natural Earth, 248 KB)
├── data/                     local SQLite + vault (gitignored)
└── e2e/                      Playwright specs
```

---

## All commands

| Command | What it does |
|---|---|
| `pnpm setup` | Install + migrate + seed (first-time) |
| `pnpm dev` | Next dev server on :3000 |
| `pnpm build` | Production build |
| `pnpm start` | Run the production build |
| `pnpm typecheck` | `tsc --noEmit` |
| `pnpm lint` | ESLint |
| `pnpm migrate` | Apply DB migrations |
| `pnpm seed` | Seed default settings + toggles |
| `pnpm build:countries` | Bundle the 250 country profiles |
| `pnpm build:data` | Build the dataset index for `/about/data-sources` |
| `pnpm e2e` | Build + Playwright e2e |
| `pnpm e2e:headed` | Playwright headed (debug) |

---

## Security model

- **Vault** — AES-256-GCM per file, random 12-byte IV, auth tag. Key = Argon2id(passphrase, salt, 64 MiB / 3 iters). No recovery — the passphrase is never stored.
- **No telemetry** — zero analytics, crash reporting, or usage tracking. No outbound call leaves the machine unless you toggle a connection on.
- **Proxy** — every external request strips `User-Agent` and `Referer`, respects the master offline switch, and is cached.
- **Localhost only** — Next dev binds to localhost; Docker exposes `127.0.0.1:3000` on the host. Nothing is reachable from other machines on the network.
- **Data destruction** — `rm -rf data/` removes the DB, WAL files, and the encrypted vault. There is no copy elsewhere.

---

## License

[AGPL-3.0](LICENSE). If you fork and distribute, your modifications stay open — no closed, hosted, telemetry-laden Greyline can be made from this code.
