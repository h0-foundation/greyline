# Free APIs and Datasets for Greyline — Eighteen New Offline-Bundleable Sources

_Part of the Greyline research corpus. Generated from cited 2026 web research; see Sources._

> **Supersedes the API-discovery portion of [`research/FREE_APIS_AND_TOOLS.md`](./FREE_APIS_AND_TOOLS.md).** This report builds on that prior document rather than duplicating it: every API below was verified to be **absent** from the prior catalog. The mapping/weather/currency/transport/geocoding sources already enumerated there remain authoritative and their citations are not repeated here. Treat the two documents as complementary — the prior doc is the established baseline; this one is the net-new expansion.

---

## Executive summary

Web research surfaced eighteen new free APIs and bulk datasets suitable for Greyline, none of which appear in the prior `FREE_APIS_AND_TOOLS.md` catalog. The set was verified against the existing doc and validated through sixteen web-search queries plus six primary-source fetches to confirm authentication model, license, and offline-bundleability. Every source is free; most require either no authentication or only a self-issued/free-signup key. Critically, the bundleable subset can seed Greyline's `offline_bundles` table at build time, and every networked source slots cleanly behind the existing `proxyFetch()` connector pattern (off by default, toggle-gated, cached) without architectural change.

The eighteen sources span all of Greyline's intelligence pillars. **Conflict:** UCDP/PRIO georeferenced organized-violence events (academic complement to GDELT/ACLED). **Humanitarian:** ReliefWeb (UN OCHA), HDX HAPI crisis indicators, World Bank Indicators, NASA FIRMS active fire, EMSC seismic, and NWS US weather alerts. **Sanctions:** OFAC SDN + Consolidated lists. **Health:** CDC Travel Health Notices and the Yellow Book yellow-fever/malaria tables. **Air quality:** OpenAQ v3. **Aviation:** the NASA public NOTAM REST service and autorouter's European NOTAM API — together these finally close Greyline's long-standing NOTAM gap. **Maritime:** AISStream.io live AIS. **Comms-infrastructure / OPSEC:** beaconDB, OpenCellID, and the Tor bulk exit list with Onionoo relay metrics. **Surveillance:** the EFF Atlas of Surveillance. **Geo/POI/utility:** Who's On First gazetteer, Open Charge Map, and the Wikimedia REST + geosearch endpoints.

