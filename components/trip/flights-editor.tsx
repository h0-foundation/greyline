"use client";

// Client-side flight CRUD for a trip. Renders existing rows, lets you add new
// flights inline, edit dates/seat, and delete. After every mutation we
// router.refresh() so the server-rendered Itinerary panel (layover analysis)
// recomputes against the new data.

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Plane, Trash2, Plus, Save, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";

export type FlightRowUi = {
  id: string;
  carrier_iata: string | null;
  flight_number: string | null;
  dep_iata: string | null;
  dep_time: string | null;
  arr_iata: string | null;
  arr_time: string | null;
  seat: string | null;
  status: "planned" | "booked" | "flown" | "cancelled";
  notes: string | null;
};

const STATUS_VARIANT: Record<FlightRowUi["status"], "default" | "secondary" | "outline"> = {
  planned: "outline",
  booked: "secondary",
  flown: "default",
  cancelled: "outline",
};

function fmtTime(iso: string | null): string {
  if (!iso) return "—";
  try {
    return iso.replace("T", " ").slice(0, 16);
  } catch { return iso; }
}

function NewFlightForm({ tripId, onAdded, onCancel }: { tripId: string; onAdded: () => void; onCancel: () => void }) {
  const [carrier, setCarrier] = useState("");
  const [flightNum, setFlightNum] = useState("");
  const [depIata, setDepIata] = useState("");
  const [depTime, setDepTime] = useState("");
  const [arrIata, setArrIata] = useState("");
  const [arrTime, setArrTime] = useState("");
  const [seat, setSeat] = useState("");
  const [status, setStatus] = useState<FlightRowUi["status"]>("planned");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setErr("");
    setBusy(true);
    try {
      const res = await fetch(`/api/trips/${tripId}/flights`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          carrier_iata: carrier || null,
          flight_number: flightNum || null,
          dep_iata: depIata || null,
          dep_time: depTime ? new Date(depTime).toISOString() : null,
          arr_iata: arrIata || null,
          arr_time: arrTime ? new Date(arrTime).toISOString() : null,
          seat: seat || null,
          status,
        }),
      });
      if (!res.ok) {
        const j = await res.json().catch(() => ({}));
        setErr((j as { error?: string }).error || "Could not save flight.");
        return;
      }
      onAdded();
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="rounded-lg border border-border bg-card p-4 space-y-3">
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-4">
        <div className="space-y-1">
          <Label htmlFor="f-carrier">Carrier</Label>
          <Input id="f-carrier" placeholder="LH" maxLength={4} value={carrier} onChange={(e) => setCarrier(e.target.value.toUpperCase())} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-num">Flight #</Label>
          <Input id="f-num" placeholder="441" maxLength={8} value={flightNum} onChange={(e) => setFlightNum(e.target.value.toUpperCase())} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-seat">Seat</Label>
          <Input id="f-seat" placeholder="14A" maxLength={6} value={seat} onChange={(e) => setSeat(e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-status">Status</Label>
          <select
            id="f-status"
            value={status}
            onChange={(e) => setStatus(e.target.value as FlightRowUi["status"])}
            className="h-9 w-full rounded-md border border-input bg-transparent px-3 text-sm"
          >
            <option value="planned">planned</option>
            <option value="booked">booked</option>
            <option value="flown">flown</option>
            <option value="cancelled">cancelled</option>
          </select>
        </div>
      </div>
      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label htmlFor="f-dep">From (IATA)</Label>
          <div className="flex gap-2">
            <Input id="f-dep" placeholder="JFK" maxLength={4} className="w-20" value={depIata} onChange={(e) => setDepIata(e.target.value.toUpperCase())} />
            <Input type="datetime-local" value={depTime} onChange={(e) => setDepTime(e.target.value)} className="flex-1" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="f-arr">To (IATA)</Label>
          <div className="flex gap-2">
            <Input id="f-arr" placeholder="FRA" maxLength={4} className="w-20" value={arrIata} onChange={(e) => setArrIata(e.target.value.toUpperCase())} />
            <Input type="datetime-local" value={arrTime} onChange={(e) => setArrTime(e.target.value)} className="flex-1" />
          </div>
        </div>
      </div>
      {err && <p className="text-sm text-destructive">{err}</p>}
      <div className="flex justify-end gap-2">
        <Button type="button" variant="ghost" size="sm" onClick={onCancel}>
          <X className="size-4" /> Cancel
        </Button>
        <Button type="submit" size="sm" disabled={busy}>
          <Save className="size-4" /> {busy ? "Saving…" : "Add flight"}
        </Button>
      </div>
    </form>
  );
}

