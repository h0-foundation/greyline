/**
 * Pure (DB-free, client-safe) parsers over the `rest_countries` JSON blob stored
 * in `country_profiles`. Server code reads the raw string from SQLite and hands
 * it here; the resulting shapes are what the UI renders.
 */

export type CountryListItem = {
  code: string;
  name: string;
  official: string;
  region: string;
  subregion: string;
  flag: string;
  population: number;
  landlocked: boolean;
};

export type CountryBriefing = CountryListItem & {
  capital: string[];
  area: number;
  latlng: [number, number] | null;
  unMember: boolean;
  currencies: { code: string; name: string; symbol: string }[];
  languages: string[];
  callingCodes: string[];
  drivingSide: "left" | "right" | null;
  timezones: string[];
  borders: string[];
  demonym: string | null;
};

type RawRestCountries = {
  name?: { common?: string; official?: string };
  cca2?: string;
  cca3?: string;
  region?: string;
  subregion?: string;
  capital?: string[];
  latlng?: number[];
  area?: number;
  flag?: string;
  population?: number;
  unMember?: boolean;
  landlocked?: boolean;
  currencies?: Record<string, { name?: string; symbol?: string }>;
  idd?: { root?: string; suffixes?: string[] };
  languages?: Record<string, string>;
  car?: { side?: string };
  timezones?: string[];
  borders?: string[];
  demonyms?: { eng?: { m?: string; f?: string } };
};

function parse(raw: string | null): RawRestCountries | null {
  if (!raw) return null;
  try {
    return JSON.parse(raw) as RawRestCountries;
  } catch {
    return null;
  }
}

export function toListItem(code: string, raw: string | null): CountryListItem {
  const rc = parse(raw);
  return {
    code,
    name: rc?.name?.common ?? code,
    official: rc?.name?.official ?? rc?.name?.common ?? code,
    region: rc?.region ?? "Unknown",
    subregion: rc?.subregion ?? "",
    flag: rc?.flag ?? "",
    population: rc?.population ?? 0,
    landlocked: rc?.landlocked ?? false,
  };
}

/** A country's calling code is its root prefix (e.g. "+44"). For NANP members
 *  the suffixes are area codes, not separate countries — so we only keep them
 *  when there are a handful (true multi-prefix nations like Kazakhstan: +7 6/7). */
function callingCodes(idd?: { root?: string; suffixes?: string[] }): string[] {
  if (!idd?.root) return [];
  const { root, suffixes } = idd;
  if (!suffixes?.length || suffixes.length > 4) return [root];
  return suffixes.map((s) => `${root}${s}`);
}

export function toBriefing(code: string, raw: string | null): CountryBriefing {
  const rc = parse(raw);
  const base = toListItem(code, raw);
  const latlng =
    rc?.latlng && rc.latlng.length === 2
      ? ([rc.latlng[0], rc.latlng[1]] as [number, number])
      : null;
  const side = rc?.car?.side;
  return {
    ...base,
    capital: rc?.capital ?? [],
    area: rc?.area ?? 0,
    latlng,
    unMember: rc?.unMember ?? false,
    currencies: Object.entries(rc?.currencies ?? {}).map(([cc, v]) => ({
      code: cc,
      name: v?.name ?? cc,
      symbol: v?.symbol ?? "",
    })),
    languages: Object.values(rc?.languages ?? {}),
    callingCodes: callingCodes(rc?.idd),
    drivingSide: side === "left" || side === "right" ? side : null,
    timezones: rc?.timezones ?? [],
    borders: rc?.borders ?? [],
    demonym: rc?.demonyms?.eng?.m ?? null,
  };
}

const COMPACT = new Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 });
const FULL = new Intl.NumberFormat("en");

export function formatPopulation(n: number): string {
  if (!n) return "—";
  return n >= 1_000_000 ? COMPACT.format(n) : FULL.format(n);
}

export function formatArea(km2: number): string {
  if (!km2) return "—";
  return `${FULL.format(Math.round(km2))} km²`;
}

/** Canonical region order for the filter row; "Unknown" sinks to the end. */
export const REGION_ORDER = [
  "Africa",
  "Americas",
  "Asia",
  "Europe",
  "Oceania",
  "Antarctic",
  "Unknown",
];

/** Resolve `borders` (cca3) to linkable cca2 country codes + display names. */
export type NeighborRef = { code: string; name: string; flag: string };

export function buildNeighborIndex(
  rows: Array<{ country_code: string; rest_countries: string | null }>,
): Map<string, NeighborRef> {
  const index = new Map<string, NeighborRef>();
  for (const row of rows) {
    const rc = parse(row.rest_countries);
    if (!rc?.cca3) continue;
    index.set(rc.cca3, {
      code: row.country_code,
      name: rc.name?.common ?? row.country_code,
      flag: rc.flag ?? "",
    });
  }
  return index;
}

export function sortRegions(regions: string[]): string[] {
  return [...regions].sort((a, b) => {
    const ai = REGION_ORDER.indexOf(a);
    const bi = REGION_ORDER.indexOf(b);
    return (ai === -1 ? 99 : ai) - (bi === -1 ? 99 : bi) || a.localeCompare(b);
  });
}