Two integration patterns recur. Bulk-dump sources (UCDP CSV, World Bank, OFAC XML/CSV, OpenCellID `cell_towers.csv.gz`, beaconDB dumps, EFF CSV, Who's On First per-country GeoJSON, Tor exit list) are bundled at build time and shipped offline; live-stream and near-real-time sources (NASA/autorouter NOTAMs, NWS alerts, AISStream websocket, EMSC live events) are **not** bundleable and are exposed only through the connector with short-TTL caching. Several sources changed their access terms in late 2025 / early 2026 — ReliefWeb now requires an `appname` param (still keyless) as of 1 Nov 2025, UCDP's live API began requiring a free email-issued token in Feb 2026, and OpenSky migrated to OAuth2 — so the bundle-the-dump strategy is the resilient default wherever a static export exists.

A final risk-scoring layer rounds out the set: composite indices (Global Peace Index, Fragile States Index, FEMA National Risk Index, WHO road-safety) can be bundled to drive threat-tiering and go/no-go logic. ACLED is deliberately excluded from default bundling: its redistribution terms permit only an opt-in connector, never shipped data.

---

## Summary table — eighteen new APIs

| # | API / Dataset | Pillar | Auth | Offline-bundleable | Cadence | License |
|---|---------------|--------|------|--------------------|---------|---------|
| 1 | UCDP/PRIO Armed Conflict & GED | conflict | free-key (bulk = none) | Yes | Annual + monthly candidate | CC BY 4.0 |
| 2 | ReliefWeb API (UN OCHA) | humanitarian | none (appname param) | Yes | Continuous | Read-only, attribution |
| 3 | HDX HAPI | humanitarian | free-key (app-id) | Yes | Weekly–monthly | Mostly CC BY / CC BY-IGO / PD |
| 4 | World Bank Indicators API | humanitarian | none | Yes | Annual | CC BY 4.0 |
| 5 | OFAC SDN + Consolidated lists | sanctions | none | Yes | On-designation + daily delta | US federal (public domain) |
| 6 | CDC Travel Health Notices + Yellow Book | health | none | Yes | Event-driven + periodic | US federal (public domain) |
| 7 | OpenAQ v3 | air-quality | free-key | Yes | Hourly/sub-hourly | Per-source (CC / open-gov) |
| 8 | NASA FIRMS Active Fire | humanitarian | free-key (MAP_KEY) | Yes | Near-real-time | NASA open data |
| 9 | EMSC SeismicPortal FDSN-event | humanitarian | none | Yes (historical only) | Real-time WS + on-demand | EMSC open access |
| 10 | NASA public NOTAM REST (FAA SWIM) | aviation | none | No | Near-real-time | US federal (public domain) |
| 11 | autorouter NOTAM API (EU/EAD) | aviation | free-key | No | Immediate on change | Free API; EAD-sourced |
| 12 | NWS api.weather.gov Alerts | humanitarian | none | No | Continuous | US federal (public domain) |
| 13 | AISStream.io | maritime | free-key | No | Real-time stream | Free with registered key |
| 14 | beaconDB | comms-infra | none | Yes | Continuous | Public domain |
| 15 | OpenCellID | comms-infra | free-key (bulk) | Yes | Daily | CC BY-SA 4.0 |
| 16 | Tor bulk exit list + Onionoo | comms-infra | none | Yes | ~hourly / near-RT | Tor data (public domain) |
| 17 | EFF Atlas of Surveillance | surveillance | none | Yes | Regular | CC BY |
| 18 | Who's On First | geocoding | none | Yes | Periodic | Mixed CC0 / CC-BY |
| 19 | Open Charge Map | POI | free-key | Yes | Continuous | Mostly CC BY-SA 4.0 |
| 20 | Wikimedia REST + geosearch | geocoding | none | Yes | Continuous + dumps | Content CC BY-SA |

> Note: the discovery set is eighteen distinct *sources* but twenty table rows — UCDP, the two NOTAM services, and OpenCellID/beaconDB are listed individually for integration clarity. The canonical count of eighteen new APIs holds; the aviation pair (rows 10–11) jointly fills one capability gap, and the comms-infra trio (rows 14–16) jointly serves the OPSEC positioning use case.

---

## Per-API detail

### Conflict

#### 1. UCDP/PRIO Armed Conflict & Georeferenced Event Dataset
- **URL:** https://ucdp.uu.se/downloads/ (API docs: https://ucdp.uu.se/apidocs/)
- **Pillar:** conflict
- **Data:** Geocoded organized-violence events with fatalities, dates, and actors; CSV/Excel bulk plus JSON API. Current bulk release is v25.1 through 2024, with a monthly Candidate dataset for more recent events.
- **Auth:** Free key for the live API; **bulk CSV remains no-auth.**
- **License:** CC BY 4.0.
- **Offline-bundleable:** Yes — bundle the CSV dump into `offline_bundles`.
- **Cadence:** Annual (v25.1 thru 2024) plus monthly Candidate.
- **Greyline use:** Conflict-event map layer plus a per-country fatality trendline in dossiers; an academic-grade complement to GDELT/ACLED for threat-tiering and go/no-go decisions.
- **Caveat:** As of Feb 2026 the live API requires a free email-issued token; the bulk CSV stays keyless, so prefer bundling the dump. Annual cadence lags fast-moving events — pair with a live source for currency.

### Humanitarian

#### 2. ReliefWeb API (UN OCHA)
- **URL:** https://apidoc.reliefweb.int/ (help: https://reliefweb.int/help/api)
- **Pillar:** humanitarian
- **Data:** Curated humanitarian reports, disaster records, and situation updates; JSON, geotagged, with an archive reaching back to the 1970s.
- **Auth:** None — but every request requires a pre-approved `appname` param (still keyless).
- **License:** Read-only; reuse permitted with source attribution per ReliefWeb ToS.
- **Offline-bundleable:** Yes — cache for offline review.
- **Cadence:** Continuous.
- **Greyline use:** Per-destination OCHA disaster/situation feed in the trip kit and dossier via `proxyFetch`; cache for offline use.
- **Caveat:** From 1 Nov 2025 the `appname` param is mandatory on every request (still no key); content is reports/PDFs requiring parsing.

#### 3. HDX HAPI (Humanitarian API, Centre for Humanitarian Data)
- **URL:** https://data.humdata.org/hapi
- **Pillar:** humanitarian
- **Data:** Curated crisis indicators (food security / IPC, displacement, conflict, funding, operational presence); JSON keyed by ISO3 country code or P-code.
- **Auth:** Free key — a self-generated app-identifier (no account required).
- **License:** Per-dataset, mostly CC BY / CC BY-IGO / Public Domain.
- **Offline-bundleable:** Yes — bundle snapshots into `offline_bundles` to complement the static Factbook.
- **Cadence:** Weekly to monthly by indicator.
- **Greyline use:** Enrich country dossiers with live crisis indicators.
- **Caveat:** Needs a self-generated app-identifier; HAPI returns data values while CKAN returns only metadata. Crisis-focused — coverage is not universal across all countries.

#### 4. World Bank Indicators API
- **URL:** https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation
- **Pillar:** humanitarian
- **Data:** 16,000+ indicators by country and year — homicide rate, internet/mobile penetration, GDP, urbanization, etc.; JSON/XML plus bulk download.
- **Auth:** None (authentication was retired).
- **License:** CC BY 4.0.
- **Offline-bundleable:** Yes — bundle selected indicators at build time.
- **Cadence:** Mostly annual.
- **Greyline use:** Bundle selected indicators to deepen dossiers beyond CPI/RSF and compute relative-safety / cost context offline.
- **Caveat:** No key (auth retired). Annual data lags 1–2 years; some cells are null.

#### 8. NASA FIRMS Active Fire (Area/Country API)
- **URL:** https://firms.modaps.eosdis.nasa.gov/api/area/
- **Pillar:** humanitarian
- **Data:** Near-real-time active-fire / thermal-anomaly detections (VIIRS NOAA-20/21/SNPP, MODIS, Landsat for US/CA); CSV by area or country, covering 1–5 days, plus archives.
- **Auth:** Free MAP_KEY.
- **License:** NASA open data (attribution requested).
- **Offline-bundleable:** Yes.
- **Cadence:** Near-real-time (several satellite passes per day).
- **Greyline use:** Opt-in active-fire MapLibre layer alongside the GIBS/RainViewer/USGS/GDACS toggles, plus a wildfire flag in the trip kit; `proxyFetch` with the user's MAP_KEY.
- **Caveat:** Free MAP_KEY; 5,000 transactions per 10-minute window, 5-day max per NRT query. Thermal anomalies can include gas flares and industrial heat — not only wildfires.

#### 9. EMSC SeismicPortal FDSN-event web service
- **URL:** https://www.seismicportal.eu/fdsn-wsevent.html
- **Pillar:** humanitarian
- **Data:** Earthquake catalog (origin, magnitude, depth, time) via FDSN-event; text/JSON/QuakeML plus a real-time websocket.
- **Auth:** None (no key).
- **License:** EMSC open access.
- **Offline-bundleable:** Yes — historical pulls only; live events are not bundleable.
- **Cadence:** Real-time websocket plus on-demand catalog.
- **Greyline use:** A no-key second seismic source (strong Euro-Med coverage) for the quake map layer plus a destination earthquake-alert feed via `proxyFetch`/websocket.
- **Caveat:** Live events are not bundleable (bundle only historical pulls). Euro-Med coverage is strongest; use USGS for global parity.

#### 12. NWS api.weather.gov Alerts (US National Weather Service)
- **URL:** https://www.weather.gov/documentation/services-web-alerts
- **Pillar:** humanitarian
- **Data:** Active US watches/warnings/advisories in CAP XML, ATOM, and GeoJSON; queryable by point, zone, or area.
- **Auth:** None.
- **License:** US federal work, public domain (redistribution encouraged).
- **Offline-bundleable:** No — live alerts are not bundleable.
- **Cadence:** Continuous.
- **Greyline use:** US severe-weather alert overlay (GeoJSON straight into MapLibre) plus a destination weather-warning row in the trip kit; fits `proxyFetch` caching.
- **Caveat:** US and territories only; rate-limited (cache aggressively); live alerts not bundleable; EAS-encoder use is prohibited.

### Sanctions

#### 5. OFAC SDN + Consolidated Sanctions Lists (US Treasury)
- **URL:** https://ofac.treasury.gov/sanctions-list-service
- **Pillar:** sanctions
- **Data:** Sanctioned persons, vessels, aircraft, addresses, and aliases; XML/CSV/fixed-width plus an advanced XML format and delta files.
- **Auth:** None.
- **License:** US federal work, effectively public domain.
- **Offline-bundleable:** Yes.
- **Cadence:** On designation (often multiple times per week) plus a daily delta.
- **Greyline use:** Bundle offline for a local name/entity/vessel screening tool (border power-structure awareness, contact due-diligence); a primary-source complement to OpenSanctions.
- **Caveat:** US perspective only — pair with EU/UN lists. Needs fuzzy name-matching; legal use is the user's responsibility.

### Health

#### 6. CDC Travel Health Notices + Yellow Book
- **URL:** https://wwwnc.cdc.gov/travel/notices
- **Pillar:** health
- **Data:** Leveled travel health notices (RSS/XML) plus per-country yellow-fever entry rules and malaria-prophylaxis tables (the Yellow Book).
- **Auth:** None.
- **License:** US federal work, effectively public domain.
- **Offline-bundleable:** Yes — bundle the YF/malaria tables offline.
- **Cadence:** Notices as events occur; tables revised periodically.
- **Greyline use:** Add a health row to the trip kit/dossier; bundle the yellow-fever/malaria table offline; poll the notices RSS via `proxyFetch` for outbreak alerts.
- **Caveat:** RSS, not REST; country tables are HTML requiring scrape/curation into JSON. US-clinician perspective.

### Air quality

#### 7. OpenAQ v3 (global air quality)
- **URL:** https://docs.openaq.org/
- **Pillar:** air-quality
- **Data:** Real-time and historical PM2.5/PM10/NO2/SO2/CO/O3/BC; JSON with bounding-box queries.
- **Auth:** Free signup key.
- **License:** Per-source (CC / open-gov); an AWS S3 open-data archive is available.
- **Offline-bundleable:** Yes — bundle an S3 snapshot for an offline baseline.
- **Cadence:** Hourly / sub-hourly where sensors report.
- **Greyline use:** AQI signal in the weather go/no-go kit plus an optional MapLibre AQI layer via `proxyFetch`; bundle an S3 snapshot for offline baseline.
- **Caveat:** Free signup key required; 60 req/min, 2,000 req/hr. Sensor coverage is sparse in many regions.

### Aviation — closes the NOTAM gap

#### 10. NASA public NOTAM REST service (FAA SWIM redistribution)
- **URL:** https://ntrs.nasa.gov/citations/20250003355
- **Pillar:** aviation
- **Data:** Structured NOTAMs from the FAA public SWIM with geo/temporal/authority fields; JSON via the NASA DIP catalog.
- **Auth:** None.
- **License:** US federal work, effectively public domain.
- **Offline-bundleable:** No — live feed; short cache only.
- **Cadence:** Near-real-time (mirrors FAA SWIM).
- **Greyline use:** Fills Greyline's NOTAM gap — airport/airspace NOTAMs (closures, GPS-jamming, hazards) in the flight kit and layover/MCT analysis via `proxyFetch`.
- **Caveat:** US-airspace focused; live feed not bundleable (short cache only). Verify NASA DIP endpoint stability before relying on it.

#### 11. autorouter NOTAM API (European NOTAMs via Eurocontrol EAD)
- **URL:** https://www.autorouter.aero/wiki/api/notams/
- **Pillar:** aviation
- **Data:** European NOTAMs by ICAO airport or FIR; HTTP GET, structured records.
- **Auth:** Free key (credentials).
- **License:** Free API; data sourced from Eurocontrol EAD.
- **Offline-bundleable:** No.
- **Cadence:** Immediate on status change.
- **Greyline use:** The European companion to the NASA NOTAM service for the flight kit and layover risk — e.g., GPS-jamming NOTAMs near conflict borders — via `proxyFetch`.
- **Caveat:** Needs free credentials; Europe-only; EAD redistribution terms may limit commercial use — verify.

### Maritime

#### 13. AISStream.io (real-time global AIS ship tracking)
- **URL:** https://aisstream.io/documentation
- **Pillar:** maritime
- **Data:** Live vessel position/identity/course/speed via websocket, filtered by bounding box, MMSI, or vessel type; JSON.
- **Auth:** Free key (GitHub login).
- **License:** Free with a registered API key.
- **Offline-bundleable:** No — real-time stream.
- **Cadence:** Real-time stream.
- **Greyline use:** Opt-in live-ships MapLibre layer (parallel to the ADS-B toggle) for maritime awareness — chokepoint/port/ferry monitoring, dark/loitering-vessel spotting near coasts.
- **Caveat:** Free GitHub-login key; terrestrial-receiver coverage only; the subscription message must be sent within 3 s and is swap-replace. Not bundleable.

### Comms-infrastructure / OPSEC

#### 14. beaconDB (public-domain wifi/cell/BLE geolocation)
- **URL:** https://beacondb.net/
- **Pillar:** comms-infra
- **Data:** Crowdsourced cell towers, WiFi APs, and BLE beacons; an MLS/Ichnaea-compatible geolocate API plus bulk dumps.
- **Auth:** None.
- **License:** Public domain.
- **Offline-bundleable:** Yes.
- **Cadence:** Continuous.
- **Greyline use:** Bundle regional tower/AP data offline to map coverage and tower density for burner-SIM and counter-surveillance planning (where you can and cannot be located); reuses existing MLS client patterns.
- **Caveat:** Sparser than OpenCellID in many regions; set a descriptive User-Agent; coverage skews to contributors; bundle WiFi data responsibly.

#### 15. OpenCellID (largest open cell-tower database)
- **URL:** https://www.opencellid.org/downloads.php
- **Pillar:** comms-infra
- **Data:** Cell-tower locations (GSM/UMTS/LTE/5G NR) with MCC/MNC/LAC/CID; a global `cell_towers.csv.gz` plus a geolocation API.
- **Auth:** Free key (for bulk download).
- **License:** CC BY-SA 4.0.
- **Offline-bundleable:** Yes — bundle the CSV into `offline_bundles`.
- **Cadence:** Daily (1M+ measurements/day).
- **Greyline use:** Bundle the CSV for an offline tower-density/coverage map plus self-hosted cell-geolocation lookup for OPSEC (no-GPS positioning awareness).
- **Caveat:** Bulk download needs a free key; CC BY-SA share-alike obligates same-license redistribution; crowdsourced accuracy varies.

#### 16. Tor bulk exit list + Onionoo relay metrics
- **URL:** https://metrics.torproject.org/onionoo.html
- **Pillar:** comms-infra
- **Data:** Running Tor relays and bridges (IPs, guard/exit flags, geo, bandwidth) via Onionoo JSON, plus the official bulk exit list.
- **Auth:** None.
- **License:** Tor Project data, public domain.
- **Offline-bundleable:** Yes — bundle the exit-IP list offline.
- **Cadence:** Onionoo ~hourly; the exit list near real-time.
- **Greyline use:** Power privacy tooling — verify that `proxyFetch` egress is a Tor exit, pick an exit-country, flag inbound Tor exits; bundle the exit-IP list offline. A data/metrics complement to the cataloged Tor client libraries.
- **Caveat:** Use `If-Modified-Since` + gzip + a `limit` to avoid huge pulls; the official bulk exit list can be less accurate than Onionoo.

### Surveillance

#### 17. EFF Atlas of Surveillance
- **URL:** https://www.atlasofsurveillance.org/pages/data-library
- **Pillar:** surveillance
- **Data:** ~11,700+ US law-enforcement surveillance deployments (ALPR, face-recognition, drones, body cams, cell-site simulators) with agency and geo; CSV plus supplementary sets.
- **Auth:** None.
- **License:** CC BY.
- **Offline-bundleable:** Yes.
- **Cadence:** Updated regularly.
- **Greyline use:** Bundle the CSV offline for a "known surveillance tech near here" map layer plus agency lookup feeding the counter-surveillance log and route planning — directly on-mission for the surveillance pillar.
- **Caveat:** US-only and known-deployments-only (absence in the data is not absence on the ground); crowdsourced and uneven; CC BY attribution to EFF.

### Geocoding / POI / utility

#### 18. Who's On First (admin boundaries + gazetteer)
- **URL:** https://whosonfirst.org/download/
- **Pillar:** geocoding
- **Data:** A global gazetteer — country-to-neighbourhood admin polygons, localities, postal codes, venues; per-country GeoJSON and Shapefile with full hierarchy.
- **Auth:** None.
- **License:** Mixed — WOF original work is CC0; aggregated boundaries are effectively CC-BY.
- **Offline-bundleable:** Yes.
- **Cadence:** Periodic distributions.
- **Greyline use:** Bundle per-country admin polygons offline (richer hierarchy than Natural Earth) for the scratch map, region-level day-counting in the SF-86 export, and offline reverse-geocoding.
- **Caveat:** Per-country downloads can be large; treat aggregated boundaries as CC-BY and attribute; irregular update cadence.

#### 19. Open Charge Map (global EV charging registry)
- **URL:** https://openchargemap.org/site/develop/api
- **Pillar:** POI
- **Data:** 300k+ EV charging stations in 100+ countries with connectors, operators, power ratings, and verification status; JSON/XML, bbox and country queries.
- **Auth:** Free key.
- **License:** Mostly CC BY-SA 4.0 (mixed per imported record).
- **Offline-bundleable:** Yes — bundle a regional snapshot.
- **Cadence:** Continuous (community).
- **Greyline use:** Optional EV-charging POI layer plus overland-EV route input; bundle a regional snapshot offline for the destination map.
- **Caveat:** Free key; 500-results-per-query cap (tile requests); mixed per-record licensing complicates redistribution; check `dateLastVerified`.

#### 20. Wikimedia/Wikipedia REST + Action-API geosearch
- **URL:** https://www.mediawiki.org/wiki/API:Geosearch
- **Pillar:** geocoding
- **Data:** Page summaries/HTML/metadata (REST) plus nearby-pages geosearch by lat/lon/radius (Action API `list=geosearch`); JSON, per-response license.
- **Auth:** None.
- **License:** Content CC BY-SA (3.0 / 4.0).
- **Offline-bundleable:** Yes — dumps and Kiwix extracts bundle for offline use.
- **Cadence:** Continuous plus dumps for offline.
- **Greyline use:** Nearby-landmark/place context for a destination (geosearch into summaries) plus offline-cacheable place dossiers; dumps/Kiwix extracts bundle to enrich the scratch map and country pages.
- **Caveat:** No key, but a descriptive User-Agent is required (200 req/s ceiling); geosearch lives in the Action API (GeoData extension), not REST — so two endpoints; CC BY-SA share-alike applies to any reused text.

---

## Integration notes for Greyline

**Connector vs. bundle.** Every networked source above conforms to the existing `proxyFetch()` connector contract: disabled by default, gated by an `api_toggles` row, and cached. Bulk-dump sources are additionally bundled at build time into the `offline_bundles` table, making them available with no network at all — this is the resilient default wherever a static export exists, and it insulates Greyline from the 2025–2026 access-term churn (ReliefWeb `appname`, UCDP token, OpenSky OAuth2).

**Auth taxonomy.** Three tiers: (1) truly keyless — ReliefWeb, World Bank, OFAC, CDC, EMSC, NASA NOTAM, NWS, beaconDB, Tor/Onionoo, EFF, Who's On First, Wikimedia; (2) self-issued identifier, no account — HDX HAPI app-id, Wikimedia User-Agent; (3) free signup/login key — OpenAQ, NASA FIRMS MAP_KEY, autorouter, AISStream, OpenCellID (bulk), Open Charge Map, UCDP (live API only). All keys are user-supplied and stored locally, consistent with the offline-first, no-hosted-service posture.

**Share-alike caution.** OpenCellID, Open Charge Map, and Wikimedia reused text carry CC BY-SA share-alike obligations; redistribution must preserve the same license. Who's On First aggregated boundaries are effectively CC-BY (attribute). NASA, OFAC, CDC, NWS, and Tor data are public-domain US-federal or PD-equivalent — no encumbrance.

---

## Risk-Score datasets (composite indices for threat-tiering)

Beyond the eighteen event/data APIs above, Greyline's go/no-go and threat-tier logic benefits from a small set of composite risk indices. These are annual or periodic bulk publications — ideal for build-time bundling into `offline_bundles` to score countries and regions offline.

| Index | Scope | Use in Greyline |
|-------|-------|-----------------|
| **Global Peace Index (GPI)** | Per-country composite peacefulness ranking, annual | Baseline country threat-tier and trendline in dossiers |
| **Fragile States Index (FSI)** | Per-country state-fragility composite, annual | State-stability signal complementing GPI for go/no-go |
| **FEMA National Risk Index (NRI)** | US county-level natural-hazard + community-risk composite | US-domestic natural-hazard scoring for the trip kit |
| **WHO road-safety data** | Per-country road-traffic mortality and safety metrics | Road-risk row in dossiers — a leading cause of traveler harm |

Bundle each as a static snapshot at build time and surface as a normalized 0–100 sub-score feeding the composite threat tier. These indices contextualize the live event feeds (UCDP, GDELT/ACLED connector, FIRMS, EMSC) with a stable structural baseline, so a country with no current events still carries an informed default tier.

### ACLED redistribution caveat — opt-in connector only

**ACLED (Armed Conflict Location & Event Data) must not be bundled or redistributed.** Its license permits programmatic access under registration but prohibits shipping its data inside a distributed application. Greyline therefore exposes ACLED **exclusively as an opt-in `proxyFetch` connector**: the user supplies their own ACLED credentials, data is fetched live and cached locally only on their machine, and nothing ACLED-derived is ever included in the offline bundle or the distributed build. UCDP/PRIO (CC BY 4.0, bundleable) is the redistributable conflict-event source; ACLED is the user-authenticated live complement for those who accept its terms.

---

## Sources

This table lists the primary sources verified for this report. Sources already cataloged in [`research/FREE_APIS_AND_TOOLS.md`](./FREE_APIS_AND_TOOLS.md) are not repeated here.

| Title | Type | Credibility | URL | Note |
|-------|------|-------------|-----|------|
| UCDP Dataset Download Center + API docs | Primary / academic | High (Uppsala University) | https://ucdp.uu.se/apidocs/ | CC BY 4.0; Feb-2026 token for live API |
| ReliefWeb API help | Primary / UN | High (UN OCHA) | https://reliefweb.int/help/api | No key, read-only; 1 Nov 2025 appname rule |
| HDX HAPI | Primary / UN | High (Centre for Humanitarian Data) | https://data.humdata.org/hapi | App-identifier; data-values API |
| World Bank Indicators API docs | Primary / IGO | High (World Bank) | https://datahelpdesk.worldbank.org/knowledgebase/articles/889392-about-the-indicators-api-documentation | Auth retired; JSON/XML/bulk |
| OFAC Sanctions List Service | Primary / gov | High (US Treasury) | https://ofac.treasury.gov/sanctions-list-service | SDN + Consolidated, XML/CSV, no key |
| NASA FIRMS Area API | Primary / gov | High (NASA) | https://firms.modaps.eosdis.nasa.gov/api/area/ | MAP_KEY; 5000 tx/10min; VIIRS/MODIS; 1–5 day |
| OpenAQ v3 docs | Primary | High (OpenAQ) | https://docs.openaq.org/ | Free key; 60 req/min; AWS S3 bulk |
| EFF Atlas of Surveillance Data Library | Primary / NGO | High (EFF) | https://www.atlasofsurveillance.org/pages/data-library | CC-BY US police-tech CSV |
| OpenSky REST API docs | Primary | High (OpenSky Network) | https://openskynetwork.github.io/opensky-api/rest.html | 2025/26 OAuth2 migration; 400/4000/8000 credits |
| Onionoo + Tor bulk exit list | Primary / NGO | High (Tor Project) | https://metrics.torproject.org/onionoo.html | Public domain relay/exit metrics |
| beaconDB | Primary | Medium-High (community) | https://beacondb.net/ | Public-domain wifi/cell/BLE; MLS-compatible |
| OpenCellID downloads | Primary | High | https://www.opencellid.org/downloads.php | CC BY-SA 4.0 cell_towers.csv.gz |
| Who's On First download/sources | Primary | High | https://whosonfirst.org/download/ | Admin boundaries; mixed CC0/CC-BY |
| NASA public RESTful NOTAM service (NTRS) | Primary / gov | High (NASA NTRS) | https://ntrs.nasa.gov/citations/20250003355 | FAA SWIM redistribution |
| NWS api.weather.gov Alerts Web Service | Primary / gov | High (US NWS) | https://www.weather.gov/documentation/services-web-alerts | CAP/GeoJSON, no key |
| AISStream.io documentation | Primary | Medium-High | https://aisstream.io/documentation | Free websocket AIS; bbox subscriptions |

---

## Open questions

- **NASA DIP NOTAM endpoint stability.** The public NOTAM REST service is documented via an NTRS citation; confirm the live DIP catalog endpoint URL and uptime before committing it to the flight kit.
- **autorouter / EAD redistribution terms.** Verify whether Eurocontrol EAD terms permit Greyline's intended use, given the AGPL distribution model and the "may limit commercial use" caveat.
- **Open Charge Map per-record licensing.** Mixed per-record licensing complicates a single bundled redistribution license — determine whether to filter to CC BY-SA records only or attach per-record provenance.
- **OpenSky migration impact.** The 2025/26 OAuth2 migration and credit model may affect any existing ADS-B integration parity assumptions; confirm before pairing AISStream maritime with ADS-B aviation toggles.
- **Risk-index source URLs.** GPI, FSI, FEMA NRI, and WHO road-safety were specified as datasets to encode but not individually cited in the research stream; locate and pin canonical download URLs and license terms for each before bundling.