// Carrier IATA → known-rule lookup, so we can chip in basic limits inline.
export type FlightRuleSummary = {
  carrier_iata: string;
  carrier_name: string;
  cabin_l_cm: number | null;
  cabin_w_cm: number | null;
  cabin_h_cm: number | null;
  cabin_weight_kg: number | null;
  liquids_ml: number;
  source_url: string | null;
};

export function FlightsEditor({
  tripId, initial, rules,
}: {
  tripId: string;
  initial: FlightRowUi[];
  rules?: Record<string, FlightRuleSummary>;
}) {
  const router = useRouter();
  const [flights, setFlights] = useState(initial);
  const [adding, setAdding] = useState(false);
  const ruleByIata = rules ?? {};

  async function reload() {
    const res = await fetch(`/api/trips/${tripId}/flights`);
    if (res.ok) {
      const { flights } = (await res.json()) as { flights: FlightRowUi[] };
      setFlights(flights);
    }
    router.refresh();
  }

  async function remove(id: string) {
    await fetch(`/api/trips/${tripId}/flights`, {
      method: "DELETE",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id }),
    });
    await reload();
  }

  async function updateStatus(id: string, status: FlightRowUi["status"]) {
    await fetch(`/api/trips/${tripId}/flights`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id, status }),
    });
    await reload();
  }

  return (
    <div className="space-y-3">
      {flights.length === 0 && !adding && (
        <p className="text-sm text-muted-foreground">
          No flights yet. Add ticket info and the briefing computes layovers, transit visas, and posture per stop.
        </p>
      )}
      {flights.length > 0 && (
        <ul className="space-y-2">
          {flights.map((f) => {
            const rule = f.carrier_iata ? ruleByIata[f.carrier_iata] : undefined;
            return (
            <li
              key={f.id}
              className="flex flex-wrap items-center gap-x-4 gap-y-2 rounded-lg border border-border bg-card p-3.5"
            >
              <div className="flex items-center gap-2">
                <Plane className="size-4 text-faint" />
                <span className="font-mono text-sm font-semibold text-foreground">
                  {f.carrier_iata || "—"} {f.flight_number || ""}
                </span>
                {rule && (
                  <span
                    className="font-mono text-[10px] uppercase tracking-wide text-faint"
                    title={`${rule.carrier_name} carry-on rules${rule.source_url ? " · " + rule.source_url : ""}`}
                  >
                    {rule.cabin_l_cm}×{rule.cabin_w_cm}×{rule.cabin_h_cm}cm
                    {rule.cabin_weight_kg != null && ` · ${rule.cabin_weight_kg}kg`}
                  </span>
                )}
              </div>
              <div className="font-mono text-sm text-muted-foreground">
                <span className="text-foreground">{f.dep_iata || "—"}</span>
                <span className="mx-1 text-faint">→</span>
                <span className="text-foreground">{f.arr_iata || "—"}</span>
              </div>
              <div className="font-mono text-xs text-faint tabular-nums">
                {fmtTime(f.dep_time)} <span className="mx-1">→</span> {fmtTime(f.arr_time)}
              </div>
              {f.seat && <Badge variant="outline" className="font-mono">{f.seat}</Badge>}
              <select
                value={f.status}
                onChange={(e) => updateStatus(f.id, e.target.value as FlightRowUi["status"])}
                className="ml-auto h-7 rounded-md border border-input bg-transparent px-2 text-xs"
                aria-label="Flight status"
              >
                <option value="planned">planned</option>
                <option value="booked">booked</option>
                <option value="flown">flown</option>
                <option value="cancelled">cancelled</option>
              </select>
              <Badge variant={STATUS_VARIANT[f.status]} className="capitalize">{f.status}</Badge>
              <button
                onClick={() => remove(f.id)}
                aria-label="Delete flight"
                className="p-1.5 text-faint transition-colors hover:text-destructive"
              >
                <Trash2 className="size-4" />
              </button>
            </li>
            );
          })}
        </ul>
      )}

      {adding ? (
        <NewFlightForm
          tripId={tripId}
          onAdded={async () => { setAdding(false); await reload(); }}
          onCancel={() => setAdding(false)}
        />
      ) : (
        <Button variant="outline" size="sm" onClick={() => setAdding(true)}>
          <Plus className="size-4" /> Add flight
        </Button>
      )}
    </div>
  );
}
