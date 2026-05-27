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
    label: "Travel advisories",
    description: "US State Department advisory levels and safety notes by country.",
    host: "cadataapi.state.gov",
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
    id: "gdelt",
    label: "News & events",
    description: "Recent news and event signals for a region.",
    host: "api.gdeltproject.org",
  },
  {
    id: "adsb",
    label: "Aircraft tracking",
    description: "Nearby aircraft positions for situational awareness.",
    host: "api.adsb.lol",
  },
  // ip-api intentionally omitted: HTTP-only on the free tier (would leak your IP
  // in plaintext) and unused — dropped rather than ship a privacy regression.
];
