# Open-Source Landscape: OSS for Greyline to Integrate or Learn From

_Part of the Greyline research corpus. Generated from cited 2026 web research; see Sources._

Scope: actively-maintained open-source projects and open datasets across the privacy/local-first, travel, OSINT, geospatial, and personal-security domains, evaluated for two distinct uses — **direct integration** into Greyline (license-compatible, architecturally aligned with the offline-first, opt-in-connector model) versus **learn-from** references (good patterns trapped in incompatible licenses or mismatched runtime stacks). Every project is assessed against Greyline's constraints: single-process Next.js 16 / React 19, better-sqlite3, MapLibre, AGPL-3.0, no hosted service, all external calls opt-in and off by default.

## Executive summary

Greyline's strongest near-term wins come from three OSS projects (plus one dataset) that are simultaneously license-compatible with AGPL-3.0 and architecturally aligned with its offline-first, opt-in-connector model. First, **mat2** (LGPL-3.0; canonical at `0xacab.org/jvoisin/mat2`, v0.14.0 dated Oct 2025) directly remediates Greyline's biggest known gap — its EXIF stripper is JPEG-only. mat2 strips metadata from roughly 26 formats (PNG, TIFF, WebP, PDF, docx/xlsx/pptx, ODF, MP3/FLAC/MP4, GIF, SVG, torrent, zip). LGPL is one-way compatible with AGPL, so it can be linked as a library or shelled out to as a sidecar. Second, **Dangerzone** (AGPL-3.0, `freedomofpress/dangerzone`, 5.5k stars, v0.10.0 Dec 2025) is the gold standard for "trust this attachment": it converts hostile PDFs/Office/images to a safe flattened PDF via pixel-rasterization inside a gVisor sandbox with explicitly no network access — exactly Greyline's threat model for a traveler or journalist handling unknown files, and license-identical so it integrates cleanly. Third, **GeoNames-based offline reverse-geocoding** (`tomayac/local-reverse-geocoder`, or the ~12 MB SQLite `offline-geocoder`; GeoNames data is CC-BY) gives Greyline a fully-local "where was this photo/track taken" capability with zero network, feeding the existing scratch-map and SF-86-grade travel log.

On the geospatial rendering side, **kepler.gl 3.0** has already migrated its default basemap from Mapbox to MapLibre and ships GeoArrow loading (1M polygons in roughly 2s vs roughly 20s for GeoJSON). Greyline should borrow the GeoArrow / binary-tile pattern and the **deck.gl** (MIT) overlay approach for its visited-countries and surveillance-camera layers rather than serving raw GeoJSON. The **EFF Atlas of Surveillance** (CC-BY CSVs covering ALPR, facial recognition, drones, Ring/Neighbors partnerships, ShotSpotter) is a bundleable dataset that converts Greyline's live Overpass camera layer into an offline US police-tech overlay.

For journalism workflows, **ICIJ Datashare** (AGPL-3.0, Java, v21.6.0 May 2026) is the reference architecture for local single-user document search with offline OCR plus CoreNLP entity extraction. **OnionShare** (7k stars, v2.6.3), **GlobaLeaks**, and **SecureDrop** (AGPL) are learn-from references for opt-in anonymous file exfil rather than direct integrations, because their Tor/Java/dedicated-hardware stacks do not fit a single-process Next.js model. **SpiderFoot** (MIT, 17.7k stars) and **Sherlock** (400+ site username search, MIT) inform Greyline's existing self-doxxing query generator — borrow their passive-mode site-enumeration lists as a bundled offline target catalog.

Net recommendation: **integrate** mat2 + Dangerzone + a GeoNames offline geocoder + the EFF Atlas dataset; **learn from** kepler.gl/deck.gl (large-geo rendering), Datashare (document triage), SpiderFoot/Sherlock (passive OSINT), and Dawarich/Traccar (GPX/OwnTracks import breadth). Two items are explicitly out of bounds for code reuse: **GpsPrune** (GPL-2.0-only, incompatible) and **Haven** (project ended, Android-native) — keep both as concept-only references.

## Key findings

### Document and metadata sanitization (highest-leverage integrations)

