# Greyline — Product Thesis & Roadmap

_Synthesis of the research corpus in this directory. Decisions here were reviewed and approved by the project owner (2026-05)._

## Thesis

Greyline's local-only / AGPL stance is a genuine commercial wedge, not just ideology. The cloud travel-risk incumbents (International SOS ~$50k/yr, Crisis24, Riskline) sell two things Greyline structurally **cannot and should not** build — a 24/7 SOC/medevac and live GPS traveler tracking — and those are exactly the surveillance-heavy, subpoena-able, expensive parts. Everything else buyers pay for (country/city **risk scores**, pre-trip **risk briefings**, an **ISO 31030**-aligned itinerary lifecycle, a **visa/document engine**, **safety checklists**) is computable offline from bundleable open data Greyline already mostly has.

**What Greyline should become:** _the offline intelligence workbench for people whose movements are sensitive — duty of care without surveillance_ — serving journalists, NGOs, lawyers, activists, HNWIs, and security-conscious travelers. **Credibility is the feature**: evidence-grade everything, cite primary sources, show confidence/provenance, and retire the folklore.

## Positioning

**Unified, led by travel-risk.** A privacy-first travel-risk-management (TRM) workbench is the commercial spine; **counter-surveillance** and **investigative-journalism** are differentiating feature packs on the same architecture (shared offline maps, encrypted vault, evidence-graded intel, case timeline, provenance chips). The consumer lifetime-travel-log / scratch-map stays, but subordinate to the professional cockpit.

Why unified: the same buyers (journalists, NGOs) want all three; the privacy-first stance unifies them; and the travel-risk framing is what reads "worth money."

## What Greyline can credibly offer vs. the cloud incumbents
- **Can match/beat offline:** risk scoring (open methodology beats their black box), pre-trip risk briefings, ISO 31030 itinerary lifecycle, visa engine (~50k pairs vs Sherpa's paid API), multi-gov advisories, country dossiers with privacy intel, OPSEC checklists, SF-86 disclosure, journalist field-safety pack.
- **Deliberately won't build:** 24/7 SOC/medevac, live GPS tracking. Reframe their absence as the privacy selling point ("your dossier never leaves your machine").

## Roadmap (phased; lane tags: TR=travel-risk, CS=counter-surveillance, J=journalism, UX, PLAT)

### Quick wins (reuse existing primitives)
| Feature | Lane | Build (offline-first) |
|---|---|---|
| Universal metadata stripper (replace JPEG-only EXIF) | CS/J | mat2 concept / pure-JS exifr+pdf-lib+JSZip |
| CVD-safe risk-color system + redundant cues | UX | re-ground Tone/ALERT_COLOR on Petroff/ColorBrewer; grayscale+contrast CI test |
| Command palette (Cmd+K) | UX | cmdk (shadcn already wraps it) |
| Sun/shadow chronolocation lab | J | SunCalc (BSD), on existing MapLibre |
| Camera coverage cones + ALPR layer | CS/maps | extend `overpass.ts` (camera:direction; DeFlock/EFF Atlas) |
| SIFT + source-protection playbooks | J/UX | reuse checklist component |
| Passive self-doxxing upgrade | CS | bundle Sherlock/SpiderFoot passive catalogs |
| Offline emergency + embassy/hospital locator | TR | bundled 200-country numbers + Overpass POIs |
| Legal/ethical guardrails + feature retirement | PLAT | cut evasion content; 18 USC 2261A context |

### Core
| Feature | Lane | Evidence |
|---|---|---|
| **Greyline Risk Score** (open methodology) | TR | GPI + Fragile States Index + FEMA NRI + CPI/RSF; competitors' #1 monetized artifact |
| **Road-safety-first trip reframe** | TR | CDC: road crashes #1 traveler killer (~26%) vs 15 terrorism |
| **ISO 31030 itinerary risk timeline** | TR | the credibility hook every vendor cites |
| **SDR / egress route planner** (wire `saved_routes`) + isochrones | CS/maps | OSRM-CCTV precedent; Valhalla isochrones |
| **TEDD surveillance scorer** | CS | upgrade `repeatMatches()` to use Time/Environment/Distance (cols already stored) |
| **Pattern-of-life self-audit** | CS/TR | de Montjoye unicity (4 points → 95%) |
| **Threat-model wizard** (IMSI/ALPR/BLE/FRT) | CS | AOSP/EFF mitigations; extend `border.ts` |
| **BLE tracker-stalking defense** | CS | IETF DULT; CDC NISVS; AirGuard handoff |
| **Investigation case-file + chain-of-custody** | J | SHA-256 intake + append-only log; vault crypto |
| **Document sanitizer (no-container)** | J/sec | pdf.js + Tesseract.js (Dangerzone concept) |
| **Offline reverse-image / near-dup** | J | blockhash-core (pure-JS) |
| **SA cockpit with Level-3 projection** | UX | Endsley SAOD; explicit missing-data states |
| **Confidence + provenance chips** | UX/J | ICD 203 estimative-probability vocabulary |
| **Investigation / case timeline** | CS/J | Palantir-style grouped lanes |
| **Alarm-rationalized alert layer** | PLAT | EEMUA anti-alarm-fatigue budgets |
| **CCTV/lighting safety heatmap** | maps/CS | deck.gl or MapLibre heatmap |
| **Offline photo/track geo-resolver** | TR/CS | GeoNames offline reverse-geocode |
| **New opt-in connectors** (18 APIs) | TR/maps | UCDP/CDC/OpenAQ/FIRMS/NWS/NOTAM/AISStream/OFAC/EMSC via api-gateway |
| **Field risk-assessment + check-in/proof-of-life** | J | RSF/ACOS/Foley/CPJ templates + vault |
| **Risk-briefing PDF export** | TR | client-side PDF; ungated |

### Ambitious
- Offline regional tile packs (PMTiles + Mapterhorn terrain) — true air-gapped `/map`.
- Viewshed / line-of-sight exposure (hotel room / rally point).
- Local entity extraction & cross-reference (NER → relationship graph).
- OSM feature-cluster geolocation search.
- Multi-traveler roster + org templating (declared-itinerary, no GPS).

## Focus cuts (be sharper, not sprawling)
- Retire blog-sourced gray-man content; **cut evasion-enabling features** (dead drops, restraint escape, identity-swap/disguise, talk-through-checkpoints) — legal/ethical + distribution risk. Counter-surveillance stays strictly **defensive**.
- Don't fake SOC/medevac or live GPS tracking — reframe as the privacy selling point.
- Keep the consumer Wrapped/scratch-map, but subordinate to the professional travel-risk cockpit.

## Monetization — deferred
Per current decision, **all features ship free/ungated under AGPL**; no license-gating, tiers, or paid build now. Keep feature boundaries clean so gating can be added later. (Researched options, for the record: data-bundle subscription; dual commercial/team self-host license ~$500–5k/seat-yr, Metabase pattern; signed desktop build; Pro feature pack.)

## Key evidence anchors
de Montjoye "Unique in the Crowd" (Sci Rep 2013) · Endsley SA model (Human Factors 1995) + SAOD 2024 · CDC Yellow Book (road safety) · GAO-14-159 / GAO-17-608R (behavioral detection ≈ chance) · NIST FRVT/NISTIR 8280 (FR bias) · PETS 2024 "Please Unstalk Me" · Cleveland-McGill (graphical perception) · ICD 203 (analytic standards) · ISO 31030:2021 (TRM) · OSRM-CCTV (arXiv 2108.09369). Full citations in the per-topic reports.
