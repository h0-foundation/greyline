# Greyline

**Your travel data stays on your machine. Always.**

Greyline is a privacy-first, offline-first travel planning application built for people who take their operational security seriously. It runs entirely on your computer — no accounts, no cloud, no tracking, no telemetry.

---

## Why This Exists

Most travel apps want your data. Your itineraries, passport scans, location history, financial details — all stored on someone else's server, all one breach away from exposure.

Greyline exists because travelers who care about privacy shouldn't have to choose between convenience and control. Whether you're a journalist working in sensitive regions, a security professional, a digital nomad, or simply someone who doesn't want their travel patterns monetized — this tool is for you.

### The Gray Man Philosophy

In security tradecraft, a "gray man" is someone who blends in — unremarkable, unmemorable, invisible in a crowd. Greyline applies this principle to both its design and your travel planning:

- **The app itself blends in.** Clean, minimal UI. No tactical branding, no spy imagery, no military aesthetics. It looks like any other travel planner on your screen.
- **Privacy by default.** All external API calls go through a local gateway that strips identifying headers (User-Agent, Referer). Every API is off by default — you enable only what you need.
- **Real tradecraft, practical application.** OPSEC checklists, cultural blending guides, counter-surveillance awareness, and hotel security protocols are drawn from CIA, MI6, FBI, Special Forces, and SERE frameworks — adapted for civilian travel.
- **No digital footprint.** Photo EXIF stripping removes GPS coordinates and device fingerprints. The encrypted vault protects sensitive documents with AES-256-GCM. Nothing phones home.

This isn't about paranoia. It's about having a reasonable, practical baseline of operational security when you travel.

---

## Getting Started

### Prerequisites

