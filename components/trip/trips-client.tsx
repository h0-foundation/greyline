"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { Plus, Compass, MapPin, ArrowRight } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/empty-state";
import { formatTripDate, type DatePrecision } from "@/lib/trip-format";
import type { TripRow } from "@/app/trips/page";

const STATUS_VARIANT: Record<string, "default" | "secondary" | "outline"> = {
  planning: "secondary",
  active: "default",
  wrapped: "outline",
};

export function TripsClient({ initialTrips }: { initialTrips: TripRow[] }) {
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

  return (
    <div className="space-y-5">
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)}>
          <Plus className="size-4" /> New trip
        </Button>
      </div>

      {initialTrips.length === 0 ? (
        <EmptyState
          icon={Compass}
          title="Plan your first trip"
          description="Create a trip to build its threat model, add destinations, and track destination-aware OPSEC — all offline."
          action={<Button onClick={() => setOpen(true)}><Plus className="size-4" /> New trip</Button>}
        />
      ) : (
        <ul className="overflow-hidden rounded-xl border border-border bg-card shadow-xs">
          {initialTrips.map((t, i) => (
            <motion.li
              key={t.id}
              initial={reduce ? false : { opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.2, delay: reduce ? 0 : Math.min(i, 14) * 0.022, ease: [0.16, 1, 0.3, 1] }}
              className="border-b border-border last:border-b-0"
            >
              <Link
                href={`/trips/${t.id}`}
                className="group relative flex items-center gap-4 py-3.5 pl-5 pr-4 transition-colors hover:bg-accent/50 focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-inset focus-visible:ring-ring/50"
              >
                {/* accent left-edge bar on hover */}
                <span className="absolute inset-y-0 left-0 w-0.5 origin-top scale-y-0 bg-primary transition-transform duration-200 group-hover:scale-y-100" />
                <span className="w-8 shrink-0 font-mono text-xs tabular-nums text-faint">
                  {String(initialTrips.length - i).padStart(3, "0")}
                </span>
                <span className="min-w-0 flex-1 truncate font-medium text-foreground group-hover:text-accent-text">
                  {t.name}
                </span>
                <span className="hidden w-44 shrink-0 text-right font-mono text-xs tabular-nums text-muted-foreground sm:block">
                  {formatTripDate(t.start_date, t.end_date, t.date_precision as DatePrecision) ?? "—"}
                </span>
                <Badge variant={STATUS_VARIANT[t.status] ?? "secondary"} className="hidden shrink-0 capitalize sm:inline-flex">
                  {t.status}
                </Badge>
                <ArrowRight className="size-4 shrink-0 text-faint transition-transform group-hover:translate-x-0.5 group-hover:text-accent-text" />
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
