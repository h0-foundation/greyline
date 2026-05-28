import { proxyFetch } from '../services/api-gateway';

export async function getExchangeRates(
  base: string = 'USD'
): Promise<Record<string, Record<string, number>> | null> {
  const result = await proxyFetch<Record<string, Record<string, number>>>({
    apiId: 'exchange-rates',
    url: `https://cdn.jsdelivr.net/npm/@fawazahmed0/currency-api@latest/v1/currencies/${base.toLowerCase()}.json`,
    cacheTtlSeconds: 86400
  });
  return result?.data ?? null;
}