**mat2 closes Greyline's documented JPEG-only metadata gap.** mat2 (LGPL-3.0-or-later, canonical at <https://0xacab.org/jvoisin/mat2>, v0.14.0 dated Oct 2025; the GitHub presence is a mirror) strips metadata from roughly 26 formats including PNG, TIFF, WebP, PDF, docx/xlsx/pptx, ODF, GIF, SVG, MP3/FLAC/MP4, torrent and zip — directly remediating Greyline's known limitation that its EXIF stripper only handles JPEG. LGPL is one-way compatible with AGPL-3.0, so mat2 can be linked or invoked as a sidecar. Caveat to resolve before integrating: the `0xacab.org` fetch reported the repo as "archived/read-only," while other 2025 sources (the man page dated Oct 2025, PyPI) confirm active releases; the canonical repo location and status should be re-verified first. mat2 also powers GNOME's "Metadata Cleaner," which is Tails-supported — a strong provenance signal.

**Dangerzone is the top secure-docs integration candidate and is license-identical.** Dangerzone (`freedomofpress/dangerzone`, 5.5k stars, 259 forks, Python 96.8%, AGPL-3.0, v0.10.0 dated 2 Dec 2025; <https://github.com/freedomofpress/dangerzone>) converts untrusted PDFs/Office docs/images into safe flattened PDFs by rasterizing to RGB pixels inside a gVisor sandbox with explicitly **no network access** — it runs fully airgapped. Because it is AGPL-3.0 like Greyline, there is no license friction; this makes it the leading content-disarm-and-reconstruction (CDR) candidate for travelers and journalists handling unknown attachments.

### Geospatial rendering and large-layer performance (learn-from patterns)

**kepler.gl 3.0 validates the MapLibre + GeoArrow direction and is a borrowable pattern.** kepler.gl 3.0 (MIT) changed its **default** basemap renderer from Mapbox to MapLibre and converted its codebase to TypeScript; it loads 1M polygons in roughly 2s via GeoArrow (Apache Arrow binary) versus roughly 20s for GeoJSON (<https://openjsf.org/blog/whats-new-in-the-keplergl-30-application>). Greyline should adopt GeoArrow / binary tiles plus a deck.gl overlay for its visited-countries scratch map and surveillance-camera layer instead of raw GeoJSON.

**deck.gl overlays cleanly on MapLibre with no hard map-vendor dependency.** deck.gl (MIT, roughly 13k stars, v9.3 with WebGPU; <https://github.com/visgl/deck.gl>) has zero hard React/Mapbox/MapLibre dependency and overlays cleanly on MapLibre. It is best-in-class GPU rendering for camera, aircraft, and visited-country layers — the recommended renderer for Greyline's high-cardinality geo layers.

### Surveillance-awareness datasets (bundleable)

**EFF Atlas of Surveillance ships CC-BY CSVs that become an offline US police-tech overlay.** The EFF Atlas of Surveillance Data Library (<https://www.atlasofsurveillance.org/pages/data-library>) provides CC-BY-licensed CSVs: the main Atlas (police tech nationwide, regularly updated), "Who Has Your Face?" (state facial-recognition/image-sharing), the Data Driven ALPR dataset, campus police surveillance, and California ALPR audit data. CC-BY permits redistribution with attribution, so these are directly bundleable to give Greyline an **offline** US police-surveillance-tech map overlay complementing its current live Overpass camera layer.

### Offline geolocation (core travel-pillar enabler)

**Offline reverse-geocoding is achievable with zero network via GeoNames (CC-BY).** Two options exist: `tomayac/local-reverse-geocoder` (Node, `cities1000` default, country-filterable to avoid the roughly 2GB full dump, `dumpDirectory` for an offline cache; <https://github.com/tomayac/local-reverse-geocoder>) or `lucaspiller/offline-geocoder` (embeddable roughly 12MB SQLite). Both are city-level only (no street). This enables a fully-local "where was this photo/track taken" feature feeding Greyline's scratch map and SF-86-grade travel log without any Nominatim or network calls.

### Journalism / document-investigation workflows (learn-from architecture)

**ICIJ Datashare is the reference architecture for local single-user document investigation.** Datashare (`ICIJ/datashare`, roughly 735 stars, Java 98.6%, AGPL-3.0, v21.6.0 dated 28 May 2026, 5,579 commits, actively maintained; <https://github.com/ICIJ/datashare>) provides offline OCR (Tika/Tesseract per its docs) plus CoreNLP named-entity extraction (the `datashare-nlp-corenlp` module), Docker-compose deployment, and no cloud requirement. It is AGPL-compatible; its plugin architecture and entity-extraction UX are the patterns Greyline should borrow for a journalist document-triage pillar (the Java stack itself is a poor fit for direct embedding).

### Anonymous file exfil / whistleblowing (learn-from references)

**OnionShare, GlobaLeaks, and SecureDrop define the opt-in anonymous-exfil design space.** OnionShare (`onionshare/onionshare`, roughly 7k stars, 701 forks, Python 95.2%, v2.6.3 dated 25 Feb 2025; <https://github.com/onionshare/onionshare>) does serverless file-share/receive/host/chat over Tor onion services. GlobaLeaks (AGPL-3.0 with §7 terms, 10,000+ deployments, a Digital Public Good, active in 2025 at 5.0.83; <https://github.com/globaleaks/globaleaks-whistleblowing-software>) and SecureDrop (AGPL-3.0, Freedom of the Press Foundation, Tails-airgapped) are the whistleblower-platform references. All three are **learn-from only** — their Tor/Java/dedicated-hardware stacks do not fit Greyline's single-process Next.js model — informing an opt-in "anonymous exfil" connector rather than direct integration.

### OSINT / self-doxxing (passive, MIT, reusable)

**SpiderFoot and Sherlock are MIT and directly inform a passive self-audit.** SpiderFoot (`smicallef/spiderfoot`, roughly 17.7k stars, Python 3, MIT, 200+ modules, with an explicit "Passive" investigation mode; <https://github.com/smicallef/spiderfoot>) and Sherlock (`sherlock-project/sherlock`, 400+ site username enumeration) are both MIT and fully reusable. Greyline should borrow SpiderFoot's passive-only module-gating philosophy and Sherlock's bundled site-URL catalog to upgrade its existing self-doxxing OSINT query generator into an offline self-audit target list: generate URLs locally, have the user open them manually, so the tool itself stays passive and offline-first.

### Location tracking and GPX import (learn-from import breadth)

**Dawarich and Traccar are server-heavy; harvest their importers, not their stacks.** Dawarich (`Freika/dawarich`, AGPL — the modern Google-Timeline replacement, supports GPX/GeoJSON/OwnTracks/Google-Timeline import and integrates with Immich/Photoprism; <https://github.com/Freika/dawarich>) and Traccar (`traccar/traccar`, roughly 6k stars, Apache-2.0, Java, 200+ GPS protocols, active through 2026; note that `traccar-sms-gateway` is GPL-3.0; <https://github.com/traccar/traccar>) are both server/DB-heavy. Learn from Dawarich's import-format breadth and trip-analysis UX; since Greyline already has a trips/destinations model, adopt Dawarich's GPX/OwnTracks importers rather than the whole stack.

### Counter-surveillance and photo-GPS correlation (concept-only)

**Haven is conceptually strong but ended and Android-native.** Guardian Project's Haven (`guardianproject/haven`, phone-as-sensor intrusion detection via motion/sound/light/camera with Signal+Tor alerts, built with FPF) is conceptually valuable for the surveillance pillar (counter-surveillance / hotel-room monitoring), but the project has **ended** and is Android-native, so it is not integrable into Greyline's web stack. Borrow only the concept — for example, document the "spare Android as room sensor" workflow in the hotel-security scorecard.

**GpsPrune's UX is borrowable, but its GPL-2.0-only license blocks code reuse.** GpsPrune (GPL-2.0, Java/Swing, active in 2025, single runnable JAR) imports GPX/KML/KMZ/NMEA/GeoJSON plus device formats via GPSBabel, caches OSM tiles to disk for offline use, and correlates photos with GPS tracks. GPL-2.0 is **not** compatible with AGPL-3.0 for code reuse (no "or later" clause), so treat it strictly as a learn-from reference for the photo-GPS-correlation and offline-tile-cache UX, never as a code source.

### License compatibility (summary finding)

**The AGPL-3.0 compatibility envelope is wide but has two hard exclusions.** Greyline (AGPL-3.0) can incorporate AGPL-3.0 code (Dangerzone, Datashare, GlobaLeaks, SecureDrop, Dawarich), LGPL-3.0 code (mat2 — link only), MIT code (deck.gl, kepler.gl, MapLibre plugins, SpiderFoot, Sherlock), and Apache-2.0 code (Traccar). It **cannot** relicense GPL-2.0-only code (GpsPrune) into AGPL absent an "or later" clause. CC-BY datasets (EFF Atlas, GeoNames) are freely bundleable provided attribution is recorded in NOTICE. The full per-project mapping is below.

## AGPL-3.0 license-compatibility map

This table is the authoritative integration gate. "Integrate" means code/binary may ship inside Greyline under AGPL-3.0; "Link only" means it may be invoked as a separately-licensed library/sidecar (do not copy source into AGPL files); "Bundle (attrib.)" means a dataset that may be redistributed with attribution; "Learn-from" means do not copy code — reimplement or borrow design only.

| Project / Dataset | License | Stars | Recency | AGPL-3.0 verdict | Disposition |
| --- | --- | --- | --- | --- | --- |
| Dangerzone | AGPL-3.0 | 5.5k | v0.10.0 (2 Dec 2025) | Identical — fully compatible | **Integrate** (optional local container connector) |
| ICIJ Datashare | AGPL-3.0 | ~735 | v21.6.0 (28 May 2026) | Identical — compatible | Learn-from (Java stack mismatch) |
| GlobaLeaks | AGPL-3.0 (+§7) | 10,000+ deploys | 5.0.83, active 2025 | Compatible (note §7 terms) | Learn-from (exfil UX) |
| SecureDrop | AGPL-3.0 | n/a | active (FPF) | Compatible | Learn-from (Tails/airgap stack) |
| Dawarich | AGPL | n/a | active | Compatible | Learn-from importers; could integrate parsers |
| mat2 | LGPL-3.0-or-later | mirror | v0.14.0 (Oct 2025) | Compatible one-way; **link, don't copy** | **Integrate** (library / sidecar) |
| deck.gl | MIT | ~13k | v9.3 (WebGPU) | Compatible (permissive) | **Integrate** (overlay renderer) |
| kepler.gl | MIT | n/a | 3.0 (TS rewrite) | Compatible (permissive) | Learn-from (GeoArrow pattern) |
| SpiderFoot | MIT | ~17.7k | active | Compatible (permissive) | **Integrate** (passive module lists) |
| Sherlock | MIT | n/a | 400+ sites | Compatible (permissive) | **Integrate** (site catalog `data.json`) |
| OnionShare | (per repo) | ~7k | v2.6.3 (25 Feb 2025) | Tor stack mismatch | Learn-from |
| Traccar | Apache-2.0 | ~6k | active through 2026 | Compatible (permissive); `traccar-sms-gateway` is GPL-3.0 | Learn-from (protocol/import breadth) |
| GpsPrune | GPL-2.0-only | n/a | active 2025 | **Incompatible** (no "or later") | Learn-from only (concept/UX) |
| Haven | (Guardian Project) | n/a | **ended**, Android-only | N/A (stack mismatch + ended) | Concept-only |
| EFF Atlas of Surveillance | CC-BY (data) | n/a | regularly updated | Bundleable with attribution | **Bundle** (attrib. in NOTICE) |
| GeoNames (via local geocoders) | CC-BY (data) | n/a | live dumps | Bundleable with attribution | **Bundle** (attrib. in NOTICE) |

Notes: GlobaLeaks ships AGPL-3.0 with §7 additional permissions/terms — review those §7 terms before reusing any of its source. Traccar's core is Apache-2.0, but its `traccar-sms-gateway` component is GPL-3.0; keep that component out of any reuse to avoid pulling GPL obligations into the tree. mat2 is LGPL, which permits dynamic linking from AGPL without subsuming mat2 under AGPL — invoke it, do not paste its source into AGPL-licensed modules.

## Recommended Greyline features

Five features map directly from the OSS/dataset findings. Each lists its pillar, behavior, the offline-first build path (OSS/API/algorithm), an effort estimate (S/M/L), and the differentiation argument.

### 1. Universal metadata stripper — replace the JPEG-only EXIF tool

- **Pillar:** surveillance
- **What it does:** Upgrades Greyline's EXIF stripper from JPEG-only to a universal sanitizer covering PNG, TIFF, WebP, PDF, docx/xlsx/pptx, ODF, GIF, SVG, MP3/FLAC/MP4 and zip/torrent. Shows a before/after diff of detected metadata, strips in-browser/locally, and writes the original's metadata to an encrypted-vault audit note.
- **Build (offline-first):** Embed **mat2** (LGPL-3.0, ~26 formats) as a bundled Python sidecar invoked locally, or port its per-format strip logic to Node. Pure-JS fallbacks for browser-only operation: `exifr`/`piexifjs` (JPEG/PNG/TIFF/WebP), `pdf-lib` (PDF info dict), and a `JSZip` rewrite for OOXML. 100% offline — no upload, all processing on the user's machine.
- **Effort:** L
- **Why it differentiates:** Most consumer tools are JPEG-only or cloud-based. A local, multi-format stripper with a metadata-diff preview and an audit trail is a paid-grade journalist/OPSEC feature. Rationale: metadata leakage (GPS, device serial, author, software fingerprint) is the #1 self-doxxing vector for travelers/journalists; evidence is mat2's format list plus AnarSec / 2025 metadata-removal guidance.

### 2. Safe-Document Converter — untrusted attachment flattening (CDR)

- **Pillar:** journalism
- **What it does:** Drop an untrusted PDF/Office doc/image; Greyline returns a flattened, safe PDF (text re-OCR'd) with all active content, macros, embedded JS and trackers removed. Runs in a sandbox with no network. Integrates with the journalist document-triage pillar and the encrypted vault.
- **Build (offline-first):** Integrate **Dangerzone** (AGPL-3.0) as an optional local container connector (Podman/Docker, now embedded in Dangerzone 0.10), or reimplement the rasterize→reassemble pipeline locally with `pdf2image` + Tesseract OCR + `img2pdf`. Fully airgapped by design (gVisor sandbox, no network).
- **Effort:** L
- **Why it differentiates:** No mainstream travel app offers content disarm and reconstruction. This is enterprise security functionality delivered locally and free of cloud exposure. Rationale: travelers and journalists routinely receive hostile attachments (spear-phishing, malicious PDFs at borders or from sources); Dangerzone's pixel-rasterization is the proven defense and is AGPL — license-identical to Greyline.

### 3. Offline photo/track geo-resolver — for the scratch map + travel log

- **Pillar:** travel
- **What it does:** Import a photo or GPX track; resolve lat/long to city/state/country entirely offline and auto-populate the visited-countries scratch map and the SF-86-grade day-count travel log. No Nominatim/network call. Flags photos whose embedded GPS contradicts the trip's stated itinerary — a counter-surveillance signal.
- **Build (offline-first):** `tomayac/local-reverse-geocoder` (Node) or `lucaspiller/offline-geocoder` (~12MB SQLite, embeds in better-sqlite3 alongside the existing DB). Bundle the GeoNames `cities1000` dump (CC-BY) at build time via a `pnpm build:geonames` script mirroring the existing `build:countries`. Country-filter to keep the bundle small.
- **Effort:** M
- **Why it differentiates:** Photo geolocation that never phones home is a privacy-first differentiator versus Google Photos / Immich-cloud; the itinerary-mismatch alert is unique to Greyline's OPSEC framing. Rationale: Greyline already has a scratch map plus a 7-year travel log but relies on online geocoding; GeoNames offline geocoding makes the core travel pillar work airgapped (cf. Immich's GeoNames-in-Postgres model).

### 4. Offline US surveillance-tech map overlay — ALPR / face-rec / Ring / ShotSpotter

- **Pillar:** maps
- **What it does:** Bundle EFF Atlas of Surveillance CSVs as a toggleable offline MapLibre layer showing which US agencies operate ALPR, facial recognition, drones, Ring/Neighbors partnerships and ShotSpotter — complementing the existing live Overpass camera layer. Click an area to see documented police tech before you travel there.
- **Build (offline-first):** EFF Atlas of Surveillance + "Who Has Your Face?" + Data Driven ALPR CSVs (CC-BY). Geocode agency locations offline via the GeoNames resolver from feature 3; render as a deck.gl/MapLibre layer. Attribution in NOTICE. Fully offline once bundled.
- **Effort:** M
- **Why it differentiates:** No travel/security app ships a built-in offline police-surveillance-tech map. Strong fit for the journalist/activist niche and a clear sellable differentiator. Rationale: turns Greyline's online-only camera layer into a bundleable, offline situational-awareness layer for US domestic travel/protest contexts; the EFF Data Library lists all datasets as CC-BY CSV, permitting redistribution.

### 5. Passive self-doxxing audit — Sherlock/SpiderFoot-style bundled target catalog

- **Pillar:** surveillance
- **What it does:** Upgrades the existing self-doxxing query generator into a structured self-audit: enter your handles/email/name and Greyline generates a categorized checklist of 400+ profile URLs and dorks to review. It **never** fetches them (stays passive); the user opens links manually. Tracks which exposures have been remediated.
- **Build (offline-first):** Bundle Sherlock's `resources/data.json` site catalog (MIT) and SpiderFoot's passive module URL templates (MIT) as a local JSON dataset. All URL/dork generation is client-side; zero network egress from Greyline itself. Ships with the app.
- **Effort:** S
- **Why it differentiates:** Generate-don't-fetch design = genuinely passive OSINT (no target packets), which most "OSINT tools" violate. A privacy-purist's self-audit, defensible in the README's threat model. Rationale: Greyline already has a self-doxxing generator; SpiderFoot's passive-mode philosophy and Sherlock's 400+ site catalog make it far more thorough while preserving offline-first/passive constraints (generation is local; no packets sent by Greyline).

## Sources

| Title | Type | Credibility | URL | Note |
| --- | --- | --- | --- | --- |
| Dangerzone — convert dangerous docs to safe PDFs (GitHub repo) | oss | high | <https://github.com/freedomofpress/dangerzone> | Verified: 5.5k stars, 259 forks, Python 96.8%, AGPL-3.0, v0.10.0 (2 Dec 2025). gVisor sandbox, NO network access, runs airgapped. Pixel-rasterization pipeline confirmed. |
| mat2 — metadata anonymisation toolkit (canonical GitLab + GitHub mirror) | oss | high | <https://0xacab.org/jvoisin/mat2> | LGPL-3.0-or-later, Python 3, ~26 formats. Man page dated Oct 2025 (v0.14.0). Powers GNOME "Metadata Cleaner" (Tails-supported). Re-verify canonical repo status (fetch flagged 0xacab as archived; PyPI/man page show active). |
| ICIJ Datashare — self-hosted document search engine (GitHub) | oss | high | <https://github.com/ICIJ/datashare> | Verified: ~735 stars, Java 98.6%, AGPL-3.0, v21.6.0 (28 May 2026), 5,579 commits. Offline OCR + CoreNLP NER (datashare-nlp-corenlp), Docker-compose local single-user deploy, no cloud. |
| OnionShare — anonymous file share/host/chat over Tor (GitHub) | oss | high | <https://github.com/onionshare/onionshare> | Verified: ~7k stars, 701 forks, Python 95.2%, v2.6.3 (25 Feb 2025). Serverless via Tor onion services. Learn-from reference for opt-in anonymous exfil. |
| EFF Atlas of Surveillance — Data Library (CC-BY datasets) | dataset | high | <https://www.atlasofsurveillance.org/pages/data-library> | CC-BY CSVs: main Atlas (police tech), Who Has Your Face (face recognition), Data Driven ALPR, campus police, CA ALPR audit. Redistributable with attribution — bundleable offline US surveillance-tech overlay. |
| local-reverse-geocoder (tomayac) — offline GeoNames reverse geocoding for Node | oss | high | <https://github.com/tomayac/local-reverse-geocoder> | Node, cities1000 default, country-filterable to shrink the ~2GB GeoNames dump, dumpDirectory for offline cache. City-level only. GeoNames data is CC-BY. Enables fully-local photo/track geocoding. |
| kepler.gl 3.0 — MapLibre default basemap + GeoArrow (OpenJS Foundation blog) | article | high | <https://openjsf.org/blog/whats-new-in-the-keplergl-30-application> | MIT. Default renderer switched Mapbox→MapLibre; full TS rewrite; GeoArrow loads 1M polygons ~2s vs ~20s GeoJSON. Pattern to borrow for Greyline's large geo layers. |
| deck.gl — WebGL2/WebGPU geospatial framework (GitHub) | oss | high | <https://github.com/visgl/deck.gl> | MIT, ~13k stars, v9.3 (WebGPU). No hard React/Mapbox/MapLibre dependency; overlays on MapLibre. Best-in-class GPU rendering for camera/aircraft/visited-country layers. |
| SpiderFoot — OSINT automation with Passive mode (GitHub) | oss | high | <https://github.com/smicallef/spiderfoot> | MIT, ~17.7k stars, Python 3, 200+ modules, explicit "Passive" investigation mode. Borrow passive-gating philosophy + module target lists for Greyline's self-doxxing generator. |
| Dawarich — self-hosted Google-Timeline alternative (GitHub) | oss | high | <https://github.com/Freika/dawarich> | AGPL. Imports GPX/GeoJSON/OwnTracks/Google-Timeline; trips + travel analysis; Immich/Photoprism geo integration. Borrow import-format breadth and trip-analysis UX. |
| Traccar — open-source GPS tracking system (GitHub) | oss | high | <https://github.com/traccar/traccar> | Apache-2.0, ~6k stars, Java, 200+ GPS protocols, active through 2026. traccar-sms-gateway is GPL-3.0. Server-heavy; learn-from for protocol/import breadth. |
| GlobaLeaks — open-source whistleblowing software (GitHub) | oss | high | <https://github.com/globaleaks/globaleaks-whistleblowing-software> | AGPL-3.0 with §7 terms, 10,000+ deployments, Digital Public Good, active 2025 (5.0.83). Learn-from reference for opt-in anonymous reporting/exfil UX. |

## Open questions

1. **mat2 canonical repo/status.** The `0xacab.org` fetch reported the repo as "archived/read-only" while the Oct 2025 man page and PyPI show active v0.14.0 releases. Confirm whether the live source is `0xacab`, the GitHub mirror, or the Tails-supported `metadatacleaner` GitLab before committing to integration.
2. **Bundling strategy for Python tools (mat2, Dangerzone).** Does Greyline want a Python sidecar / optional container connector (heavier install, larger surface) or a pure-JS reimplementation of the strip/rasterize logic (more work, keeps the single-process Next.js model intact)? This materially changes the effort estimates for features 1 and 2.
3. **GeoNames bundle size vs coverage.** `cities1000` unzipped is roughly 1.3GB if downloaded in full. Should Greyline default to a country-filtered subset (per active trips) or ship the ~12MB SQLite `cities1000` from `offline-geocoder`? Decide the `build:geonames` default to keep the repo/docker image lean.
4. **AGPL §13 (network-use) implications.** If any integrated connector (e.g., a Datashare-style search service) is ever exposed over a LAN, AGPL source-offer obligations attach. Confirm that Greyline's positioning (strictly localhost) keeps this a non-issue, and document it.
5. **EFF Atlas CC-BY attribution.** Confirm the exact attribution string and that bundling the CSV (vs linking) is within terms; add it to `NOTICE`/`THIRD_PARTY_LICENSES.md` alongside the GeoNames CC-BY attribution.
6. **Unified vs separate sanitization sidecar.** Should the safe-document converter and metadata stripper share one local sanitization sidecar/service, or stay separate? A unified "document sanitization" module (Dangerzone + mat2) may be cleaner architecturally and a stronger single sellable feature.
7. **Dawarich/Traccar GPX-import scope.** Rather than integrating either server, is the right scope just adopting their import-format parsers (GPX/KML/OwnTracks) into Greyline's existing trips model? Verify which parser libraries are AGPL/Apache/MIT and embeddable.
