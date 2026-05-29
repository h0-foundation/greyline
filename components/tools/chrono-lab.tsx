"use client";

import { useMemo, useState } from "react";
import { Sun, Clock, Compass, Info, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  sunPosition,
  shadow,
  cardinal,
  altitudeFromShadowRatio,
  timesAtAltitude,
} from "@/lib/chrono";

type Mode = "forward" | "reverse";

const num = (s: string): number | null => {
  if (s.trim() === "") return null;
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
};
const validLat = (n: number | null): n is number => n !== null && n >= -90 && n <= 90;
const validLng = (n: number | null): n is number => n !== null && n >= -180 && n <= 180;

function polar(cx: number, cy: number, r: number, bearingDeg: number) {
  const a = (bearingDeg * Math.PI) / 180;
  return { x: cx + r * Math.sin(a), y: cy - r * Math.cos(a) };
}

export function ChronoLab() {
  const [mode, setMode] = useState<Mode>("forward");
  const [lat, setLat] = useState("");
  const [lng, setLng] = useState("");
  const [date, setDate] = useState("");
  const [time, setTime] = useState("12:00");
  const [tz, setTz] = useState<"utc" | "local">("utc");
  const [ratio, setRatio] = useState("");

  function loadExample() {
    // Bellingcat's worked shadow-geolocation example: Lisbon, 3 Dec 2020.
    setMode("forward");
    setLat("38.7223");
    setLng("-9.1393");
    setDate("2020-12-03");
    setTime("12:00");
    setTz("utc");
  }

  const latN = num(lat);
  const lngN = num(lng);

  const forward = useMemo(() => {
    if (!validLat(latN) || !validLng(lngN) || !date) return null;
    const iso = `${date}T${time || "12:00"}:00${tz === "utc" ? "Z" : ""}`;
    const d = new Date(iso);
    if (Number.isNaN(d.getTime())) return null;
    const p = sunPosition(d, latN, lngN);
    const s = shadow(p.altitude, p.azimuth);
    return { d, p, s };
  }, [latN, lngN, date, time, tz]);

  const reverse = useMemo(() => {
    const r = num(ratio);
    if (mode !== "reverse" || !validLat(latN) || !validLng(lngN) || !date || r === null || r <= 0)
      return null;
    const targetAlt = altitudeFromShadowRatio(r);
    const day = new Date(`${date}T00:00:00Z`);
    if (Number.isNaN(day.getTime())) return null;
    return { targetAlt, matches: timesAtAltitude(day, latN, lngN, targetAlt) };
  }, [mode, latN, lngN, date, ratio]);

  return (
    <div className="space-y-6">
      {/* methodology caveat — this is a hypothesis tester, not a solver */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-accent-subtle/40 p-4 text-sm text-faint">
        <Info className="mt-0.5 size-4 shrink-0 text-accent-text" />
        <p>
          Shadow analysis <strong className="text-foreground">validates</strong> a candidate location and
          time — it does not discover them. Supply a place and date; this tells you where the sun was and how
          shadows fell, so you can confirm or exclude your hypothesis. Everything is computed locally
          (NOAA/Meeus algorithm); nothing leaves this machine.
        </p>
      </div>

      <div className="flex items-center gap-2">
        <ModeButton active={mode === "forward"} onClick={() => setMode("forward")}>
          Sun &amp; shadow at a place
        </ModeButton>
        <ModeButton active={mode === "reverse"} onClick={() => setMode("reverse")}>
          Time from a shadow
        </ModeButton>
        <Button variant="ghost" size="sm" className="ml-auto" onClick={loadExample}>
          Load example
        </Button>
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* inputs */}
        <div className="space-y-4 rounded-xl border border-border bg-card p-4">
          <div className="grid grid-cols-2 gap-3">
            <Field label="Latitude" hint="−90 to 90">
              <input
                inputMode="decimal"
                aria-label="Latitude"
                value={lat}
                onChange={(e) => setLat(e.target.value)}
                placeholder="38.7223"
                className={inputCls(lat === "" || validLat(latN))}
              />
            </Field>
            <Field label="Longitude" hint="−180 to 180 (E+)">
              <input
                inputMode="decimal"
                aria-label="Longitude"
                value={lng}
                onChange={(e) => setLng(e.target.value)}
                placeholder="-9.1393"
                className={inputCls(lng === "" || validLng(lngN))}
              />
            </Field>
          </div>

          <Field label="Date">
            <input
              type="date"
              aria-label="Date"
              value={date}
              onChange={(e) => setDate(e.target.value)}
              className={inputCls(true)}
            />
          </Field>

          {mode === "forward" ? (
            <div className="grid grid-cols-2 gap-3">
              <Field label="Time">
                <input
                  type="time"
                  aria-label="Time"
                  value={time}
                  onChange={(e) => setTime(e.target.value)}
                  className={inputCls(true)}
                />
              </Field>
              <Field label="Time zone">
                <div className="flex rounded-md border border-input p-0.5">
                  {(["utc", "local"] as const).map((t) => (
                    <button
                      key={t}
                      type="button"
                      onClick={() => setTz(t)}
                      className={cn(
                        "flex-1 rounded px-2 py-1 text-xs font-medium uppercase tracking-wide transition-colors",
                        tz === t ? "bg-primary text-primary-foreground" : "text-faint hover:text-foreground",
                      )}
                    >
                      {t}
                    </button>
                  ))}
                </div>
              </Field>
            </div>
          ) : (
            <Field label="Observed shadow length ÷ object height" hint="e.g. a 2 m pole casting a 3 m shadow = 1.5">
              <input
                inputMode="decimal"
                aria-label="Shadow ratio"
                value={ratio}
                onChange={(e) => setRatio(e.target.value)}
                placeholder="1.5"
                className={inputCls(ratio === "" || (num(ratio) ?? 0) > 0)}
              />
            </Field>
          )}
        </div>

        {/* output */}
        <div className="rounded-xl border border-border bg-card p-4">
          {mode === "forward" && <ForwardOut forward={forward} />}
          {mode === "reverse" && <ReverseOut reverse={reverse} />}
        </div>
      </div>
    </div>
  );
}