- [Node.js](https://nodejs.org/) 20+ (LTS recommended)
- [pnpm](https://pnpm.io/) package manager

If you don't have pnpm:

```bash
npm install -g pnpm
```

### 1. Clone and Install

```bash
git clone https://github.com/user/greyline.git
cd greyline
pnpm setup
```

`pnpm setup` does three things: installs dependencies, creates the local SQLite database with migrations, and seeds default settings. No external services are contacted. No accounts are created.

### 2. Seed Country Data (Optional)

To populate the knowledge base with 250+ country profiles:

```bash
pnpm build:countries
```

This downloads from REST Countries and CIA World Factbook (~3 MB). You only need to run this once. The app works without it — you just won't have country profile data.

### 3. Run in Development Mode

```bash
pnpm dev
```

Open [http://localhost:5173](http://localhost:5173). The app is running.

The dev server binds to `127.0.0.1` only — it is not accessible from other machines on your network. Hot-reload is enabled: changes to source files appear instantly in the browser.

### 4. Stop the App

Press `Ctrl+C` in the terminal where the dev server is running. That's it. Your data is saved in `data/greyline.db` and persists between sessions. Next time you want to use the app, just run `pnpm dev` again.

---

## Production Build

For a faster, optimized version without hot-reload:

```bash
# Build the production bundle
pnpm build

# Run it
pnpm start
```

Open [http://localhost:5173](http://localhost:5173). The production build is leaner and faster than dev mode.

To stop: press `Ctrl+C`.

---

## Docker Deployment

If you prefer containers or don't want to install Node.js:

```bash
# Build and start in the background
docker compose up -d

# Check it's running
docker compose ps

# View logs
docker compose logs -f
```

Open [http://localhost:5173](http://localhost:5173).

### Stop and restart

```bash
# Stop (preserves your data)
docker compose down

# Start again later
docker compose up -d
```

### Full removal

```bash
# Stop and remove the container
docker compose down

# Remove the Docker image
docker compose down --rmi all
```

Your data lives in the `data/` directory on your host machine (mounted as a volume), so it survives container restarts and removals. To delete your data too, remove the `data/` folder manually.

---

## Managing Your Data

### Where data is stored

All data lives in the `data/` directory:

```
data/
├── greyline.db          ← SQLite database (trips, settings, country profiles, cache)
├── greyline.db-wal      ← Write-ahead log (auto-managed by SQLite)
├── greyline.db-shm      ← Shared memory file (auto-managed by SQLite)
└── vault/               ← Encrypted document files
    ├── .verify           ← Vault passphrase verification token
    └── *.enc             ← Your encrypted documents
```

### Back up your data

```bash
# Simple backup
cp -r data/ data-backup-$(date +%Y%m%d)/

# Or just the database (if you don't use the vault)
cp data/greyline.db greyline-backup.db
```

### Reset everything

```bash
# Wipe the database and recreate it empty
pnpm reset
```

This removes the SQLite database and WAL files, then runs migrations and seeds fresh. Your vault files in `data/vault/` are NOT removed by `pnpm reset`.

### Nuclear option — delete all data

```bash
# Remove everything: database, vault, all local data
rm -rf data/

# Recreate a fresh database
pnpm setup
```

After this, the app is back to first-run state. Any encrypted vault documents are permanently gone.

### Clean build artifacts

```bash
# Remove build output, .svelte-kit cache, and database
pnpm clean
```

---

## Vault Security

The document vault uses AES-256-GCM encryption with Argon2id key derivation.

- **First use**: You set a passphrase (minimum 8 characters). This encrypts a verification token stored in `data/vault/.verify`.
- **Subsequent use**: Your passphrase is verified against this token before the vault unlocks.
- **No recovery**: If you forget your passphrase, your encrypted documents are unrecoverable. This is by design.
- **Reset the vault**: Delete `data/vault/` to wipe all encrypted files and start fresh with a new passphrase.

---

## Enabling External APIs

By default, Greyline makes zero outbound network requests. All external APIs are disabled.

To enable APIs: go to **Settings → API Toggles** and switch on what you need. A master offline switch at the top blocks all external connections instantly.

When enabled, all API calls go through a local privacy gateway that:
- Strips identifying headers (`User-Agent`, `Referer`)
- Caches responses in SQLite to minimize repeat requests
- Respects the master offline switch

---

## Features

### Trip Planning
Create and manage trips with multiple destinations, dates, notes, and linked country profiles. Each destination gets auto-generated checklists (packing, hotel security, border crossing, digital hygiene) with progress tracking.

### Encrypted Document Vault
Store passport copies, visas, insurance documents, and other sensitive files encrypted with AES-256-GCM. Protected by a passphrase you set on first use — derived via Argon2id key derivation. No recovery mechanism by design. If you forget your passphrase, the data is gone.

### OPSEC Dashboard
Security posture overview with checklist-based scoring across multiple categories. Tracks your operational security readiness for active trips.

### Country Knowledge Base
Aggregated profiles for 250+ countries from REST Countries and CIA World Factbook data. Geography, demographics, languages, currencies, borders, and practical travel info — all stored locally.

### Tools

| Tool | Description |
|------|-------------|
| **Photo EXIF Stripper** | Drag-and-drop metadata removal — GPS, device info, timestamps, camera settings |
| **Packing List Generator** | Gray-man gear lists by climate, duration, travel type, and risk level (82 items across 7 categories) |
| **Wardrobe Planner** | Clothing recommendations by destination, season, and context — what to wear to blend in, what to avoid |
| **Hotel Security Checklist** | CIA-derived room security verification — entry points, surveillance, communications security |
| **Room Sweep Guide** | TSCM-informed hotel room inspection protocol |
| **Border Crossing Prep** | Region-specific customs procedures, document requirements, digital security at borders, behavioral guidance |
| **Financial OPSEC Planner** | Cash vs card norms by region, ATM safety, payment culture, budget planning, financial gray man tips |
| **SDR Route Generator** | Surveillance detection route planning with timing stops and cover stops |
| **Extraction Planner** | Emergency evacuation routes to embassies, hospitals, airports, and borders |
| **Currency Converter** | Live and cached exchange rates for 150+ currencies with offline fallback |
| **Weather** | 16-day forecasts via Open-Meteo with hourly breakdowns and offline caching |
| **Travel Advisories** | Risk scores from travel-advisory.info with country-level threat assessment |

### Surveillance Awareness
Camera location data from OpenStreetMap, counter-surveillance logging, and situational awareness tools.

### Command Palette
`Cmd+K` (Mac) / `Ctrl+K` (Windows/Linux) for quick navigation to any page or tool.

---

## Technology Choices

Every technology choice serves the core principles: privacy, offline capability, simplicity, and local-first operation.

| Layer | Choice | Why |
|-------|--------|-----|
| **Framework** | SvelteKit | Full-stack with API routes for backend logic. Runs on localhost as both server and client. No separate backend needed. |
| **Frontend** | Svelte 5 | Compiles to vanilla JS with no virtual DOM. Small bundles, fast rendering. Reactive by default with runes (`$state`, `$derived`, `$effect`). |
| **Styling** | Tailwind CSS 4 | Utility-first with custom design tokens. Dark mode default. Neon-on-dark theme (accent: `#EAFF5E` on near-black surfaces). |
| **Database** | SQLite (better-sqlite3) | Single local file. Zero config. No database server. WAL mode for performance. Your data is one file you can back up or destroy. |
| **Encryption** | Node.js crypto (AES-256-GCM) | Built-in, no external dependencies for the core encryption. 256-bit keys, authenticated encryption with associated data. |
| **Key Derivation** | Argon2id | Memory-hard KDF resistant to GPU/ASIC attacks. Passphrase → encryption key with unique salt per operation. |
| **Maps** | MapLibre GL JS + PMTiles | Open-source vector maps with offline tile support. No API keys, no tracking, BSD licensed. |
| **Package Manager** | pnpm | Fast, disk-efficient, strict dependency resolution. |
| **Container** | Docker | Optional. One-command deployment with `docker compose up`. Data persisted via volume mount. |
| **License** | AGPL-3.0 | Copyleft. Anyone can use, modify, and distribute — but modifications must remain open source. Prevents proprietary forks. |

### Why Not [X]?

- **Why not Electron/Tauri?** SvelteKit on localhost gives you a full app with zero desktop framework overhead. Works in any browser. No installation beyond `pnpm dev`.
- **Why not PostgreSQL/MySQL?** SQLite is one file. No server process. Easy to back up (`cp data/greyline.db backup.db`), easy to destroy (`rm data/greyline.db`). Perfect for single-user local apps.
- **Why not cloud sync?** By design. Your data never leaves your machine. If you want backups, copy the `data/` directory to an encrypted drive.
- **Why AGPL?** Trust. You can read every line of code that touches your data. No one can take this and make a closed-source version that phones home.

---

## Architecture

```
Your Machine (localhost:5173)
├── SvelteKit App
│   ├── Browser        → Svelte 5 + Tailwind CSS 4
│   ├── Server         → API routes (bound to 127.0.0.1 only)
│   ├── Database       → SQLite (data/greyline.db)
│   ├── Vault          → AES-256-GCM encrypted files (data/vault/)
│   └── API Gateway    → Privacy-preserving proxy with per-API toggles
│
├── Server Services
│   ├── /api/trip/          → Trip CRUD + destination management
│   ├── /api/vault/         → Encrypted document storage
│   ├── /api/knowledge/     → Country profiles + search
│   ├── /api/settings/      → App config + API toggles
│   ├── /api/tools/         → EXIF stripping, checklists
│   ├── /api/weather/       → Open-Meteo proxy
│   ├── /api/advisories/    → Travel risk scores
│   ├── /api/currency/      → Exchange rates
│   └── /api/geocode/       → Nominatim proxy
│
└── Data Layer
    ├── data/greyline.db    → SQLite database (gitignored)
    └── data/vault/*.enc    → Encrypted document files (gitignored)
```

All API routes run on localhost. The server never binds to `0.0.0.0` in development — only `127.0.0.1`.

---

## External APIs

All disabled by default. No API keys required for any of these — they are all free and open.

| API | Purpose | Rate Limit |
|-----|---------|-----------|
| Open-Meteo | Weather forecasts, elevation | 10k/day |
| travel-advisory.info | Country risk scores | Unlimited |
| fawazahmed0/exchange-api | Currency rates (150+) | Unlimited |
| Nominatim | Geocoding, address search | 1 req/sec |
| Overpass (OSM) | Surveillance camera locations | Fair use |
| GDELT | Global news/events | Unlimited |
| ADSB.lol | Flight tracking | Unlimited |
| IP-API | IP geolocation check | 45/min |

---

## All Commands

| Command | What it does |
|---------|-------------|
| `pnpm setup` | First-time install: dependencies + database + seed |
| `pnpm dev` | Start dev server at localhost:5173 |
| `pnpm build` | Build for production |
| `pnpm start` | Run production build |
| `pnpm build:countries` | Download country data bundle (250+ countries) |
| `pnpm check` | Type-check the codebase |
| `pnpm test` | Run unit tests |
| `pnpm test:e2e` | Run end-to-end tests (Playwright) |
| `pnpm reset` | Wipe database and recreate from scratch |
| `pnpm clean` | Remove build artifacts, database, and WAL files |

---

## Project Structure

```
greyline/
├── src/
│   ├── routes/              → SvelteKit pages and API routes
│   │   ├── +page.svelte     → Dashboard
│   │   ├── trip/            → Trip list + detail pages
│   │   ├── vault/           → Encrypted document vault
│   │   ├── opsec/           → OPSEC dashboard
│   │   ├── knowledge/       → Country profiles
│   │   ├── map/             → Offline map viewer
│   │   ├── surveillance/    → Camera data + CS log
│   │   ├── tools/           → All standalone tools
│   │   ├── training/        → Training modules
│   │   ├── settings/        → App settings + API toggles
│   │   └── api/             → Server-side API endpoints
│   └── lib/
│       ├── components/ui/   → Shared UI components
│       ├── stores/          → Svelte stores (app state)
│       ├── types/           → TypeScript type definitions
│       └── services/        → Client-side API wrappers
├── server/
│   ├── db/                  → SQLite connection + migrations + repositories
│   ├── services/            → Business logic (vault, trips, OPSEC)
│   ├── crypto/              → Encryption, key derivation, EXIF stripping
│   └── api-clients/         → External API client wrappers
├── data/                    → Local data directory (gitignored)
│   ├── greyline.db          → SQLite database
│   └── vault/               → Encrypted files
├── scripts/                 → Setup and data build scripts
├── docker-compose.yml
├── Dockerfile
└── package.json
```

---

## Security Model

- **Vault encryption**: AES-256-GCM with random 12-byte IV per file. Auth tags prevent tampering. Keys derived from passphrase via Argon2id (64 MB memory, 3 iterations).
- **No recovery**: If you lose your vault passphrase, the encrypted files are unrecoverable. This is intentional.
- **Local only**: The dev server binds to `127.0.0.1`. Docker exposes `127.0.0.1:5173`. Nothing is accessible from other machines on your network.
- **No telemetry**: Zero analytics, crash reporting, or usage tracking. The app makes no outbound connections unless you explicitly enable an API.
- **Header stripping**: When APIs are enabled, the gateway removes identifying headers before forwarding requests.
- **Data destruction**: `pnpm clean` removes the database and all WAL files. `rm -rf data/` removes everything including encrypted vault files.

---

## License

[AGPL-3.0](LICENSE) — Free and open source. If you modify and distribute Greyline, your modifications must also be open source.
