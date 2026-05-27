import { proxyFetch } from '../services/api-gateway';

// The previous source (travel-advisory.info) is dead (cert mismatch + 404). We
// now use the US State Department advisories feed, which returns an array of
// { Title: "Country - Level N: ...", Summary, Link, Updated }.
interface StateDeptItem {
  Title: string;
  Summary: string;
  Link: string;
  Updated: string;
}

export interface AdvisoryEntry {
  iso_alpha2: string;
  name: string;
  continent: string;
  advisory: {
    score: number; // 1-4 (State Dept advisory level)
    sources_active: number;
    message: string;
    updated: string;
    source: string;
  };
}

function stripHtml(s: string): string {
  return s
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .replace(/Summary not available/gi, '')
    .trim();
}

export async function getTravelAdvisories(): Promise<Record<string, AdvisoryEntry> | null> {
  const result = await proxyFetch<StateDeptItem[]>({
    apiId: 'travel-advisory',
    url: 'https://cadataapi.state.gov/api/TravelAdvisories',
    cacheTtlSeconds: 86400,
  });
  const items = result?.data;
  if (!Array.isArray(items)) return null;

  const out: Record<string, AdvisoryEntry> = {};
  for (const item of items) {
    const name = item.Title.split(/\s+-\s+Level/i)[0].trim();
    const level = Number(item.Title.match(/Level\s+(\d)/i)?.[1] ?? 0) || 1;
    // Best-effort ISO3 from the destination URL (…destination.svk.html) → key.
    const iso3 = item.Link.match(/destination\.([a-z]{3})\.html/i)?.[1]?.toUpperCase() ?? "";
    const key = iso3 || name;
    out[key] = {
      iso_alpha2: iso3,
      name,
      continent: "",
      advisory: {
        score: level,
        sources_active: 1,
        message: stripHtml(item.Summary).slice(0, 500),
        updated: item.Updated,
        source: "US State Department",
      },
    };
  }
  return Object.keys(out).length ? out : null;
}
