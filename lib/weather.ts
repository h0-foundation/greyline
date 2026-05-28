// Travel-decision computations over an Open-Meteo forecast. Pure functions — no
// network, no deps. Turns raw numbers into "what does this mean for my trip."

export type Band = "comfortable" | "caution" | "warning" | "danger";

export const BAND_LABEL: Record<Band, string> = {
  comfortable: "Comfortable",
  caution: "Caution",
  warning: "Warning",
  danger: "Danger",
};

/** Apparent-temperature comfort band (°C). Hot side uses NWS heat-caution
 *  thresholds; cold side uses wind-chill frostbite guidance. */
export function comfortBand(apparentC: number): Band {
  if (apparentC >= 54 || apparentC <= -28) return "danger";
  if (apparentC >= 41 || apparentC <= -15) return "warning";
  if (apparentC >= 32 || apparentC <= 0) return "caution";
  return "comfortable";
}

export function comfortNote(apparentC: number): string {
  const b = comfortBand(apparentC);
  if (apparentC >= 32) {
    if (b === "danger") return "Extreme heat — heatstroke likely on exertion. Avoid midday activity.";
    if (b === "warning") return "Dangerous heat — heat cramps/exhaustion likely. Hydrate, seek shade.";
    return "Hot — fatigue possible with prolonged exposure. Pace yourself, carry water.";
  }
  if (apparentC <= 0) {
    if (b === "danger") return "Extreme cold — frostbite in minutes on exposed skin. Cover everything.";
    if (b === "warning") return "Severe cold — frostbite risk. Insulated layers and extremities cover.";
    return "Cold — dress in layers, protect hands and face.";
  }
  return "Comfortable range for most activity.";
}

/** UV burn time for unprotected skin (Fitzpatrick type II baseline), per the
 *  WHO/NWS approximation: minutes ≈ 200 / UV index. */
export function uvBurnMinutes(uvi: number): number | null {
  if (uvi <= 0.5) return null;
  return Math.max(5, Math.round(200 / uvi));
}

export function uvBand(uvi: number): Band {
  if (uvi >= 11) return "danger";
  if (uvi >= 8) return "warning";
  if (uvi >= 3) return "caution";
  return "comfortable";
}

export function uvAdvice(uvi: number): string {
  if (uvi >= 11) return "Extreme UV — skin burns very fast. SPF 50+, cover up, avoid sun 10am–4pm.";
  if (uvi >= 8) return "Very high UV — SPF 30+, hat and sunglasses, seek shade midday.";
  if (uvi >= 3) return "Moderate UV — SPF 30 and sunglasses for extended time outside.";
  return "Low UV — minimal protection needed.";
}

/** Golden-hour and blue-hour windows derived from sunrise/sunset (local clock
 *  strings from Open-Meteo). Golden ≈ the soft 50 min after sunrise / before
 *  sunset; blue ≈ the 25 min of twilight just outside it. */
export function lightWindows(sunriseISO: string, sunsetISO: string): {
  goldenAM: [string, string]; goldenPM: [string, string]; blueAM: [string, string]; bluePM: [string, string];
} | null {
  const sr = clockMinutes(sunriseISO);
  const ss = clockMinutes(sunsetISO);
  if (sr == null || ss == null) return null;
  const hm = (m: number) => `${String(Math.floor(((m % 1440) + 1440) % 1440 / 60)).padStart(2, "0")}:${String(Math.round(((m % 1440) + 1440) % 1440 % 60)).padStart(2, "0")}`;
  return {
    blueAM: [hm(sr - 25), hm(sr)],
    goldenAM: [hm(sr), hm(sr + 50)],
    goldenPM: [hm(ss - 50), hm(ss)],
    bluePM: [hm(ss), hm(ss + 25)],
  };
}

function clockMinutes(iso: string): number | null {
  // Open-Meteo returns local time like "2026-05-26T05:12"; take the HH:MM.
  const m = /T(\d{2}):(\d{2})/.exec(iso);
  if (!m) return null;
  return Number(m[1]) * 60 + Number(m[2]);
}

export type PackingFlag = { item: string; reason: string };

/** Aggregate the next N forecast days into concrete packing implications. */
export function packingFlags(daily: {
  temperature_2m_min: number[];
  apparent_temperature_max: number[];
  precipitation_probability_max: number[];
  precipitation_sum: number[];
  uv_index_max: number[];
  wind_speed_10m_max: number[];
}, days = 7): PackingFlag[] {
  const n = Math.min(days, daily.temperature_2m_min.length);
  const slice = <T,>(a: T[]) => a.slice(0, n);
  const flags: PackingFlag[] = [];
  const minTemp = Math.min(...slice(daily.temperature_2m_min));
  const maxApp = Math.max(...slice(daily.apparent_temperature_max));
  const rainyDays = slice(daily.precipitation_probability_max).filter((p) => p >= 50).length;
  const wetDays = slice(daily.precipitation_sum).filter((mm) => mm >= 5).length;
  const maxUv = Math.max(...slice(daily.uv_index_max));
  const maxWind = Math.max(...slice(daily.wind_speed_10m_max));

  if (minTemp <= 5) flags.push({ item: "Insulating layer / warm jacket", reason: `lows near ${Math.round(minTemp)}°C` });
  else if (minTemp <= 12) flags.push({ item: "Light jacket or sweater", reason: `cool evenings (~${Math.round(minTemp)}°C)` });
  if (maxApp >= 32) flags.push({ item: "Breathable clothing + electrolytes", reason: `feels-like up to ${Math.round(maxApp)}°C` });
  if (rainyDays > 0 || wetDays > 0) flags.push({ item: "Rain shell / compact umbrella", reason: `${Math.max(rainyDays, wetDays)} wet day${Math.max(rainyDays, wetDays) === 1 ? "" : "s"} forecast` });
  if (maxUv >= 6) flags.push({ item: "SPF 30+, hat, sunglasses", reason: `UV index up to ${Math.round(maxUv)}` });
  if (maxWind >= 40) flags.push({ item: "Windproof outer layer", reason: `gusts to ${Math.round(maxWind)} km/h` });
  return flags;
}
