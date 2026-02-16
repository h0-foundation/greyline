# Gray Man Travel/Planning App - Free APIs & Open-Source Tools Research

> Research compiled: February 2026
> Focus: Free APIs (no account creation required), open-source self-hostable tools, offline-capable solutions

---

## Table of Contents
1. [Mapping & Route Planning](#1-mapping--route-planning)
2. [Weather APIs](#2-weather-apis)
3. [Country/City Information](#3-countrycity-information)
4. [Travel Safety & Advisories](#4-travel-safety--advisories)
5. [Currency & Financial](#5-currency--financial)
6. [Transportation](#6-transportation)
7. [Privacy-Focused Tools](#7-privacy-focused-tools)
8. [Local Data (Bundleable/Offline)](#8-local-data-bundleableoffline)
9. [News & Situational Awareness](#9-news--situational-awareness)
10. [Surveillance Awareness](#10-surveillance-awareness)
11. [Geocoding Services](#11-geocoding-services)
12. [Elevation & Terrain](#12-elevation--terrain)
13. [Timezone & Utility APIs](#13-timezone--utility-apis)
14. [IP Geolocation](#14-ip-geolocation)
15. [Recommendations Summary](#15-recommendations-summary)

---

## 1. Mapping & Route Planning

### 1.1 OpenStreetMap / Overpass API
- **URL:** https://overpass-api.de/ | https://overpass-turbo.eu/
- **Truly free:** YES - No account, no API key required
- **Rate limits:** Auto load-shedding per IP; default timeout 180s (extendable to 900s); max memory 512 MiB per request
- **Data format:** JSON, XML, CSV
- **Offline capability:** YES - Can download OSM data extracts (PBF format) from Geofabrik
- **Privacy:** No tracking; can self-host Overpass instance
- **Key features:**
  - Query any OSM tagged data (POIs, roads, buildings, surveillance cameras, embassies, hospitals, etc.)
  - Powerful query language (Overpass QL)
  - Multiple public instances available (main, Geofabrik, Kumi Systems)
- **Gray man uses:** Find embassies, hospitals, police stations, ATMs, hotels, transit stops, surveillance cameras

### 1.2 OSRM (Open Source Routing Machine)
- **URL:** https://github.com/Project-OSRM/osrm-backend | http://project-osrm.org/
- **Truly free:** YES - Open source (BSD 2-Clause); public demo API available
- **Rate limits:** Public demo server is for light testing only; self-hosted = unlimited
- **Data format:** JSON
- **Offline capability:** YES - Fully self-hostable with Docker
- **Privacy:** Self-hosted = zero data leakage
- **Key features:**
  - Route, Nearest, Table, Match, Trip, Tile services
  - Multiple transport profiles (car, bike, foot)
  - Written in C++ for high performance
  - Uses OSM data
- **Gray man uses:** Offline route planning, distance matrices, fastest/shortest path calculation

### 1.3 Valhalla Routing Engine
- **URL:** https://github.com/valhalla/valhalla
- **Truly free:** YES - Open source (MIT License)
- **Rate limits:** Self-hosted = unlimited
- **Data format:** JSON (GeoJSON routes)
- **Offline capability:** YES - Fully self-hostable via Docker
- **Privacy:** Complete control when self-hosted
- **Key features:**
  - Turn-by-turn routing, isochrones, time+distance matrices
  - Elevation sampling, map matching, tour optimization (TSP)
  - Multi-modal routing (driving, walking, biking, transit)
  - Dynamic, customizable costing models
  - Used by Tesla, Mapbox, Mapillary
- **Gray man uses:** Multi-modal route planning, isochrone analysis ("how far can I get in X minutes"), avoid areas

### 1.4 GraphHopper
- **URL:** https://github.com/graphhopper/graphhopper | https://www.graphhopper.com/open-source/
- **Truly free:** YES - Open source (Apache 2.0)
- **Rate limits:** Self-hosted = unlimited
- **Data format:** JSON
- **Offline capability:** YES - Runs on mobile devices, full offline support
- **Privacy:** Can run entirely offline on local hardware
- **Key features:**
  - Fast, memory-efficient Java routing engine
  - A-to-B routing, snap-to-road, isochrone calculation
  - GTFS integration for transit routing
  - Works on mobile devices
  - Version 11 released October 2025
- **Gray man uses:** Mobile-friendly offline routing, transit integration, lightweight deployment

### 1.5 OpenRouteService
- **URL:** https://openrouteservice.org/ | https://github.com/GIScience/openrouteservice
- **Truly free:** Open source, but hosted API requires free account registration
- **Rate limits:** Hosted API has quotas; self-hosted = unlimited
- **Data format:** JSON, GeoJSON
- **Offline capability:** YES - Fully self-hostable
- **Privacy:** Self-hosted = full control
- **Key features:**
  - Directions, isochrones, geocoding, matrix, elevation
  - Multiple transport profiles including wheelchair
  - Avoid area/feature parameters
  - Developed by Heidelberg University
- **Note:** Requires API key for hosted version, but can be self-hosted without any keys

### 1.6 OpenFreeMap
- **URL:** https://openfreemap.org/ | https://github.com/hyperknot/openfreemap
- **Truly free:** YES - No API key, no registration, no limits, no cookies
- **Rate limits:** None on public instance
- **Data format:** Vector tiles (MVT/PBF)
- **Offline capability:** YES - Self-hostable (300GB SSD, 4GB RAM minimum)
- **Privacy:** No cookies, no tracking
- **Key features:**
  - Production-quality vector tile hosting
  - Multiple styles: Liberty, Positron, Bright
  - Uses OpenMapTiles, Planetiler, MapLibre
  - Btrfs-based serving (no tile server process)
- **Gray man uses:** Base map tiles without any API keys or tracking

### 1.7 Protomaps / PMTiles
- **URL:** https://protomaps.com/ | https://github.com/protomaps/PMTiles
- **Truly free:** YES - Open source
- **Rate limits:** Self-hosted = unlimited
- **Data format:** PMTiles (single-file archive of vector tiles)
- **Offline capability:** YES - Designed for offline/static hosting; single file per region
- **Privacy:** Entirely local; no server needed (HTTP range requests or local file)
- **Key features:**
  - Single-file map archives (pyramid of tiles)
  - 70%+ size reduction through internal deduplication
  - Works with MapLibre, Leaflet, OpenLayers
  - Reference implementations in JS, C++, Python
  - Can serve from any static HTTP server
- **Gray man uses:** Bundle entire country/region maps in a single offline file

---

## 2. Weather APIs

### 2.1 Open-Meteo
- **URL:** https://open-meteo.com/ | https://github.com/open-meteo/open-meteo
- **Truly free:** YES - No API key, no registration required (non-commercial)
- **Rate limits:** 10,000 requests/day on free tier
- **Data format:** JSON
- **Offline capability:** Open source - can self-host
- **Privacy:** No tracking; CC BY 4.0 license
- **Key features:**
  - Global weather forecasts up to 16 days
  - Historical weather data
  - 1-11 km resolution from national weather services
  - Air quality data
  - Marine/ocean weather
  - Elevation API (Copernicus DEM, 90m resolution)
  - Flood forecasting
  - Climate change projections
- **Endpoints:**
  - `/v1/forecast` - Weather forecast
  - `/v1/elevation` - Terrain elevation
  - `/v1/air-quality` - Air quality index
  - `/v1/marine` - Ocean/marine conditions
  - `/v1/flood` - Flood risk
- **Gray man uses:** Weather planning for travel, severe weather alerts, marine conditions for coastal routes

---

## 3. Country/City Information

### 3.1 REST Countries API
- **URL:** https://restcountries.com/ | https://github.com/apilayer/restcountries
- **Truly free:** YES - No API key, no registration
- **Rate limits:** Unlimited
- **Data format:** JSON
- **Offline capability:** Can download full dataset (~250KB JSON for all countries)
- **Privacy:** No tracking
- **Key features:**
  - Country names (common, official, native), capitals, population
  - Languages, currencies, timezones
  - Borders (neighboring countries), region/subregion
  - Calling codes, TLDs, driving side
  - Flag images (SVG/PNG)
  - Gini coefficient (inequality)
  - UN membership status
- **Endpoints:** `/v3.1/all`, `/v3.1/name/{name}`, `/v3.1/alpha/{code}`
- **Gray man uses:** Quick country profiles, border info, currency/language lookup, driving side

### 3.2 CIA World Factbook (JSON)
- **URL:** https://github.com/factbook/factbook.json | https://github.com/iancoleman/cia_world_factbook_api
- **Truly free:** YES - Public domain (no copyright, no license needed)
- **Rate limits:** N/A (static files)
- **Data format:** JSON
- **Offline capability:** YES - Downloadable (~3MB latest, ~40MB historical)
- **Privacy:** No API calls needed; fully offline
- **Key features:**
  - 266 world entities covered
  - History, people, government, economy, energy, geography
  - Communications, transportation, military, terrorism
  - Transnational issues
  - Auto-updated weekly from CIA source
  - NOTE: CIA Factbook website retired Feb 4, 2026; JSON archives preserved
- **Gray man uses:** Deep country intelligence, military presence, terrorism risk, government structure

### 3.3 Wikidata (SPARQL Query Service)
- **URL:** https://query.wikidata.org/ | https://www.wikidata.org/wiki/Wikidata:SPARQL_query_service
- **Truly free:** YES - No authentication required
- **Rate limits:** Fair use; concurrent query limits apply
- **Data format:** JSON, XML (SPARQL results)
- **Offline capability:** Database dumps available for download
- **Privacy:** Queries are anonymous
- **Key features:**
  - 94+ million entities
  - Structured data on countries, cities, organizations, people
  - Languages, religions, ethnic groups, political systems
  - Historical events, geographic features
  - Cross-references to Wikipedia, other sources
- **Gray man uses:** Detailed structured data on any location, political figures, organizations

### 3.4 GeoNames
- **URL:** https://www.geonames.org/ | https://www.geonames.org/export/
- **Truly free:** Data downloads are free; web API requires free username registration
- **Rate limits:** API: limited (500 maxRows, 30km radius); Data dumps: no limits
- **Data format:** TSV (downloads), JSON/XML (API)
- **Offline capability:** YES - Full data dumps available (allCountries.zip)
- **Privacy:** Download approach = fully offline
- **Key features:**
  - 11+ million placenames worldwide
  - Administrative divisions, postal codes
  - Elevation data, timezone data
  - Alternative names in many languages
  - Country/region hierarchy
- **Gray man uses:** Offline placename database, geocoding reference data, timezone lookups

### 3.5 Wikivoyage (Travel Guide Data)
- **URL:** https://en.wikivoyage.org/ | https://dumps.wikimedia.org/enwikivoyage/
- **Truly free:** YES - Creative Commons licensed
- **Rate limits:** N/A for dumps
- **Data format:** XML (database dumps), HTML (API)
- **Offline capability:** YES - Full dumps <100MB; Kiwix offline reader available
- **Privacy:** Fully offline with downloaded data
- **Key features:**
  - 33,000+ travel destinations
  - Practical travel information (getting around, staying safe, customs)
  - Local culture and etiquette
  - Updated by global community
  - Available via Kiwix for offline browsing (v3.8.2, Jan 2026)
- **Gray man uses:** Cultural norms, local safety info, neighborhood guides, practical travel intelligence

### 3.6 CultureCrossing.net
- **URL:** https://guide.culturecrossing.net/
- **Truly free:** YES - Free website (no API)
- **Rate limits:** N/A (web scraping subject to ToS)
- **Data format:** HTML (no formal API)
- **Offline capability:** Would need to scrape/cache
- **Privacy:** Standard web access
- **Key features:**
  - Cross-cultural etiquette database for every country
  - Vetted by staff, cross-referenced with 2+ sources
  - Covers: greetings, dress, dining, business, communication styles
  - Community-contributed
- **Gray man uses:** Blend in culturally; understand local customs, greetings, taboos

---

## 4. Travel Safety & Advisories

### 4.1 US State Department Travel Advisories API
- **URL:** https://cadataapi.state.gov/api/TravelAdvisories
- **Truly free:** YES - No API key needed (government open data)
- **Rate limits:** Reasonable use
- **Data format:** JSON
- **Offline capability:** Can cache/download periodically
- **Privacy:** Standard HTTPS; government endpoint
- **Key features:**
  - Official US government travel advisories
  - Risk levels 1-4 per country
  - Specific risk categories (crime, terrorism, civil unrest, etc.)
- **Also available:** RSS feed at https://travel.state.gov/_res/rss/TAsTWs.xml
- **Gray man uses:** Official country risk assessment, specific threat types

### 4.2 Travel Advisory Data API (travel-advisory.info)
- **URL:** https://www.travel-advisory.info/api
- **Truly free:** YES - No authentication required
- **Rate limits:** Reasonable use
- **Data format:** JSON (UTF-8)
- **Offline capability:** Can cache daily updates
- **Privacy:** No account needed
- **Key features:**
  - Daily updated risk scores for every country (0.0 - 5.0 scale)
  - Aggregates advisories from multiple government sources
  - Normalized risk value per country
  - Simple REST API
- **Gray man uses:** Quantitative risk scoring, compare destinations, monitor changes

### 4.3 Australian Smartraveller API
- **URL:** https://www.smartraveller.gov.au/destinations-export
- **Truly free:** YES - Government open data
- **Rate limits:** Reasonable use
- **Data format:** JSON/XML
- **Offline capability:** Can download/cache
- **Privacy:** Government endpoint
- **Key features:**
  - Australian DFAT travel advisories
  - Risk levels and country codes
  - Different perspective from US advisories
- **GitHub wrapper:** https://github.com/kevle1/smartraveller-api
- **Gray man uses:** Second-source validation of country risk levels

### 4.4 GDELT Project
- **URL:** https://www.gdeltproject.org/ | https://blog.gdeltproject.org/gdelt-doc-2-0-api-debuts/
- **Truly free:** YES - 100% free and open (supported by Google Jigsaw)
- **Rate limits:** None documented for public API
- **Data format:** JSON, CSV, RSS, GeoJSON
- **Offline capability:** Full database downloadable; also on Google BigQuery
- **Privacy:** No account needed for API; BigQuery needs Google account
- **Key features:**
  - Monitors broadcast, print, web news globally
  - 100+ languages, 65 machine-translated languages
  - Updates every 15 minutes
  - Historical data back to January 1, 1979
  - Event database + Global Knowledge Graph
  - DOC 2.0 API: full-text search of rolling 3-month window
  - Tone analysis, image analysis, theme extraction
  - Geographic tagging of events
- **Key APIs:**
  - DOC 2.0 API (article search)
  - GEO 2.0 API (geographic event mapping)
  - TV API (television news monitoring)
  - Context API
- **Gray man uses:** Real-time situational awareness, conflict monitoring, protest tracking, event analysis by location

### 4.5 ACLED (Armed Conflict Location & Event Data)
- **URL:** https://acleddata.com/ | https://acleddata.com/acled-api-documentation
- **Truly free:** Free tier available, but requires account registration
- **Rate limits:** Varies by tier
- **Data format:** JSON, CSV
- **Offline capability:** Data export available for download
- **Privacy:** Requires account (email, organization info)
- **Key features:**
  - Real-time conflict and protest data globally
  - Event types: battles, violence against civilians, protests, riots
  - Disaggregated event-level data
  - Early Warning Dashboard with risk tools
- **Note:** Free "myACLED" tier provides dashboards and aggregated data; disaggregated data may require higher tiers
- **Gray man uses:** Conflict zone mapping, protest monitoring, civil unrest tracking

### 4.6 OpenSanctions
- **URL:** https://www.opensanctions.org/ | https://github.com/opensanctions/opensanctions
- **Truly free:** Free for non-commercial use; requires API key registration
- **Rate limits:** Varies
- **Data format:** JSON
- **Offline capability:** Bulk data downloads available
- **Privacy:** Requires registration
- **Key features:**
  - 320+ data sources
  - Sanctions lists, PEPs, most wanted lists
  - Entity matching and screening
  - Global coverage
- **Gray man uses:** Sanctions awareness for border crossings, understanding local power structures

---

## 5. Currency & Financial

### 5.1 fawazahmed0/exchange-api
- **URL:** https://github.com/fawazahmed0/exchange-api
- **Truly free:** YES - No API key, no rate limits, MIT license
- **Rate limits:** NONE
- **Data format:** JSON
- **Offline capability:** Can cache; also available via jsDelivr CDN
- **Privacy:** No key to leak; CDN-served; can self-host
- **Key features:**
  - 200+ currencies (fiat + crypto + precious metals)
  - ISO-4217 fiat currencies
  - Top 100 cryptocurrencies
  - Gold (XAU), Silver (XAG), Palladium, Platinum
  - Forever free (bandwidth paid by Cloudflare/jsDelivr)
  - 5k+ GitHub stars
- **Example:** `https://cdn.jsdelivr.net/gh/fawazahmed0/exchange-api@1/latest/currencies/usd/eur.json`
- **Gray man uses:** Currency conversion without any tracking, offline rate caching

### 5.2 Frankfurter API
- **URL:** https://frankfurter.dev/ | https://github.com/lineofflight/frankfurter
- **Truly free:** YES - No authentication, no rate limits
- **Rate limits:** NONE
- **Data format:** JSON
- **Offline capability:** Open source; self-hostable
- **Privacy:** No tracking, no auth needed
- **Key features:**
  - European Central Bank exchange rates
  - Historical rates available
  - Running for over a decade
  - Institutional/non-commercial data source
  - Self-hostable for greater control
- **API endpoint:** https://api.frankfurter.dev/
- **Gray man uses:** Trustworthy exchange rates from ECB, self-hostable

### 5.3 ExchangeRate-API (Open Access)
- **URL:** https://www.exchangerate-api.com/docs/free
- **Truly free:** YES - No API key for open access endpoint
- **Rate limits:** 1 request per 24 hours (or hourly for small projects)
- **Data format:** JSON
- **Offline capability:** Cache daily rates
- **Privacy:** No API key needed
- **Key features:**
  - Simple open-access endpoint
  - Daily updated rates
  - Good for low-frequency updates
- **Gray man uses:** Daily rate caching for offline use

---

## 6. Transportation

### 6.1 Mobility Database (GTFS Feeds)
- **URL:** https://mobilitydatabase.org/ | https://github.com/MobilityData
- **Truly free:** YES - Free, open-source platform
- **Rate limits:** N/A for downloads
- **Data format:** GTFS (static), GTFS-RT (realtime), GBFS
- **Offline capability:** YES - Download GTFS feeds for offline use
- **Privacy:** No tracking for downloads
- **Key features:**
  - 4,000+ feeds from 70+ countries
  - Both static schedules and real-time data
  - Searchable by location, status, features
  - Replaces deprecated TransitFeeds.com
- **Gray man uses:** Download transit schedules for any city, plan routes without real-time tracking

### 6.2 OpenTripPlanner
- **URL:** https://www.opentripplanner.org/ | https://github.com/opentripplanner/OpenTripPlanner
- **Truly free:** YES - Open source (LGPL)
- **Rate limits:** Self-hosted = unlimited
- **Data format:** JSON API
- **Offline capability:** YES - Fully self-hostable with downloaded OSM + GTFS data
- **Privacy:** Complete control when self-hosted
- **Key features:**
  - Multi-modal trip planning (transit + walk + bike + car)
  - Uses OSM + GTFS + GTFS-RT + GBFS + NeTEx data
  - Real-time service alerts integration
  - Park-and-ride support
  - Bike share integration
  - Running since 2009
- **Gray man uses:** Offline multi-modal route planning, transit-aware routing

### 6.3 ADSB.lol (Flight Tracking)
- **URL:** https://www.adsb.lol/ | https://api.adsb.lol/docs
- **Truly free:** YES - Currently no API key needed, no rate limits
- **Rate limits:** Currently NONE (future: may require feeder API key)
- **Data format:** JSON (compatible with ADSBExchange Rapid API format)
- **Offline capability:** Historical daily archives available
- **Privacy:** Community-powered; open data (ODbL 1.0)
- **Key features:**
  - Unfiltered flight tracking (no military/government filtering)
  - Live aircraft positions from ADS-B volunteer feeders
  - Drop-in replacement for ADS-B Exchange API
  - Open data focus
- **Gray man uses:** Monitor flights in/out of region, awareness of military activity, airport status

### 6.4 OpenSky Network
- **URL:** https://opensky-network.org/ | https://openskynetwork.github.io/opensky-api/
- **Truly free:** Partially - Anonymous access available with limitations; full API access may require account
- **Rate limits:** Anonymous: 10 second resolution, limited history; Registered: 5 second resolution, 1 hour history, 4000 credits/day
- **Data format:** JSON
- **Offline capability:** Historical data available
- **Privacy:** Anonymous access possible
- **IMPORTANT NOTE:** Accounts created after March 2025 have limited API access due to migration issues
- **Gray man uses:** Flight tracking, airspace monitoring

---

## 7. Privacy-Focused Tools

### 7.1 Tor Network Integration
- **URL:** https://www.torproject.org/ | https://github.com/ajvb/awesome-tor
- **Truly free:** YES - Free and open source
- **Key libraries:**
  - **Stem** (Python): Control Tor programmatically; manage circuits, rotate exit nodes
  - **Tor Onion Proxy Library** (Java/Android): Embed Tor in Java/Android apps
  - **Tor.framework** (iOS): Embed Tor in iOS applications
  - **Orbot** (Android): System-wide VPN via Tor
  - **iCepa** (iOS): System-wide VPN based on Tor
- **Integration method:** SOCKS5 proxy (default port 9050); control via ControlPort
- **Privacy:** Maximum anonymity; onion routing through 3+ relays
- **Key features:**
  - Route all app traffic through Tor
  - Rotate exit nodes per request
  - Access .onion services
  - Bridge support for censored regions
  - Pluggable transports (obfs4, snowflake)
- **Gray man uses:** Anonymous API requests, censorship circumvention, anonymous browsing

### 7.2 WireGuard VPN
- **URL:** https://www.wireguard.com/
- **Truly free:** YES - Open source (GPLv2)
- **Key features:**
  - Fast, modern VPN protocol
  - Minimal codebase (~4,000 lines)
  - Built into Linux kernel
  - Available for all major platforms
  - Static public key authentication
  - Excellent performance
- **Privacy:** Fully self-controlled; no third-party servers
- **Gray man uses:** Encrypt all traffic to personal server, bypass local surveillance/censorship

### 7.3 Tailscale
- **URL:** https://tailscale.com/ | https://github.com/tailscale/tailscale
- **Truly free:** Free tier for personal use (up to 100 devices)
- **Key features:**
  - Mesh VPN built on WireGuard
  - Zero-config networking
  - Automatic key distribution
  - Works through firewalls/NATs
  - MagicDNS for device naming
- **Privacy consideration:** Coordination servers see metadata (but not traffic content)
- **Alternative (more private):** Headscale (https://github.com/juanfont/headscale) - self-hosted Tailscale control server
- **Gray man uses:** Easy VPN access to home network from anywhere, route traffic through home

### 7.4 Matrix Protocol (Secure Communication)
- **URL:** https://matrix.org/ | https://github.com/matrix-org
- **Truly free:** YES - Open standard, open source
- **Key features:**
  - End-to-end encrypted messaging
  - Decentralized (federated servers)
  - RESTful HTTP APIs
  - Voice/video calls (Element Call)
  - Adopted by EU, UN, ICC, French government, German healthcare, European armed forces
  - Matrix 2.0 released late 2024
  - Can self-host Synapse server
- **Privacy:** E2EE by default; can run own server; no central authority
- **Gray man uses:** Secure communication that doesn't depend on any single provider

### 7.5 Signal Protocol
- **URL:** https://signal.org/ | https://github.com/signalapp
- **Truly free:** YES - Open source
- **Key features:**
  - Gold standard E2EE protocol
  - Disappearing messages
  - No metadata collection
  - Phone number based (privacy trade-off)
- **Gray man uses:** Secure person-to-person communication

### 7.6 LibreTranslate
- **URL:** https://libretranslate.com/ | https://github.com/LibreTranslate/LibreTranslate
- **Truly free:** YES - Open source (AGPL)
- **Rate limits:** Public instance has limits; self-hosted = unlimited
- **Data format:** JSON API
- **Offline capability:** YES - Fully self-hostable, offline capable
- **Privacy:** All translation happens locally when self-hosted
- **Key features:**
  - Machine translation API
  - Self-hosted, no internet required
  - Multiple language pairs
  - REST API compatible
- **Gray man uses:** Translate text without sending data to third parties

---

## 8. Local Data (Bundleable/Offline)

### 8.1 Geofabrik OSM Extracts
- **URL:** https://download.geofabrik.de/
- **Truly free:** YES - No account, free download (ODbL license)
- **Data format:** PBF (Protocol Buffers), OSM XML, Shapefiles
- **Offline capability:** YES - Entire purpose is offline data
- **Key features:**
  - Daily updated OSM extracts by continent, country, and sub-region
  - Daily diff files for incremental updates
  - Organized hierarchically (continent > country > state/province)
  - PBF format is compact and efficient
- **Size examples:**
  - Germany: ~4GB PBF
  - United Kingdom: ~1.5GB PBF
  - Planet (entire world): ~70GB PBF
- **Gray man uses:** Bundle offline maps for target regions

### 8.2 OpenMapTiles
- **URL:** https://openmaptiles.org/
- **Truly free:** YES - Open source (BSD + CC-BY)
- **Data format:** MBTiles (SQLite-based tile archives), Vector tiles
- **Offline capability:** YES - Designed for self-hosting and offline use
- **Key features:**
  - World maps from OSM data in vector tile format
  - Self-hostable on private cloud or offline laptop
  - Customizable styles
  - Works with MapLibre GL JS
- **Gray man uses:** Self-hosted offline map rendering

### 8.3 Map Rendering Libraries

#### MapLibre GL JS
- **URL:** https://maplibre.org/
- **License:** BSD-2-Clause (fully open source)
- **Key features:** WebGL-based vector map rendering, 3D support, dynamic styling, growing adoption since 2024
- **Gray man uses:** Client-side map rendering with no external dependencies

#### Leaflet.js
- **URL:** https://leafletjs.com/
- **License:** BSD-2-Clause
- **Key features:** Lightweight (42KB), massive plugin ecosystem, 1.4M+ monthly downloads, mobile-friendly
- **Gray man uses:** Simple, lightweight map rendering

### 8.4 Argos Translate (Offline Translation)
- **URL:** https://github.com/argosopentech/argos-translate | https://www.argosopentech.com/
- **Truly free:** YES - Open source (MIT)
- **Data format:** Python library; .argosmodel language packs
- **Offline capability:** YES - Fully offline after downloading language models
- **Key features:**
  - OpenNMT-based translation engine
  - 30+ languages supported
  - Automatic pivot translation through intermediate languages
  - Python library, CLI, and GUI
  - SentencePiece tokenization
  - Installable via pip
- **Gray man uses:** Offline text translation, no data sent anywhere

### 8.5 Mozilla Offline Translator
- **URL:** https://f-droid.org/packages/dev.davidv.translator/
- **Truly free:** YES - Open source
- **Offline capability:** YES - All translation on-device using Mozilla's models
- **Key features:** 43 languages, no internet required after model download
- **Gray man uses:** Phone-based offline translation

### 8.6 CIA World Factbook (Offline Bundle)
- See Section 3.2 - ~3MB JSON file with comprehensive country data
- **Gray man uses:** Bundle complete country intelligence profiles offline

### 8.7 Wikivoyage Offline
- See Section 3.5 - Available via Kiwix, database dumps <100MB
- **Gray man uses:** Complete offline travel guide for 33,000+ destinations

### 8.8 Cultural Data Sources (for bundling)

#### Wikibooks - National Etiquette Differences
- **URL:** https://en.wikibooks.org/wiki/National_Etiquette_Differences_in_Europe
- **Free:** YES - Creative Commons
- **Coverage:** European countries; community-maintained

#### NORMAD Dataset (Academic)
- Stories of everyday situations exemplifying social etiquette in 75 countries
- Academic dataset; may require citation

#### Hofstede Cultural Dimensions
- Cultural dimension scores for countries (can be bundled as reference data)
- Power Distance, Individualism, Masculinity, Uncertainty Avoidance, Long-Term Orientation, Indulgence

### 8.9 REST Countries (Offline Bundle)
- See Section 3.1 - Single JSON file with all country data
- Includes: driving side, languages, currencies, calling codes, borders
- **Gray man uses:** Offline reference for every country's basic facts

---

## 9. News & Situational Awareness

### 9.1 GDELT Project (Primary Recommendation)
- See Section 4.4 for full details
- **Key for news:** DOC 2.0 API searches rolling 3-month window of global news
- **Output formats include RSS** - can be integrated into feed readers
- **Updates every 15 minutes**
- **Gray man uses:** Real-time global news monitoring, event detection, tone analysis

### 9.2 RSS Feeds (Local News Aggregation)
- **Truly free:** YES - RSS is an open standard
- **Key sources:**
  - Major international news outlets (BBC, Reuters, Al Jazeera, etc.)
  - Local newspapers (many provide RSS feeds)
  - Government alert feeds
  - GDELT RSS output
  - US State Department travel advisory RSS
- **Offline capability:** Can cache feeds using RSS reader/aggregator
- **Tools:**
  - **Miniflux** (https://miniflux.app/) - Self-hosted, open source RSS reader
  - **FreshRSS** (https://freshrss.org/) - Self-hosted RSS aggregator
  - **Newsboat** (https://newsboat.org/) - Terminal RSS reader
- **Gray man uses:** Curate local news feeds for destination countries without using trackable news apps

### 9.3 Free News APIs (Require Registration)
- **NewsData.io** - Free tier: 200 requests/day, 10 results per request
- **NewsAPI.ai** - Free tier: 2,000 searches, 200,000 articles, past 30 days
- **Note:** These require API key registration
- **Alternative:** GDELT is preferred as it requires no registration

---

## 10. Surveillance Awareness

### 10.1 OpenStreetMap Surveillance Camera Data
- **URL:** https://overpass-turbo.eu/ (query interface)
- **Truly free:** YES - No account needed
- **OSM Tags:**
  - `man_made=surveillance` - General surveillance equipment
  - `surveillance=camera` - Specifically cameras
  - `surveillance:type=camera` - Camera type
  - `surveillance:type=ALPR` - Automatic License Plate Recognition
  - `surveillance:type=guard` - Human guards
- **Example Overpass Query:**
  ```
  [out:json][timeout:25];
  area["name"="London"]->.searchArea;
  nwr["man_made"="surveillance"](area.searchArea);
  out body;
  ```
- **Tools for visualization:**
  - Overpass Turbo (web-based visualization)
  - osmcamera.dihe.de (camera map viewer)
  - Surveillance under Surveillance (https://sunders.uber.space/)
- **Data quality note:** Coverage varies greatly by region; Western Europe and some Asian cities have better coverage
- **Gray man uses:** Map CCTV cameras, ALPR systems, and other surveillance in target areas

### 10.2 Comparitech Surveillance Data
- **URL:** https://www.comparitech.com/vpn-privacy/the-worlds-most-surveilled-cities/
- **Truly free:** YES - Published research data
- **Data format:** Spreadsheet (downloadable via BatchGeo)
- **Key features:**
  - CCTV camera counts for 150+ major cities worldwide
  - Cameras per capita and per square kilometer
  - Government vs. private camera counts
  - Annual updates (latest: June 2025)
- **Key findings:**
  - Chennai, India: 657 cameras/km^2 (#1 globally)
  - London: 73 cameras per 1,000 people (#3)
  - China and India have highest urban CCTV densities
- **Gray man uses:** Pre-trip surveillance density assessment by city

### 10.3 MapScaping Surveillance Camera Finder
- **URL:** https://mapscaping.com/surveillance-camera-finder/
- **Truly free:** YES - Uses OSM data
- **Key features:**
  - Visual map interface for finding surveillance equipment
  - Shows CCTV cameras, speed cameras, traffic monitors, environmental sensors
  - Based on OpenStreetMap crowdsourced data
- **Gray man uses:** Visual reconnaissance of camera locations in specific areas

---

## 11. Geocoding Services

### 11.1 Nominatim
- **URL:** https://nominatim.org/ | https://nominatim.openstreetmap.org/
- **Truly free:** YES - No account, no API key
- **Rate limits:** Max 1 request/second; must provide User-Agent header
- **Data format:** JSON, XML, HTML
- **Offline capability:** YES - Self-hostable (needs significant disk/RAM)
- **Privacy:** Anonymous; self-hostable for zero leakage
- **Key features:**
  - Forward geocoding (address -> coordinates)
  - Reverse geocoding (coordinates -> address)
  - OpenStreetMap data
  - Version 5.2.0 (current)
- **Gray man uses:** Convert addresses to coordinates and vice versa without using Google

### 11.2 Photon Geocoder
- **URL:** https://photon.komoot.io/ | https://github.com/komoot/photon
- **Truly free:** YES - Public demo API; open source (Apache 2.0)
- **Rate limits:** Demo: "reasonable limit" (throttled/banned for abuse); Self-hosted: unlimited
- **Data format:** GeoJSON
- **Offline capability:** YES - Self-hostable; pre-built database dumps available (~95GB planet-wide)
- **Privacy:** Self-hosted = complete privacy
- **Key features:**
  - Elasticsearch/OpenSearch based
  - Very fast autocomplete
  - Multilingual search
  - Structured and reverse geocoding
  - Weekly updated database dumps from GraphHopper
- **Gray man uses:** Fast, private geocoding; offline capable

### 11.3 Pelias Geocoder
- **URL:** https://pelias.io/ | https://github.com/pelias/pelias
- **Truly free:** YES - Open source (MIT); part of Linux Foundation
- **Rate limits:** Self-hosted = unlimited
- **Data format:** GeoJSON (per Mapzen Search/Pelias spec)
- **Offline capability:** YES - Docker-based self-hosting
- **Privacy:** Self-hosted = complete control
- **Key features:**
  - Modular design, multiple data importers
  - Sources: OSM, OpenAddresses, Who's on First, GeoNames, Polylines
  - Fast autocomplete
  - Multi-language support
  - Works with private data too
- **Gray man uses:** Most flexible self-hosted geocoding option

---

## 12. Elevation & Terrain

### 12.1 Open-Meteo Elevation API
- **URL:** https://open-meteo.com/en/docs/elevation-api
- **Truly free:** YES - No API key needed
- **Rate limits:** Part of Open-Meteo 10,000/day limit
- **Data format:** JSON
- **Resolution:** 90 meters (Copernicus DEM GLO-90)
- **Gray man uses:** Terrain assessment for route planning

### 12.2 Open-Elevation
- **URL:** https://open-elevation.com/ | https://github.com/Jorl17/open-elevation
- **Truly free:** YES - Open source (GPLv2); public API free up to 1,000 requests/month
- **Self-hostable:** YES
- **Data:** SRTM dataset
- **Gray man uses:** Elevation profiles for routes

### 12.3 Open Topo Data
- **URL:** https://www.opentopodata.org/
- **Truly free:** YES - Open source
- **Rate limits:** Public API: 100 locations/request, 1 call/second, 1000 calls/day
- **Self-hostable:** YES
- **Gray man uses:** Detailed terrain data for route assessment

---

## 13. Timezone & Utility APIs

### 13.1 Time.now World Time API
- **URL:** https://time.now/developer
- **Truly free:** YES - No API key required
- **Data format:** JSON
- **Features:** Current local time, timezone offsets, DST status, IP geolocation
- **Gray man uses:** Timezone-aware scheduling

### 13.2 TimeZoneDB
- **URL:** https://timezonedb.com/
- **Truly free:** Free for personal use; requires free API key registration
- **Rate limits:** 1 request/second (no total limit)
- **Gray man uses:** Timezone lookups

### 13.3 WorldTimeAPI (SUNSET)
- **URL:** https://worldtimeapi.org/ - **NO LONGER AVAILABLE**
- **Replacement:** https://timeapi.world/ (backwards compatible)

---

## 14. IP Geolocation

### 14.1 IP-API.com
- **URL:** https://ip-api.com/
- **Truly free:** YES - No API key, no registration (since 2012)
- **Rate limits:** 45 HTTP requests/minute per IP
- **Data format:** JSON, XML, CSV, PHP serialized
- **Key features:**
  - Country, city, region, coordinates
  - ISP, organization, AS number
  - Timezone, currency
  - Mobile/proxy detection
- **Privacy note:** HTTP only for free tier (no HTTPS)
- **Gray man uses:** Determine apparent location, detect VPN/proxy effectiveness

### 14.2 FreeIPAPI
- **URL:** https://freeipapi.com/
- **Truly free:** YES - No registration
- **Rate limits:** 60 requests/minute
- **Gray man uses:** Alternative IP geolocation check

### 14.3 IPWHOIS.io
- **URL:** https://ipwhois.io/
- **Truly free:** YES - No registration
- **Key features:** IP geolocation, ASN lookup, privacy detection
- **Gray man uses:** Check if connection appears to originate from expected location

---

## 15. Recommendations Summary

### Tier 1: Core (No Account Required, Truly Free)

| Category | Recommended Tool | Why |
|----------|-----------------|-----|
| **Mapping** | OpenFreeMap + PMTiles | Zero tracking, offline, no API keys |
| **Routing** | Valhalla (self-hosted) | Most feature-rich, MIT license, offline |
| **Geocoding** | Photon (self-hosted) | Fast, offline, private |
| **Weather** | Open-Meteo | No auth, comprehensive, includes elevation |
| **Country Data** | REST Countries + CIA Factbook JSON | No auth, offline-bundleable |
| **Currency** | fawazahmed0/exchange-api | No auth, no rate limits, 200+ currencies |
| **Travel Advisory** | travel-advisory.info + US State Dept API | No auth, quantitative risk scores |
| **News/Events** | GDELT DOC 2.0 API | No auth, 15-min updates, global |
| **Surveillance** | OSM Overpass (man_made=surveillance) | No auth, queryable by area |
| **Translation** | Argos Translate (offline) | Fully offline, 30+ languages |
| **Travel Guides** | Wikivoyage (Kiwix offline) | 33,000+ destinations, offline |
| **Transit** | Mobility Database GTFS + OpenTripPlanner | Downloadable feeds, offline planner |
| **Flight Tracking** | ADSB.lol | No auth (currently), unfiltered data |
| **IP Geolocation** | IP-API.com | No auth, 45 req/min |
| **Map Rendering** | MapLibre GL JS | Open source, vector tiles, offline-capable |
| **Comms** | Matrix Protocol | E2EE, federated, self-hostable |
| **VPN** | WireGuard | Open source, kernel-level, fast |
| **Privacy Routing** | Tor (Stem library) | Maximum anonymity |

### Tier 2: Valuable but Requires Free Account

| Tool | Account Needed | Worth It? |
|------|---------------|-----------|
| GeoNames API | Free username | YES - 11M+ placenames |
| OpenRouteService API | Free API key | YES - but self-host instead |
| ACLED | Free account | YES - best conflict data |
| OpenSanctions | Free API key | MAYBE - niche use case |
| TimeZoneDB | Free API key | NO - use Time.now instead |

### Tier 3: Data for Offline Bundling

| Data Source | Size | Update Frequency | Format |
|-------------|------|------------------|--------|
| Geofabrik OSM extracts | 50MB-70GB per region | Daily | PBF |
| PMTiles map files | Varies by region | As needed | PMTiles |
| CIA World Factbook JSON | ~3MB | Weekly | JSON |
| REST Countries data | ~250KB | Infrequent | JSON |
| Wikivoyage dumps | <100MB | Regular | XML |
| GeoNames data dump | ~350MB (allCountries) | Daily | TSV |
| GTFS transit feeds | Varies (1-100MB each) | Agency-specific | GTFS |
| Argos Translate models | ~100MB per language pair | Periodic | .argosmodel |
| Wikidata dumps | Large (100GB+) | Weekly | JSON/RDF |
| Comparitech CCTV data | Small (<1MB) | Annual | CSV |
| fawazahmed0 currency data | Small | Daily | JSON |

### Privacy Architecture Recommendation

```
[User Device]
    |
    |-- WireGuard VPN --> [Personal VPS/Home Server]
    |                          |
    |                          |-- Tor Circuit (for sensitive queries)
    |                          |-- Direct (for non-sensitive queries)
    |
    |-- Offline Data Layer (local)
    |       |-- PMTiles (maps)
    |       |-- Valhalla/GraphHopper (routing)
    |       |-- Argos Translate (translation)
    |       |-- CIA Factbook + REST Countries (country data)
    |       |-- Wikivoyage/Kiwix (travel guides)
    |       |-- GTFS feeds (transit)
    |       |-- Currency rates (cached daily)
    |
    |-- Online APIs (through VPN/Tor)
    |       |-- Open-Meteo (weather)
    |       |-- GDELT (news/events)
    |       |-- travel-advisory.info (risk scores)
    |       |-- ADSB.lol (flight tracking)
    |       |-- Overpass API (OSM queries)
    |
    |-- Secure Comms
            |-- Matrix (messaging)
            |-- Signal (backup)
```

---

## Sources

- [Overpass API - OpenStreetMap Wiki](https://wiki.openstreetmap.org/wiki/Overpass_API)
- [OSRM - GitHub](https://github.com/Project-OSRM/osrm-backend)
- [Valhalla - GitHub](https://github.com/valhalla/valhalla)
- [GraphHopper - GitHub](https://github.com/graphhopper/graphhopper)
- [OpenRouteService](https://openrouteservice.org/)
- [OpenFreeMap](https://openfreemap.org/)
- [Protomaps / PMTiles](https://protomaps.com/)
- [Open-Meteo](https://open-meteo.com/)
- [REST Countries](https://restcountries.com/)
- [CIA World Factbook JSON](https://github.com/factbook/factbook.json)
- [Wikidata SPARQL](https://query.wikidata.org/)
- [GeoNames](https://www.geonames.org/)
- [Wikivoyage](https://en.wikivoyage.org/)
- [CultureCrossing.net](https://guide.culturecrossing.net/)
- [US State Department Travel Advisories](https://cadataapi.state.gov/api/TravelAdvisories)
- [Travel-Advisory.info](https://www.travel-advisory.info/api)
- [Australian Smartraveller](https://www.smartraveller.gov.au/)
- [GDELT Project](https://www.gdeltproject.org/)
- [ACLED](https://acleddata.com/)
- [OpenSanctions](https://www.opensanctions.org/)
- [fawazahmed0/exchange-api](https://github.com/fawazahmed0/exchange-api)
- [Frankfurter API](https://frankfurter.dev/)
- [ExchangeRate-API](https://www.exchangerate-api.com/docs/free)
- [Mobility Database](https://mobilitydatabase.org/)
- [OpenTripPlanner](https://www.opentripplanner.org/)
- [ADSB.lol](https://www.adsb.lol/)
- [OpenSky Network](https://opensky-network.org/)
- [Tor Project](https://www.torproject.org/)
- [WireGuard](https://www.wireguard.com/)
- [Tailscale](https://tailscale.com/)
- [Matrix Protocol](https://matrix.org/)
- [Signal](https://signal.org/)
- [LibreTranslate](https://libretranslate.com/)
- [Argos Translate](https://github.com/argosopentech/argos-translate)
- [Geofabrik Downloads](https://download.geofabrik.de/)
- [OpenMapTiles](https://openmaptiles.org/)
- [MapLibre GL JS](https://maplibre.org/)
- [Leaflet.js](https://leafletjs.com/)
- [Nominatim](https://nominatim.org/)
- [Photon Geocoder](https://photon.komoot.io/)
- [Pelias Geocoder](https://pelias.io/)
- [Open-Elevation](https://open-elevation.com/)
- [Open Topo Data](https://www.opentopodata.org/)
- [IP-API.com](https://ip-api.com/)
- [Comparitech CCTV Study](https://www.comparitech.com/vpn-privacy/the-worlds-most-surveilled-cities/)
- [MapScaping Surveillance Finder](https://mapscaping.com/surveillance-camera-finder/)
- [OSM Surveillance Tags](https://wiki.openstreetmap.org/wiki/Tag:man_made=surveillance)
- [Overpass Turbo for Surveillance](https://hackers-arise.com/osint-finding-surveillance-cameras-with-overpass-turbo/)