function ForwardOut({ forward }: { forward: ReturnType<typeof useForward> }) {
  if (!forward)
    return <Empty icon={Sun}>Enter a latitude, longitude, and date to compute the sun&apos;s position.</Empty>;
  const { p, s } = forward;
  const below = p.altitude <= 0;
  return (
    <div className="space-y-4">
      <CompassDial azimuth={p.azimuth} shadowDir={s.direction} altitude={p.altitude} />
      {below ? (
        <p className="text-sm text-faint">
          The sun is <strong className="text-foreground">below the horizon</strong> ({p.altitude.toFixed(1)}°) — no
          shadow is cast at this time.
        </p>
      ) : (
        <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
          <Stat label="Sun altitude" value={`${p.altitude.toFixed(1)}°`} />
          <Stat
            label="Sun azimuth"
            value={`${p.azimuth.toFixed(1)}°`}
            chip={cardinal(p.azimuth)}
          />
          <Stat
            label="Shadow points"
            value={`${s.direction.toFixed(0)}°`}
            chip={cardinal(s.direction)}
          />
          <Stat
            label="Shadow length"
            value={Number.isFinite(s.lengthRatio) ? `${s.lengthRatio.toFixed(2)}× height` : "very long"}
          />
        </dl>
      )}
    </div>
  );
}

