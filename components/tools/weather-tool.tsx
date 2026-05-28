"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Sun, CloudSun, Cloud, CloudFog, CloudDrizzle, CloudRain, CloudSnow,
  CloudLightning, Droplets, Wind, PlugZap, Thermometer, Sunrise, Sunset,
  Camera, Backpack, type LucideIcon,
} from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { PlacePicker, type Place } from "@/components/tools/place-picker";
import {
  comfortBand, comfortNote, uvBurnMinutes, uvBand, uvAdvice,
  lightWindows, packingFlags, BAND_LABEL, type Band,
} from "@/lib/weather";

type Weather = {
  current: { temperature_2m: number; apparent_temperature: number; weather_code: number; wind_speed_10m: number; relative_humidity_2m: number; uv_index: number };
  daily: {
    time: string[]; temperature_2m_max: number[]; temperature_2m_min: number[];
    apparent_temperature_max: number[]; apparent_temperature_min: number[];
    weather_code: number[]; precipitation_sum: number[]; precipitation_probability_max: number[];
    wind_speed_10m_max: number[]; uv_index_max: number[]; sunrise: string[]; sunset: string[];
  };
};

const BAND_CLASS: Record<Band, string> = {
  comfortable: "text-primary",
  caution: "text-spark",
  warning: "text-amber-500",
  danger: "text-destructive",
};

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
  const [place, setPlace] = useState<Place | null>(null);
  const [loading, setLoading] = useState(false);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [weather, setWeather] = useState<Weather | null>(null);

  async function select(p: Place) {
    setPlace(p);
    setLoading(true); setError(null); setDisabled(false);
    try {
      const res = await fetch(`/api/weather?lat=${p.lat}&lng=${p.lng}`);
      const data = await res.json();
      if (data.ok) setWeather(data.weather);
      else { setWeather(null); setDisabled(Boolean(data.disabled)); setError(data.error); }
    } catch {
      setWeather(null); setError("Could not reach the weather service.");
    } finally { setLoading(false); }
  }

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <PlacePicker value={place} onSelect={select} placeholder="Search your destination…" />
      </div>

      {loading && (
        <div className="space-y-4">
          <Skeleton className="h-40 w-full rounded-xl" />
          <Skeleton className="h-28 w-full rounded-xl" />
        </div>
      )}
      {!loading && disabled && <DisabledNotice />}
      {!loading && !disabled && error && <p className="text-sm text-muted-foreground">{error}</p>}
      {!loading && !disabled && weather && place && <Forecast weather={weather} place={place} />}
      {!loading && !weather && !error && !disabled && (
        <p className="px-1 text-sm text-muted-foreground">Pick a destination above to see conditions and what they mean for your trip.</p>
      )}
    </div>
  );
}

