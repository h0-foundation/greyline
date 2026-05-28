"use client";

// Rich planning-trip rows. Each row stacks: name + status + dates, then a
// thin metrics strip (destinations / flights / carriers / readiness / peak
// advisory). Built for /trips when the focus is *what's next*, not history.

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import {
  Plus, Compass, MapPin, Plane, ShieldAlert, ListChecks, FileBadge,
  ArrowRight, Calendar,
} from "lucide-react";
import {
  Dialog, DialogContent, DialogTitle, DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { formatTripDate, type DatePrecision } from "@/lib/trip-format";
import { TRANSITION } from "@/lib/motion";

export type PlanningTrip = {
  id: string;
  name: string;
  status: string;
  start_date: string | null;
  end_date: string | null;
  date_precision: string;
  destinations_count: number;
  destination_flags: string[];          // up to 5 — emoji
  flights_count: number;
  carriers_count: number;
  packing_pct: number | null;           // null = not started
  docs_pct: number | null;
  peak_advisory_level: number | null;   // 1..4 or null
  days_until: number | null;            // signed; negative = started, null = no start
};

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  planning: "secondary",
  active: "default",
  wrapped: "outline",
};

const ADV_TONE: Record<number, string> = {
  1: "bg-success",
  2: "bg-warning",
  3: "bg-accent-text",
  4: "bg-destructive",
};

function daysLabel(d: number | null): string {
  if (d == null) return "no dates";
  if (d > 0) return `in ${d}d`;
  if (d === 0) return "today";
  return `${-d}d in`;
}

