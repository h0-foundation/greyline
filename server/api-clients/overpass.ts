import { proxyFetch } from '../services/api-gateway.js';

interface OverpassElement {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  tags?: Record<string, string>;
}

interface OverpassResponse {
  elements: OverpassElement[];
}

export async function getSurveillanceCameras(south: number, west: number, north: number, east: number): Promise<OverpassElement[] | null> {
  const query = `[out:json][timeout:30];node["man_made"="surveillance"](${south},${west},${north},${east});out body;`;
  const result = await proxyFetch<OverpassResponse>({
    apiId: 'overpass',
    url: 'https://overpass-api.de/api/interpreter',
    params: { data: query },
    cacheTtlSeconds: 86400
  });
  return result?.data?.elements ?? null;
}
