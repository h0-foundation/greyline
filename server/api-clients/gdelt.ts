import { proxyFetch } from '../services/api-gateway';

interface GdeltArticle {
  url: string;
  title: string;
  seendate: string;
  socialimage: string;
  domain: string;
  language: string;
  sourcecountry: string;
}

interface GdeltResponse {
  articles: GdeltArticle[];
}

export async function getNewsByLocation(query: string, country?: string): Promise<GdeltArticle[] | null> {
  const params: Record<string, string> = {
    query: country ? `${query} sourcecountry:${country}` : query,
    mode: 'ArtList',
    maxrecords: '20',
    format: 'json',
    sort: 'DateDesc'
  };
  const result = await proxyFetch<GdeltResponse>({
    apiId: 'gdelt',
    url: 'https://api.gdeltproject.org/api/v2/doc/doc',
    params,
    cacheTtlSeconds: 900
  });
  return result?.data?.articles ?? null;
}