export function PlanningList({ initialTrips }: { initialTrips: PlanningTrip[] }) {
  const router = useRouter();
  const reduce = useReducedMotion();
  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [start, setStart] = useState("");
  const [end, setEnd] = useState("");
  const [notes, setNotes] = useState("");
  const [saving, setSaving] = useState(false);

  async function createTrip(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);
    const res = await fetch("/api/trips", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ name: name.trim(), start_date: start, end_date: end, notes }),
    });
    setSaving(false);
    if (res.ok) {
      const { trip } = await res.json();
      setOpen(false);
      setName(""); setStart(""); setEnd(""); setNotes("");
      router.push(`/trips/${trip.id}`);
    }
  }

  // Sort: active first, then planning by days_until ascending (soonest first).
  const ordered = [...initialTrips].sort((a, b) => {
    if (a.status === "active" && b.status !== "active") return -1;
    if (b.status === "active" && a.status !== "active") return 1;
    const ax = a.days_until ?? 999_999;
    const bx = b.days_until ?? 999_999;
    return ax - bx;
  });

  return (
    <div className="space-y-5">
      <div className="flex items-end justify-between gap-3 border-b border-border pb-3">
        <div className="space-y-0.5">
          <p className="label-caps text-faint">
            {ordered.length === 0 ? "Nothing in flight" : `${ordered.length} trip${ordered.length === 1 ? "" : "s"} in flight`}
          </p>
          <p className="text-sm text-muted-foreground">
            Active and planning trips. Each row pulls live readiness + carrier limits + peak advisory.
          </p>
        </div>
        <Button onClick={() => setOpen(true)} size="sm">
          <Plus className="size-4" /> New trip
        </Button>
      </div>

      {ordered.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="No trips in flight"
          description="Plan the next one — destinations, flights, threat model, and packing all auto-fill from your dossier."
          action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New trip</Button>}
        />
      ) : (
        <ul className="space-y-3">
          {ordered.map((t, i) => (
            <motion.li
              key={t.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ ...TRANSITION.snap, delay: reduce ? 0 : Math.min(i, 10) * 0.025 }}
            >
              <Link
                href={`/trips/${t.id}`}
                className="surface-interactive group flex flex-col gap-3 rounded-xl border border-border bg-card p-4 hover:border-primary/30 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50"
              >
                {/* Header row */}
                <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                  <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                    <h3 className="font-display text-lg font-semibold text-foreground group-hover:text-accent-text">
                      {t.name}
                    </h3>
                    <Badge variant={STATUS_VARIANT[t.status] ?? "secondary"} className="capitalize">
                      {t.status}
                    </Badge>
                    {t.destination_flags.length > 0 && (
                      <span aria-hidden className="text-sm leading-none">
                        {t.destination_flags.slice(0, 5).join(" ")}
                      </span>
                    )}
                  </div>
                  <div className="flex items-baseline gap-2 font-mono text-xs tabular-nums text-faint">
                    <Calendar className="size-3" />
                    {formatTripDate(t.start_date, t.end_date, t.date_precision as DatePrecision) ?? "—"}
                    {t.days_until != null && (
                      <span className={t.days_until <= 0 ? "text-accent-text" : "text-faint"}>
                        · {daysLabel(t.days_until)}
                      </span>
                    )}
                  </div>
                </div>

                {/* Metrics strip */}
                <div className="grid grid-cols-2 gap-3 border-t border-border pt-3 sm:grid-cols-5">
                  <Metric
                    icon={MapPin}
                    label="Destinations"
                    value={String(t.destinations_count)}
                  />
                  <Metric
                    icon={Plane}
                    label="Flights"
                    value={t.flights_count > 0 ? `${t.flights_count}` : "—"}
                    subtle={t.flights_count > 0 ? `${t.carriers_count} carrier${t.carriers_count === 1 ? "" : "s"}` : undefined}
                  />
                  <Metric
                    icon={ListChecks}
                    label="Packing"
                    value={t.packing_pct != null ? `${t.packing_pct}%` : "—"}
                    tone={t.packing_pct == null ? "muted" : t.packing_pct >= 80 ? "success" : t.packing_pct >= 40 ? "warning" : "destructive"}
                  />
                  <Metric
                    icon={FileBadge}
                    label="Documents"
                    value={t.docs_pct != null ? `${t.docs_pct}%` : "—"}
                    tone={t.docs_pct == null ? "muted" : t.docs_pct >= 80 ? "success" : t.docs_pct >= 40 ? "warning" : "destructive"}
                  />
                  <Metric
                    icon={ShieldAlert}
                    label="Advisory"
                    value={t.peak_advisory_level != null ? `L${t.peak_advisory_level}` : "—"}
                    dotClass={t.peak_advisory_level != null ? ADV_TONE[t.peak_advisory_level] : undefined}
                  />
                </div>

                <p className="flex justify-end text-xs text-accent-text">
                  Open trip
                  <ArrowRight className="ml-1 size-3.5 transition-transform group-hover:translate-x-0.5" />
                </p>
              </Link>
            </motion.li>
          ))}
        </ul>
      )}

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-md">
          <form onSubmit={createTrip} className="space-y-4">
            <div className="space-y-1.5">
              <DialogTitle className="font-display text-lg font-semibold text-foreground">New trip</DialogTitle>
              <DialogDescription className="text-sm text-muted-foreground">Nothing leaves your machine.</DialogDescription>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-name">Name</Label>
              <Input id="trip-name" value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Berlin assignment" autoFocus required />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="trip-start">Start</Label>
                <Input id="trip-start" type="date" value={start} onChange={(e) => setStart(e.target.value)} />
              </div>
              <div className="space-y-2">
                <Label htmlFor="trip-end">End</Label>
                <Input id="trip-end" type="date" value={end} onChange={(e) => setEnd(e.target.value)} />
              </div>
            </div>
            <div className="space-y-2">
              <Label htmlFor="trip-notes">Notes</Label>
              <Textarea id="trip-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} />
            </div>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
              <Button type="submit" disabled={saving || !name.trim()}>
                {saving ? "Creating…" : "Create trip"}
              </Button>
            </div>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}

function Metric({
  icon: Icon, label, value, subtle, tone, dotClass,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  subtle?: string;
  tone?: "success" | "warning" | "destructive" | "muted";
  dotClass?: string;
}) {
  const TONE: Record<"success" | "warning" | "destructive" | "muted", string> = {
    success: "text-success",
    warning: "text-warning",
    destructive: "text-destructive",
    muted: "text-faint",
  };
  return (
    <div className="space-y-0.5">
      <p className="label-caps text-faint inline-flex items-center gap-1.5">
        <Icon className="size-3" /> {label}
      </p>
      <p className={`font-mono text-sm font-medium tabular-nums ${tone ? TONE[tone] : "text-foreground"} inline-flex items-center gap-1.5`}>
        {dotClass && <span className={`inline-block size-1.5 rounded-full ${dotClass}`} aria-hidden />}
        {value}
      </p>
      {subtle && <p className="text-[10px] text-faint">{subtle}</p>}
    </div>
  );
}