function ReverseOut({ reverse }: { reverse: ReturnType<typeof useReverse> }) {
  if (!reverse)
    return (
      <Empty icon={Clock}>
        Enter a candidate location, the date, and the observed shadow-to-height ratio to find when the photo
        could have been taken.
      </Empty>
    );
  const { targetAlt, matches } = reverse;
  return (
    <div className="space-y-4">
      <p className="text-sm text-faint">
        A shadow that long means the sun sat at <strong className="text-foreground">{targetAlt.toFixed(1)}°</strong>{" "}
        altitude. On that date at that place, the sun was at that height at:
      </p>
      {matches.length === 0 ? (
        <p className="text-sm text-faint">
          The sun never reaches {targetAlt.toFixed(1)}° here on this date — this location/date can be{" "}
          <strong className="text-foreground">excluded</strong>.
        </p>
      ) : (
        <ul className="space-y-2">
          {matches.map((m, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-lg border border-border bg-background px-3 py-2 text-sm"
            >
              <span className="font-mono tabular-nums">
                {m.date.toISOString().slice(11, 16)} UTC
              </span>
              <Badge variant="secondary" className="gap-1">
                <Compass className="size-3" /> {cardinal(m.azimuth)} · {m.azimuth.toFixed(0)}°
              </Badge>
            </li>
          ))}
        </ul>
      )}
      <p className="text-xs text-faint">
        Two times (morning &amp; afternoon) are normal — cross-reference the shadow&apos;s compass direction
        above to disambiguate.
      </p>
    </div>
  );
}

function CompassDial({
  azimuth,
  shadowDir,
  altitude,
}: {
  azimuth: number;
  shadowDir: number;
  altitude: number;
}) {
  const C = 80;
  const R = 62;
  const sun = polar(C, C, R, azimuth);
  const shadowLen = altitude > 0 ? Math.min(R, (R * Math.min(1 / Math.tan((altitude * Math.PI) / 180), 4)) / 4 + 14) : 0;
  const sh = polar(C, C, shadowLen, shadowDir);
  return (
    <svg viewBox="0 0 160 160" className="mx-auto block size-40" role="img" aria-label="Sun and shadow compass">
      <circle cx={C} cy={C} r={R} className="fill-none stroke-border" strokeWidth={1} />
      {(["N", "E", "S", "W"] as const).map((d, i) => {
        const pt = polar(C, C, R + 8, i * 90);
        return (
          <text key={d} x={pt.x} y={pt.y + 3} textAnchor="middle" className="fill-faint text-[9px]">
            {d}
          </text>
        );
      })}
      {/* shadow direction (muted, dashed) */}
      {altitude > 0 && (
        <line x1={C} y1={C} x2={sh.x} y2={sh.y} className="stroke-muted-foreground" strokeWidth={2} strokeDasharray="3 2" />
      )}
      {/* sun marker (spark/gold) */}
      <line x1={C} y1={C} x2={sun.x} y2={sun.y} className="stroke-spark/40" strokeWidth={1} />
      <circle cx={sun.x} cy={sun.y} r={5} className="fill-spark" />
      <circle cx={C} cy={C} r={2.5} className="fill-foreground" />
    </svg>
  );
}

function Stat({ label, value, chip }: { label: string; value: string; chip?: string }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wide text-faint">{label}</dt>
      <dd className="mt-0.5 flex items-center gap-2 font-mono tabular-nums text-foreground">
        {value}
        {chip && <Badge variant="secondary">{chip}</Badge>}
      </dd>
    </div>
  );
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="block space-y-1.5">
      <span className="flex items-baseline justify-between">
        <span className="text-xs font-medium text-foreground">{label}</span>
        {hint && <span className="text-[10px] text-faint">{hint}</span>}
      </span>
      {children}
    </label>
  );
}

function Empty({ icon: Icon, children }: { icon: React.ComponentType<{ className?: string }>; children: React.ReactNode }) {
  return (
    <div className="flex h-full min-h-40 flex-col items-center justify-center gap-2 text-center text-sm text-faint">
      <Icon className="size-6 text-faint" />
      <p className="max-w-xs">{children}</p>
    </div>
  );
}

function ModeButton({ active, onClick, children }: { active: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary/40 bg-accent-subtle text-accent-text"
          : "border-border text-faint hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

function inputCls(ok: boolean) {
  return cn(
    "w-full rounded-md border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors",
    "focus-visible:ring-[3px] focus-visible:ring-ring/50",
    ok ? "border-input" : "border-destructive",
  );
}

// helper types to keep the output components honest
function useForward() {
  return null as unknown as { d: Date; p: ReturnType<typeof sunPosition>; s: ReturnType<typeof shadow> } | null;
}
function useReverse() {
  return null as unknown as { targetAlt: number; matches: ReturnType<typeof timesAtAltitude> } | null;
}
