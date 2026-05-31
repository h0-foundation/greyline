/** Reference metadata for the optional outbound data connections. The kill-switch
 *  and per-connection toggles live in SQLite (`api_toggles`); this maps each
 *  `api_id` to plain-language copy so Settings can explain what each one does and
 *  where the request goes. All are OFF by default — Greyline is offline-first. */
export type ConnectionCategory = "intel" | "map";

export type ConnectionMeta = {
  id: string;
  label: string;
  description: string;
  /** Host the request is sent to, shown so the user knows exactly where data goes. */
  host: string;
  /** Grouping in the Settings → Connections hub. */
  category: ConnectionCategory;
  /** Requires a free API key the user pastes in Settings; off until a key is set. */
  needsKey?: boolean;
  /** Where to get the key, shown next to the key field. */
  keyHint?: string;
};

export const CONNECTION_CATEGORIES: { id: ConnectionCategory; label: string }[] = [
  { id: "intel", label: "Travel intelligence" },
  { id: "map", label: "Live map layers" },
];

export const CONNECTIONS: ConnectionMeta[] = [
  {
    id: "open-meteo",
    label: "Weather",
    description: "Forecasts and current conditions for your destinations.",
    host: "api.open-meteo.com",
    category: "intel",
  },
  {
    id: "exchange-rates",
    label: "Exchange rates",
    description: "Live currency conversion for budgeting on the road.",
    host: "cdn.jsdelivr.net",
    category: "intel",
  },
  {
    id: "travel-advisory",
    label: "Travel advisories — US State Dept",
    description: "US State Department advisory levels (1–4) and safety notes by country.",
    host: "cadataapi.state.gov",
    category: "intel",
  },
  {
    id: "uk-fcdo",
    label: "Travel advisories — UK FCDO",
    description: "UK Foreign, Commonwealth & Development Office travel advice, fetched via the gov.uk Content API.",
    host: "www.gov.uk",
    category: "intel",
  },
  {
    id: "nominatim",
    label: "Geocoding",
    description: "Turn place names into coordinates for the map.",
    host: "nominatim.openstreetmap.org",
    category: "map",
  },
  {
    id: "overpass",
    label: "Map points of interest",
    description: "Embassies, hospitals, and other OSM features near a location.",
    host: "overpass-api.de",
    category: "map",
  },
  {
    id: "adsb",
    label: "Live aircraft (ADS-B)",
    description: "Real-time aircraft positions near a point, for the map OSINT layer.",
    host: "api.adsb.lol",
    category: "map",
  },
  {
    id: "usgs",
    label: "Earthquakes (USGS)",
    description: "Live global earthquakes (M2.5+, past day) for the map OSINT layer.",
    host: "earthquake.usgs.gov",
    category: "map",
  },
  {
    id: "emsc",
    label: "Earthquakes (EMSC)",
    description: "European-Mediterranean Seismological Centre — denser quake coverage for Europe and the Mediterranean. Complements USGS.",
    host: "www.seismicportal.eu",
    category: "map",
  },
  {
    id: "nws-alerts",
    label: "US weather alerts (NWS)",
    description: "Active US National Weather Service warnings — tornado, flood, hurricane, winter storm — as map zones. US coverage only.",
    host: "api.weather.gov",
    category: "map",
  },
  {
    id: "nasa-firms",
    label: "Active fires (NASA FIRMS)",
    description: "Near-real-time wildfire/hotspot detections (VIIRS satellite) in the map view. Needs a free NASA FIRMS key.",
    host: "firms.modaps.eosdis.nasa.gov",
    category: "map",
    needsKey: true,
    keyHint: "Free MAP_KEY from firms.modaps.eosdis.nasa.gov/api/area",
  },
  {
    id: "openaq",
    label: "Air quality (OpenAQ)",
    description: "Air-quality monitoring stations near the map view and the pollutants each measures. Needs a free OpenAQ key.",
    host: "api.openaq.org",
    category: "map",
    needsKey: true,
    keyHint: "Free API key from explore.openaq.org (Account → API keys)",
  },
  {
    id: "gdacs",
    label: "Disasters (GDACS)",
    description: "Live global disaster alerts — cyclones, floods, volcanoes, wildfires.",
    host: "www.gdacs.org",
    category: "map",
  },
  // gdelt + ip-api intentionally omitted: gdelt had no callers; ip-api was
  // HTTP-only on the free tier (a plaintext-IP leak). Both pruned (migration 016)
  // rather than ship an orphaned or privacy-regressing connector.
];
