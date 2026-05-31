/** Reference metadata for the optional outbound data connections. The kill-switch
 *  and per-connection toggles live in SQLite (`api_toggles`); this maps each
 *  `api_id` to plain-language copy so Settings can explain what each one does and
 *  where the request goes. All are OFF by default — Greyline is offline-first. */
export type ConnectionMeta = {
  id: string;
  label: string;
  description: string;
  /** Host the request is sent to, shown so the user knows exactly where data goes. */
  host: string;
};

export const CONNECTIONS: ConnectionMeta[] = [
  {
    id: "open-meteo",
    label: "Weather",
    description: "Forecasts and current conditions for your destinations.",
    host: "api.open-meteo.com",
  },
  {
    id: "exchange-rates",
    label: "Exchange rates",
    description: "Live currency conversion for budgeting on the road.",
    host: "cdn.jsdelivr.net",
  },
  {
    id: "travel-advisory",
    label: "Travel advisories — US State Dept",
    description: "US State Department advisory levels (1–4) and safety notes by country.",
    host: "cadataapi.state.gov",
  },
  {
    id: "uk-fcdo",
    label: "Travel advisories — UK FCDO",
    description: "UK Foreign, Commonwealth & Development Office travel advice, fetched via the gov.uk Content API.",
    host: "www.gov.uk",
  },
  {
    id: "nominatim",
    label: "Geocoding",
    description: "Turn place names into coordinates for the map.",
    host: "nominatim.openstreetmap.org",
  },
  {
    id: "overpass",
    label: "Map points of interest",
    description: "Embassies, hospitals, and other OSM features near a location.",
    host: "overpass-api.de",
  },
  {
    id: "adsb",
    label: "Live aircraft (ADS-B)",
    description: "Real-time aircraft positions near a point, for the map OSINT layer.",
    host: "api.adsb.lol",
  },
  {
    id: "usgs",
    label: "Earthquakes (USGS)",
    description: "Live global earthquakes (M2.5+, past day) for the map OSINT layer.",
    host: "earthquake.usgs.gov",
  },
  {
    id: "gdacs",
    label: "Disasters (GDACS)",
    description: "Live global disaster alerts — cyclones, floods, volcanoes, wildfires.",
    host: "www.gdacs.org",
  },
  // gdelt + ip-api intentionally omitted: gdelt had no callers; ip-api was
  // HTTP-only on the free tier (a plaintext-IP leak). Both pruned (migration 016)
  // rather than ship an orphaned or privacy-regressing connector.
];
