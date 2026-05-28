// Server-rendered layover analysis. Reads the trip's flights, runs lib/itinerary
// on them with airport + visa + advisory context, and renders the result.

import { ShieldAlert, ArrowRight, Clock, MapPin, Hourglass, AlertTriangle } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import type { Layover } from "@/lib/itinerary";

const ADV_TONE: Record<number, string> = {
  1: "text-success",
  2: "text-warning",
  3: "text-accent-text",
  4: "text-destructive",
};

function durLabel(min: number | null): string {
  if (min == null) return "—";
  if (min < 60) return `${min}m`;
  const h = Math.floor(min / 60);
  const m = min % 60;
  return m === 0 ? `${h}h` : `${h}h ${m}m`;
}

function timeLabel(iso: string | null): string {
  if (!iso) return "—";
  return iso.replace("T", " ").slice(11, 16);
}

export function ItineraryPanel({
  layovers,
  exposureScore,
}: {
  layovers: Layover[];
  exposureScore: number;
}) {
  if (layovers.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        Add at least two flights to see layover analysis (transit visa, posture, tight connections).
      </p>
    );
  }

  return (
    <div className="space-y-4">
      {/* Exposure roll-up */}
      <div className="flex items-baseline gap-3 border-b border-border pb-3">
        <p className="label-caps text-faint">Route exposure</p>
        <p className="font-mono text-xl font-semibold tabular-nums text-foreground">{exposureScore}</p>
        <p className="text-xs text-muted-foreground">
          higher = more friction (advisories, transit visas, tight or misrouted connections)
        </p>
      </div>

      <ul className="space-y-3">
        {layovers.map((l, i) => {
          const advTone = l.advisory_level != null ? ADV_TONE[l.advisory_level] : "text-muted-foreground";
          return (
            <li
              key={i}
              className={`rounded-lg border border-border bg-card p-4 ${l.misroute || l.tight ? "ring-1 ring-inset ring-warning/40" : ""}`}
            >
              <div className="flex flex-wrap items-baseline gap-x-4 gap-y-1">
                <span className="inline-flex items-center gap-1.5 font-mono text-sm">
                  <span className="text-foreground">{l.stage_in.arr_iata}</span>
                  <ArrowRight className="size-3 text-faint" />
                  <span className="text-faint">{l.iata}</span>
                  <ArrowRight className="size-3 text-faint" />
                  <span className="text-foreground">{l.stage_out.dep_iata}</span>
                </span>
                <span className="font-mono text-xs text-muted-foreground tabular-nums">
                  <Clock className="-mt-0.5 mr-1 inline size-3" />
                  {timeLabel(l.stage_in.arr_time)} → {timeLabel(l.stage_out.dep_time)}
                </span>
                <span className={`inline-flex items-center gap-1 font-mono text-xs ${l.tight ? "text-warning" : "text-faint"}`}>
                  <Hourglass className="size-3" />
                  {durLabel(l.duration_min)}
                  {l.tight && <span className="ml-1">· tight</span>}
                  {l.overnight && <span className="ml-1 text-faint">· overnight</span>}
                </span>
                {l.airport && (
                  <span className="text-xs text-muted-foreground">
                    <MapPin className="-mt-0.5 mr-1 inline size-3 text-faint" />
                    {l.airport.municipality || l.airport.name}
                    {l.iso_country && (
                      <Badge variant="outline" className="ml-1.5 font-mono">{l.iso_country}</Badge>
                    )}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap items-center gap-2 text-xs">
                {l.misroute && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="size-3" /> Misroute: arrival ≠ next departure
                  </Badge>
                )}
                {l.advisory_level != null && (
                  <Badge variant="outline" className={`gap-1 ${advTone}`}>
                    <ShieldAlert className="size-3" />
                    Advisory L{l.advisory_level}
                  </Badge>
                )}
                {l.transit_visa && l.transit_visa.requirement !== "visa_free" && l.transit_visa.requirement !== "home" && (
                  <Badge variant="secondary" className="capitalize">
                    Transit: {l.transit_visa.requirement.replace(/_/g, " ")}
                  </Badge>
                )}
                {l.posture_flags?.map((f, j) => (
                  <Badge key={j} variant="outline" className="text-faint">{f}</Badge>
                ))}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
