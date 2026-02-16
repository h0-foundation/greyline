import { proxyFetch } from '../services/api-gateway.js';

interface WeatherData {
  current: {
    temperature_2m: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    weather_code: number[];
    precipitation_sum: number[];
  };
}

export async function getWeather(lat: number, lng: number): Promise<WeatherData | null> {
  const result = await proxyFetch<WeatherData>({
    apiId: 'open-meteo',
    url: 'https://api.open-meteo.com/v1/forecast',
    params: {
      latitude: lat.toString(),
      longitude: lng.toString(),
      current: 'temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m',
      daily: 'temperature_2m_max,temperature_2m_min,weather_code,precipitation_sum',
      forecast_days: '16',
      timezone: 'auto'
    },
    cacheTtlSeconds: 1800
  });
  return result?.data ?? null;
}
