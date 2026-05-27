"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sun,
  CloudSun,
  Cloud,
  CloudFog,
  CloudDrizzle,
  CloudRain,
  CloudSnow,
  CloudLightning,
  Droplets,
  Wind,
  PlugZap,
  type LucideIcon,
} from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

type Weather = {
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
};

type WeatherResponse =
  | { ok: true; weather: Weather }
  | { ok: false; disabled?: boolean; error: string };

const CITIES: { label: string; lat: number; lng: number }[] = [
  { label: "London", lat: 51.5, lng: -0.13 },
  { label: "Tokyo", lat: 35.68, lng: 139.69 },
  { label: "NYC", lat: 40.71, lng: -74.01 },
];

function describeCode(code: number): { label: string; Icon: LucideIcon } {
  if (code === 0) return { label: "Clear", Icon: Sun };
  if (code >= 1 && code <= 3) return { label: "Partly cloudy", Icon: code === 3 ? Cloud : CloudSun };
  if (code === 45 || code === 48) return { label: "Fog", Icon: CloudFog };
  if (code >= 51 && code <= 57) return { label: "Drizzle", Icon: CloudDrizzle };
  if (code >= 61 && code <= 67) return { label: "Rain", Icon: CloudRain };
  if (code >= 71 && code <= 77) return { label: "Snow", Icon: CloudSnow };
  if (code >= 80 && code <= 82) return { label: "Showers", Icon: CloudRain };
  if (code >= 95 && code <= 99) return { label: "Thunderstorm", Icon: CloudLightning };
  return { label: "Unknown", Icon: Cloud };
}

function formatDay(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString(undefined, { weekday: "short", day: "numeric" });
}

export function WeatherTool() {
  const [lat, setLat] = useState("51.5");
  const [lng, setLng] = useState("-0.13");
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);

  async function fetchForecast(useLat: string, useLng: string) {
    const latNum = Number.parseFloat(useLat);
    const lngNum = Number.parseFloat(useLng);
    if (!Number.isFinite(latNum) || !Number.isFinite(lngNum)) {
      setError("Enter a valid latitude and longitude.");
      setWeather(null);
      return;
    }
    setLoading(true);
    setError(null);
    setDisabled(false);
    try {
      const res = await fetch(
        `/api/weather?lat=${encodeURIComponent(latNum)}&lng=${encodeURIComponent(lngNum)}`,
      );
      const data = (await res.json()) as WeatherResponse;
      if (data.ok) {
        setWeather(data.weather);
      } else {
        setWeather(null);
        setDisabled(Boolean(data.disabled));
        setError(data.error);
      }
    } catch {
      setWeather(null);
      setError("Could not reach the weather service.");
    } finally {
      setLoading(false);
    }
  }

  function pickCity(city: (typeof CITIES)[number]) {
    setLat(String(city.lat));
    setLng(String(city.lng));
    void fetchForecast(String(city.lat), String(city.lng));
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <form
          className="grid gap-3 sm:grid-cols-[1fr_1fr_auto] sm:items-end"
          onSubmit={(e) => {
            e.preventDefault();
            void fetchForecast(lat, lng);
          }}
        >
          <div className="space-y-1.5">
            <label htmlFor="lat" className="text-sm text-muted-foreground">
              Latitude
            </label>
            <Input
              id="lat"
              inputMode="decimal"
              value={lat}
              onChange={(e) => setLat(e.target.value)}
              className="font-mono tabular-nums"
            />
          </div>
          <div className="space-y-1.5">
            <label htmlFor="lng" className="text-sm text-muted-foreground">
              Longitude
            </label>
            <Input
              id="lng"
              inputMode="decimal"
              value={lng}
              onChange={(e) => setLng(e.target.value)}
              className="font-mono tabular-nums"
            />
          </div>
          <Button type="submit" disabled={loading}>
            Get forecast
          </Button>
        </form>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <span className="text-xs text-faint">Quick pick:</span>
          {CITIES.map((c) => (
            <Button
              key={c.label}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => pickCity(c)}
            >
              {c.label}
            </Button>
          ))}
        </div>
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}

      {!loading && disabled && <DisabledNotice />}

      {!loading && !disabled && error && (
        <p className="text-sm text-muted-foreground">{error}</p>
      )}

      {!loading && !disabled && weather && <Forecast weather={weather} />}
    </div>
  );
}

function Forecast({ weather }: { weather: Weather }) {
  const { current, daily } = weather;
  const now = describeCode(current.weather_code);
  const NowIcon = now.Icon;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-5xl font-semibold tabular-nums text-foreground">
                {Math.round(current.temperature_2m)}°
              </span>
              <span className="text-sm text-muted-foreground">C</span>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <NowIcon className="size-4 text-accent-text" />
              {now.label}
            </p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <span className="flex items-center justify-end gap-1.5">
              <Droplets className="size-4 text-faint" />
              <span className="font-mono tabular-nums text-foreground">
                {Math.round(current.relative_humidity_2m)}%
              </span>
              humidity
            </span>
            <span className="flex items-center justify-end gap-1.5">
              <Wind className="size-4 text-faint" />
              <span className="font-mono tabular-nums text-foreground">
                {Math.round(current.wind_speed_10m)}
              </span>
              km/h wind
            </span>
          </div>
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">
          7-day forecast
        </h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {daily.time.map((iso, i) => {
            const day = describeCode(daily.weather_code[i] ?? 0);
            const DayIcon = day.Icon;
            return (
              <li
                key={iso}
                className="flex flex-col items-center gap-1 rounded-lg border border-border bg-accent-subtle/40 p-3 text-center"
              >
                <span className="text-xs font-medium text-foreground">{formatDay(iso)}</span>
                <DayIcon className="size-5 text-accent-text" />
                <span className="font-mono text-sm tabular-nums text-foreground">
                  {Math.round(daily.temperature_2m_max[i] ?? 0)}°
                </span>
                <span className="font-mono text-xs tabular-nums text-faint">
                  {Math.round(daily.temperature_2m_min[i] ?? 0)}°
                </span>
                <span className="mt-0.5 flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                  <CloudRain className="size-3" />
                  {Math.round(daily.precipitation_sum[i] ?? 0)} mm
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function DisabledNotice() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-text">
          <PlugZap className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Weather connection is off.
          </p>
          <p className="max-w-prose text-sm text-muted-foreground">
            Enable it in{" "}
            <Link href="/settings" className="text-accent-text underline-offset-4 hover:underline">
              Settings
            </Link>{" "}
            to fetch a forecast. Everything else still works offline.
          </p>
        </div>
      </div>
    </div>
  );
}
