/* Solar position + shadow geometry for chronolocation / geolocation verification.
 *
 * Implements the NOAA solar-position algorithm (after Meeus, "Astronomical
 * Algorithms"). Accurate to ~0.01° for civilian use. Atmospheric refraction is
 * ignored (it matters only within ~1° of the horizon). Pure + offline — no deps,
 * no network. This is the same math behind Bellingcat's SunCalc-based workflow.
 *
 * IMPORTANT framing for the UI: shadow analysis VALIDATES candidate locations and
 * times — it does not discover them. You supply a hypothesis (a place + a date)
 * and this tells you where the sun was and which way / how long shadows fell, so
 * you can confirm or exclude it. */

const rad = (d: number) => (d * Math.PI) / 180;
const deg = (r: number) => (r * 180) / Math.PI;
const mod = (n: number, m: number) => ((n % m) + m) % m;
const clamp = (n: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, n));

export type SunPosition = {
  /** degrees above the horizon (negative = below) */
  altitude: number;
  /** degrees clockwise from true north (0=N, 90=E, 180=S, 270=W) */
  azimuth: number;
  /** sun declination in degrees */
  declination: number;
};

function julianDay(date: Date): number {
  return date.getTime() / 86_400_000 + 2_440_587.5;
}

/** Sun altitude + azimuth for an instant (UTC) at a geographic point.
 *  lng is east-positive. */
export function sunPosition(date: Date, lat: number, lng: number): SunPosition {
  const jd = julianDay(date);
  const T = (jd - 2_451_545.0) / 36_525;

  const L0 = mod(280.46646 + T * (36_000.76983 + 0.0003032 * T), 360);
  const M = 357.52911 + T * (35_999.05029 - 0.0001537 * T);
  const e = 0.016708634 - T * (0.000042037 + 0.0000001267 * T);
  const C =
    Math.sin(rad(M)) * (1.914602 - T * (0.004817 + 0.000014 * T)) +
    Math.sin(rad(2 * M)) * (0.019993 - 0.000101 * T) +
    Math.sin(rad(3 * M)) * 0.000289;
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const lambda = trueLong - 0.00569 - 0.00478 * Math.sin(rad(omega));

  const eps0 =
    23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - T * 0.001813))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(rad(omega));
  const declination = deg(Math.asin(Math.sin(rad(eps)) * Math.sin(rad(lambda))));

  // Equation of time (minutes).
  const y = Math.tan(rad(eps / 2)) ** 2;
  const eqTime =
    4 *
    deg(
      y * Math.sin(2 * rad(L0)) -
        2 * e * Math.sin(rad(M)) +
        4 * e * y * Math.sin(rad(M)) * Math.cos(2 * rad(L0)) -
        0.5 * y * y * Math.sin(4 * rad(L0)) -
        1.25 * e * e * Math.sin(2 * rad(M)),
    );

  const minutesUTC =
    date.getUTCHours() * 60 + date.getUTCMinutes() + date.getUTCSeconds() / 60;
  const trueSolarTime = mod(minutesUTC + eqTime + 4 * lng, 1440);
  let ha = trueSolarTime / 4 - 180; // hour angle, degrees
  if (ha < -180) ha += 360;

  const zenith = deg(
    Math.acos(
      clamp(
        Math.sin(rad(lat)) * Math.sin(rad(declination)) +
          Math.cos(rad(lat)) * Math.cos(rad(declination)) * Math.cos(rad(ha)),
        -1,
        1,
      ),
    ),
  );
  const altitude = 90 - zenith;

  let azimuth: number;
  const denom = Math.cos(rad(lat)) * Math.sin(rad(zenith));
  if (Math.abs(denom) < 1e-9) {
    azimuth = altitude > 0 ? 180 : 0; // sun at zenith/nadir — azimuth undefined
  } else {
    const az = deg(
      Math.acos(
        clamp(
          (Math.sin(rad(lat)) * Math.cos(rad(zenith)) - Math.sin(rad(declination))) /
            denom,
          -1,
          1,
        ),
      ),
    );
    azimuth = ha > 0 ? mod(az + 180, 360) : mod(540 - az, 360);
  }

  return { altitude, azimuth, declination };
}

export const CARDINALS = [
  "N", "NNE", "NE", "ENE", "E", "ESE", "SE", "SSE",
  "S", "SSW", "SW", "WSW", "W", "WNW", "NW", "NNW",
] as const;

/** Nearest 16-point compass label for a bearing in degrees. */
export function cardinal(bearing: number): string {
  if (!Number.isFinite(bearing)) return "";
  return CARDINALS[Math.round(mod(bearing, 360) / 22.5) % 16];
}

export type Shadow = {
  /** bearing the shadow points toward (opposite the sun), degrees from north */
  direction: number;
  /** shadow length as a multiple of object height (cot of altitude); Infinity at/below horizon */
  lengthRatio: number;
};

/** Shadow cast by a vertical object given the sun's altitude + azimuth. */
export function shadow(altitude: number, azimuth: number): Shadow {
  const direction = mod(azimuth + 180, 360);
  const lengthRatio = altitude > 0.25 ? 1 / Math.tan(rad(altitude)) : Infinity;
  return { direction, lengthRatio };
}

/** Sun altitude implied by an observed shadow-length : object-height ratio. */
export function altitudeFromShadowRatio(shadowOverHeight: number): number {
  if (shadowOverHeight <= 0) return 90;
  return deg(Math.atan(1 / shadowOverHeight));
}

export type AltitudeMatch = { date: Date; azimuth: number };

/** All instants on a given UTC day when the sun reaches a target altitude at a
 *  point. Used for the reverse ("what time was this photo taken?") workflow —
 *  typically returns the morning and afternoon crossings. Samples per minute. */
export function timesAtAltitude(
  dayUTC: Date,
  lat: number,
  lng: number,
  targetAlt: number,
): AltitudeMatch[] {
  const base = Date.UTC(
    dayUTC.getUTCFullYear(),
    dayUTC.getUTCMonth(),
    dayUTC.getUTCDate(),
  );
  const matches: AltitudeMatch[] = [];
  let prevAlt: number | null = null;
  let prevDate: Date | null = null;
  for (let m = 0; m <= 1440; m++) {
    const d = new Date(base + m * 60_000);
    const { altitude } = sunPosition(d, lat, lng);
    if (prevAlt !== null && prevDate !== null) {
      const a = prevAlt - targetAlt;
      const b = altitude - targetAlt;
      if (a === 0 || a * b < 0) {
        // linear-interpolate the crossing minute for a tighter timestamp
        const frac = a === 0 ? 0 : a / (a - b);
        const cross = new Date(prevDate.getTime() + frac * 60_000);
        matches.push({ date: cross, azimuth: sunPosition(cross, lat, lng).azimuth });
      }
    }
    prevAlt = altitude;
    prevDate = d;
  }
  return matches;
}
