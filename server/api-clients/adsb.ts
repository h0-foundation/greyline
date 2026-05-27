import { proxyFetch } from '../services/api-gateway';

interface AdsbAircraft {
  hex: string;
  flight?: string;
  alt_baro?: number;
  gs?: number;
  lat?: number;
  lon?: number;
  squawk?: string;
  category?: string;
  type?: string;
}

export async function getAircraftInArea(lat: number, lng: number, radiusNm: number = 50): Promise<AdsbAircraft[] | null> {
  const result = await proxyFetch<{ ac: AdsbAircraft[] }>({
    apiId: 'adsb',
    url: `https://api.adsb.lol/v2/lat/${lat}/lon/${lng}/dist/${radiusNm}`,
    cacheTtlSeconds: 60
  });
  return result?.data?.ac ?? null;
}
