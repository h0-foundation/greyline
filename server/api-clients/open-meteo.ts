import { proxyFetch } from '../services/api-gateway';

interface WeatherData {
  timezone?: string;
  current: {
    temperature_2m: number;
    apparent_temperature: number;
    weather_code: number;
    wind_speed_10m: number;
    relative_humidity_2m: number;
    uv_index: number;
  };
  daily: {
    time: string[];
    temperature_2m_max: number[];
    temperature_2m_min: number[];
    apparent_temperature_max: number[];
    apparent_temperature_min: number[];
    weather_code: number[];
    precipitation_sum: number[];
    precipitation_probability_max: number[];
    wind_speed_10m_max: number[];
    uv_index_max: number[];
    sunrise: string[];
    sunset: string[];
  };
}

export async function getWeather(lat: number, lng: number): Promise<WeatherData | null> {
  const result = await proxyFetch<WeatherData>({
    apiId: 'open-meteo',
    url: 'https://api.open-meteo.com/v1/forecast',
    params: {
      latitude: lat.toString(),
      longitude: lng.toString(),
      current: 'temperature_2m,apparent_temperature,weather_code,wind_speed_10m,relative_humidity_2m,uv_index',
      daily: 'temperature_2m_max,temperature_2m_min,apparent_temperature_max,apparent_temperature_min,weather_code,precipitation_sum,precipitation_probability_max,wind_speed_10m_max,uv_index_max,sunrise,sunset',
      forecast_days: '16',
      timezone: 'auto'
    },
    cacheTtlSeconds: 1800
  });
  return result?.data ?? null;
}
