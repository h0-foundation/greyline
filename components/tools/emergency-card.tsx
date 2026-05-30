"use client";

import { useRouter } from "next/navigation";
import { Printer, Siren, Phone, Flame, Plug, Building2 } from "lucide-react";
import { Button } from "@/components/ui/button";

type Summary = { country_code: string; name: string; flag: string };
type Emergency = { police?: string; ambulance?: string; fire?: string; general?: string };

const FIRST_ACTIONS = [
  "Get to safety first, then call the number that fits the emergency.",
  "Many places route everything through one number (EU 112, US/Canada 911) — but always confirm locally; not every country does.",
  "Have your travel-insurance assistance line and key medical facts ready (blood type, allergies, medications).",
  "For arrest, a lost passport, or hospitalisation, contact your embassy or consulate — find its address and after-hours line before you travel.",
];

function BigNumber({ label, value, icon: Icon }: { label: string; value?: string; icon: typeof Phone }) {
  return (
    <div className="rounded-lg border border-border bg-accent-subtle/30 p-3">
      <div className="flex items-center gap-1.5 text-xs text-faint">
        <Icon className="size-3.5" aria-hidden /> {label}
      </div>
      <div className="mt-1 font-mono text-2xl tabular-nums text-foreground">{value?.trim() || "—"}</div>
    </div>
  );
}

export function EmergencyTool({
  summaries,
  code,
  country,
  emergency,
  power,
}: {
  summaries: Summary[];
  code: string;
  country: { name: string; flag: string } | null;
  emergency: Emergency;
  power: string | null;
}) {
  const router = useRouter();

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end gap-3 print:hidden">
        <label className="flex flex-col gap-1 text-sm">
          <span className="text-faint">Destination</span>
          <select
            value={code}
            onChange={(e) => router.push(e.target.value ? `/tools/emergency?c=${e.target.value}` : "/tools/emergency")}
            aria-label="Destination country"
            className="min-w-56 rounded-md border border-input bg-background px-3 py-2 text-sm text-foreground outline-none focus-visible:border-ring focus-visible:ring-[3px] focus-visible:ring-ring/50"
          >
            <option value="">Select a country…</option>
            {summaries.map((s) => (
              <option key={s.country_code} value={s.country_code}>
                {s.flag} {s.name}
              </option>
            ))}
          </select>
        </label>
        {country && (
          <Button variant="outline" size="sm" onClick={() => window.print()}>
            <Printer className="size-4" /> Print card
          </Button>
        )}
      </div>

      {!country ? (
        <p className="text-sm text-faint">Choose a destination to see its emergency numbers and a printable card.</p>
      ) : (
        <div className="space-y-4 rounded-xl border border-border bg-card p-5 shadow-xs">
          <h2 className="flex items-center gap-2 text-lg font-semibold text-foreground">
            <span aria-hidden>{country.flag}</span> {country.name} — emergency card
          </h2>

          <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
            <BigNumber label="General (112 / 911)" value={emergency.general} icon={Siren} />
            <BigNumber label="Police" value={emergency.police} icon={Phone} />
            <BigNumber label="Ambulance" value={emergency.ambulance} icon={Phone} />
            <BigNumber label="Fire" value={emergency.fire} icon={Flame} />
          </div>

          {power && (
            <p className="flex items-center gap-1.5 text-sm text-faint">
              <Plug className="size-3.5" aria-hidden /> Power: <span className="text-foreground">{power}</span>
            </p>
          )}

          <ul className="space-y-1.5 text-sm text-foreground">
            {FIRST_ACTIONS.map((a, i) => (
              <li key={i} className="flex gap-2">
                <Siren className="mt-0.5 size-4 shrink-0 text-faint" aria-hidden />
                <span>{a}</span>
              </li>
            ))}
          </ul>

          <p className="flex items-start gap-2 text-sm text-faint">
            <Building2 className="mt-0.5 size-4 shrink-0" aria-hidden />
            <span>
              Locate your embassy or consulate before you travel — your foreign ministry publishes an official locator. Greyline doesn&apos;t bundle
              embassy addresses, so confirm the current one for your nationality.
            </span>
          </p>

          <p className="text-[11px] text-faint">Numbers from bundled country data — confirm locally before you rely on them.</p>
        </div>
      )}
    </div>
  );
}