function Forecast({ weather, place }: { weather: Weather; place: Place }) {
  const { current, daily } = weather;
  const now = describeCode(current.weather_code);
  const NowIcon = now.Icon;
  const band = comfortBand(current.apparent_temperature);
  const burn = uvBurnMinutes(current.uv_index);
  const uband = uvBand(current.uv_index);
  const light = daily.sunrise[0] && daily.sunset[0] ? lightWindows(daily.sunrise[0], daily.sunset[0]) : null;
  const flags = packingFlags(daily);

  return (
    <div className="space-y-4">
      {/* Now + apparent temp */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="mb-3 flex items-center gap-2 text-sm text-muted-foreground">
          <span className="font-medium text-foreground">{place.label.split(",")[0]}</span>
        </div>
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div className="space-y-1">
            <div className="flex items-baseline gap-2">
              <span className="font-mono text-5xl font-semibold tabular-nums text-foreground">{Math.round(current.temperature_2m)}°</span>
              <span className="text-sm text-muted-foreground">C</span>
            </div>
            <p className="flex items-center gap-1.5 text-sm text-muted-foreground">
              <NowIcon className="size-4 text-accent-text" /> {now.label}
            </p>
          </div>
          <div className="space-y-2 text-sm text-muted-foreground">
            <span className="flex items-center justify-end gap-1.5">
              <Thermometer className={`size-4 ${BAND_CLASS[band]}`} />
              feels like <span className="font-mono tabular-nums text-foreground">{Math.round(current.apparent_temperature)}°</span>
            </span>
            <span className="flex items-center justify-end gap-1.5">
              <Droplets className="size-4 text-faint" />
              <span className="font-mono tabular-nums text-foreground">{Math.round(current.relative_humidity_2m)}%</span> humidity
            </span>
            <span className="flex items-center justify-end gap-1.5">
              <Wind className="size-4 text-faint" />
              <span className="font-mono tabular-nums text-foreground">{Math.round(current.wind_speed_10m)}</span> km/h
            </span>
          </div>
        </div>

        {/* Decision strip */}
        <div className="mt-4 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
          <Decision icon={Thermometer} band={band} title={`${BAND_LABEL[band]} conditions`}>
            {comfortNote(current.apparent_temperature)}
          </Decision>
          <Decision icon={Sun} band={uband} title={`UV ${Math.round(current.uv_index)}${burn ? ` · burns in ~${burn} min` : ""}`}>
            {uvAdvice(current.uv_index)}
          </Decision>
        </div>
      </div>

      {/* Photographer / OSINT light windows */}
      {light && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
            <Camera className="size-3.5" /> Best light today <span className="font-normal normal-case text-muted-foreground">· soft, low-glare windows</span>
          </h2>
          <div className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            <LightCell icon={Sunrise} label="Blue hour" time={`${light.blueAM[0]}–${light.blueAM[1]}`} />
            <LightCell icon={Sunrise} label="Golden (AM)" time={`${light.goldenAM[0]}–${light.goldenAM[1]}`} accent />
            <LightCell icon={Sunset} label="Golden (PM)" time={`${light.goldenPM[0]}–${light.goldenPM[1]}`} accent />
            <LightCell icon={Sunset} label="Blue hour" time={`${light.bluePM[0]}–${light.bluePM[1]}`} />
          </div>
        </div>
      )}

      {/* Packing implications */}
      {flags.length > 0 && (
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
            <Backpack className="size-3.5" /> Pack for this forecast
          </h2>
          <ul className="mt-3 space-y-2">
            {flags.map((f) => (
              <li key={f.item} className="flex items-baseline justify-between gap-3 text-sm">
                <span className="text-foreground">{f.item}</span>
                <span className="shrink-0 text-xs text-faint">{f.reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* 7-day */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="text-xs font-semibold uppercase tracking-wide text-faint">7-day forecast</h2>
        <ul className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-4 lg:grid-cols-7">
          {daily.time.slice(0, 7).map((iso, i) => {
            const day = describeCode(daily.weather_code[i] ?? 0);
            const DayIcon = day.Icon;
            const pp = daily.precipitation_probability_max[i] ?? 0;
            return (
              <li key={iso} className="flex flex-col items-center gap-1 rounded-lg border border-border bg-accent-subtle/40 p-3 text-center">
                <span className="text-xs font-medium text-foreground">{formatDay(iso)}</span>
                <DayIcon className="size-5 text-accent-text" />
                <span className="font-mono text-sm tabular-nums text-foreground">{Math.round(daily.temperature_2m_max[i] ?? 0)}°</span>
                <span className="font-mono text-xs tabular-nums text-faint">{Math.round(daily.temperature_2m_min[i] ?? 0)}°</span>
                <span className="mt-0.5 flex items-center gap-1 font-mono text-[11px] tabular-nums text-muted-foreground">
                  <Droplets className="size-3" /> {Math.round(pp)}%
                </span>
              </li>
            );
          })}
        </ul>
      </div>
    </div>
  );
}

function Decision({ icon: Icon, band, title, children }: { icon: LucideIcon; band: Band; title: string; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2.5">
      <Icon className={`mt-0.5 size-4 shrink-0 ${BAND_CLASS[band]}`} />
      <div className="space-y-0.5">
        <p className="text-sm font-medium text-foreground">{title}</p>
        <p className="text-xs text-muted-foreground">{children}</p>
      </div>
    </div>
  );
}

function LightCell({ icon: Icon, label, time, accent }: { icon: LucideIcon; label: string; time: string; accent?: boolean }) {
  return (
    <div className={`rounded-lg border p-2.5 text-center ${accent ? "border-spark/30 bg-spark/5" : "border-border bg-accent-subtle/30"}`}>
      <Icon className={`mx-auto size-4 ${accent ? "text-spark" : "text-faint"}`} />
      <div className="mt-1 font-mono text-sm tabular-nums text-foreground">{time}</div>
      <div className="text-[11px] text-muted-foreground">{label}</div>
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
          <p className="text-sm font-medium text-foreground">Weather connection is off.</p>
          <p className="max-w-prose text-sm text-muted-foreground">
            Enable it in{" "}
            <Link href="/settings" className="text-accent-text underline-offset-4 hover:underline">Settings</Link>{" "}
            to fetch a forecast. Everything else still works offline.
          </p>
        </div>
      </div>
    </div>
  );
}
