// Most-restrictive baggage / liquids / lithium limits across this trip's
// carriers. Renders inline at the top of the briefing so what you can bring
// is the first thing the user sees.

import { Luggage, Battery, Droplets, Plane } from "lucide-react";
import type { TripLimits } from "@/lib/trip-kit";

function dim(l: number | null, w: number | null, h: number | null): string {
  if (l == null || w == null || h == null) return "—";
  return `${l}×${w}×${h} cm`;
}

export function TripLimitsCard({ limits, carrierCount }: { limits: TripLimits; carrierCount: number }) {
  if (carrierCount === 0) return null;
  return (
    <div className="rounded-xl border border-border bg-card p-4 surface-raised">
      <div className="flex flex-wrap items-baseline justify-between gap-3 border-b border-border pb-2">
        <h3 className="font-display text-sm font-semibold text-foreground inline-flex items-center gap-2">
          <Plane className="size-4 text-faint" />
          Limits for this trip
        </h3>
        <p className="font-mono text-[11px] text-faint tabular-nums">
          most-restrictive across {carrierCount} carrier{carrierCount === 1 ? "" : "s"}
          {limits.source_carrier && <> · tightest: <span className="text-foreground">{limits.source_carrier}</span></>}
        </p>
      </div>
      <dl className="mt-3 grid grid-cols-2 gap-4 sm:grid-cols-4">
        <div>
          <dt className="label-caps text-faint inline-flex items-center gap-1.5">
            <Luggage className="size-3" />
            Carry-on
          </dt>
          <dd className="mt-1 font-mono text-sm tabular-nums text-foreground">
            {dim(limits.cabin_l_cm, limits.cabin_w_cm, limits.cabin_h_cm)}
            {limits.cabin_weight_kg != null && (
              <span className="ml-1 text-faint">/ {limits.cabin_weight_kg}kg</span>
            )}
          </dd>
        </div>
        <div>
          <dt className="label-caps text-faint inline-flex items-center gap-1.5">
            <Luggage className="size-3" />
            Personal
          </dt>
          <dd className="mt-1 font-mono text-sm tabular-nums text-foreground">
            {dim(limits.personal_dim.l, limits.personal_dim.w, limits.personal_dim.h)}
          </dd>
        </div>
        <div>
          <dt className="label-caps text-faint inline-flex items-center gap-1.5">
            <Droplets className="size-3" />
            Liquids
          </dt>
          <dd className="mt-1 font-mono text-sm tabular-nums text-foreground">
            {limits.liquids_ml} ml / container
          </dd>
        </div>
        <div>
          <dt className="label-caps text-faint inline-flex items-center gap-1.5">
            <Battery className="size-3" />
            Lithium (Wh)
          </dt>
          <dd className="mt-1 font-mono text-sm tabular-nums text-foreground">
            {limits.lithium_wh_installed_max ?? "—"}
            <span className="text-faint"> in-device · </span>
            {limits.lithium_wh_spare_max ?? "—"}
            <span className="text-faint"> spare</span>
          </dd>
        </div>
      </dl>
    </div>
  );
}
