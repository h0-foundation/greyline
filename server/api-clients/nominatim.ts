import { proxyFetch } from '../services/api-gateway.js';

interface NominatimResult {
  place_id: number;
  lat: string;
  lon: string;
  display_name: string;
  type: string;
  address: Record<string, string>;
}

export async function geocode(query: string): Promise<NominatimResult[] | null> {
  const result = await proxyFetch<NominatimResult[]>({
    apiId: 'nominatim',
    url: 'https://nominatim.openstreetmap.org/search',
    params: {
      q: query,
      format: 'json',
      addressdetails: '1',
      limit: '5'
    },
    cacheTtlSeconds: 604800
  });
  return result?.data ?? null;
}

export async function reverseGeocode(lat: number, lng: number): Promise<NominatimResult | null> {
  const result = await proxyFetch<NominatimResult>({
    apiId: 'nominatim',
    url: 'https://nominatim.openstreetmap.org/reverse',
    params: {
      lat: lat.toString(),
      lon: lng.toString(),
      format: 'json',
      addressdetails: '1'
    },
    cacheTtlSeconds: 604800
  });
  return result?.data ?? null;
}
