import { proxyFetch } from '../services/api-gateway';

interface AdvisoryData {
  data: Record<string, {
    iso_alpha2: string;
    name: string;
    continent: string;
    advisory: {
      score: number;
      sources_active: number;
      message: string;
      updated: string;
      source: string;
    };
  }>;
}

export async function getTravelAdvisories(): Promise<AdvisoryData['data'] | null> {
  const result = await proxyFetch<AdvisoryData>({
    apiId: 'travel-advisory',
    url: 'https://www.travel-advisory.info/api',
    cacheTtlSeconds: 86400
  });
  // The API response has { api_status: {...}, data: { AF: {...}, ... } }
  // We need to return just the country data map, not the wrapper
  return result?.data?.data ?? null;
}
