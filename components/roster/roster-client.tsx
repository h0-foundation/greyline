"use client";

import { useMemo, useState } from "react";
import { Users, Plus, Trash2, CheckCircle2, Siren, ShieldAlert, Phone, Mail, HeartPulse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { EmptyState } from "@/components/empty-state";
import { summarizeRoster, sortByUrgency, CHECKIN_LABEL, type Traveler, type CheckinStatus } from "@/lib/roster";

/* Team duty-of-care roster. Add the people you're responsible for, record their
 * emergency details, and track live check-in status (OK / overdue / SOS).
 * Local-only — every call hits the on-device /api/travelers. */

const STATUS_TONE: Record<CheckinStatus, string> = {
  ok: "text-success border-success/40 bg-success/10",
  overdue: "text-warning border-warning/40 bg-warning/10",
  sos: "text-destructive border-destructive/40 bg-destructive/10",
  unknown: "text-faint border-border bg-background/50",
};

export function RosterClient({ initial }: { initial: Traveler[] }) {
  const [travelers, setTravelers] = useState<Traveler[]>(initial);
  const [name, setName] = useState("");
  const [role, setRole] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [emergency, setEmergency] = useState("");
  const [blood, setBlood] = useState("");
  const [notes, setNotes] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const ordered = useMemo(() => sortByUrgency(travelers), [travelers]);
  const summary = useMemo(() => summarizeRoster(travelers.map((t) => t.checkin_status)), [travelers]);

  async function refetch() {
    const res = await fetch("/api/travelers");
    const data = await res.json();
    if (data.ok) setTravelers(data.travelers);
  }

  async function add(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || busy) return;
    setBusy(true);
    setError(null);
    try {
      const res = await fetch("/api/travelers", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name, role, phone, email, emergency_contact: emergency, blood_type: blood, notes,
        }),
      });
      const data = await res.json();
      if (!res.ok || !data.ok) throw new Error(data.error || "Could not add traveller");
      setName(""); setRole(""); setPhone(""); setEmail(""); setEmergency(""); setBlood(""); setNotes("");
      await refetch();
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  async function checkin(id: string, status: CheckinStatus) {
    await fetch(`/api/travelers/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ checkin: status }),
    });
    await refetch();
  }

  async function remove(id: string) {
    if (!confirm("Remove this traveller from the roster?")) return;
    await fetch(`/api/travelers/${id}`, { method: "DELETE" });
    await refetch();
  }

  return (
    <div className="space-y-6">
      {/* Summary band */}
      {travelers.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {summary.sos > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-1 text-sm text-destructive">
              <Siren className="size-4" /> {summary.sos} SOS
            </span>
          )}
          {summary.overdue > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-warning/40 bg-warning/10 px-3 py-1 text-sm text-foreground">
              <ShieldAlert className="size-4 text-warning" /> {summary.overdue} overdue
            </span>
          )}
          <span className="inline-flex items-center gap-1.5 rounded-md border border-success/40 bg-success/10 px-3 py-1 text-sm text-foreground">
            <CheckCircle2 className="size-4 text-success" /> {summary.ok} checked in
          </span>
          {summary.unknown > 0 && (
            <span className="inline-flex items-center gap-1.5 rounded-md border border-border bg-background/50 px-3 py-1 text-sm text-faint">
              {summary.unknown} no check-in
            </span>
          )}
        </div>
      )}

      {/* Add traveller */}
      <form onSubmit={add} className="space-y-3 rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="inline-flex items-center gap-2 font-display text-lg font-semibold text-foreground">
          <Plus className="size-4 text-faint" /> Add traveller
        </h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label htmlFor="tv-name">Name</Label>
            <Input id="tv-name" value={name} onChange={(e) => setName(e.target.value)} maxLength={120} required />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tv-role">Role</Label>
            <Input id="tv-role" value={role} onChange={(e) => setRole(e.target.value)} placeholder="Journalist, fixer…" maxLength={120} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tv-phone">Phone</Label>
            <Input id="tv-phone" value={phone} onChange={(e) => setPhone(e.target.value)} maxLength={60} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tv-email">Email</Label>
            <Input id="tv-email" value={email} onChange={(e) => setEmail(e.target.value)} maxLength={160} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tv-emergency">Emergency contact</Label>
            <Input id="tv-emergency" value={emergency} onChange={(e) => setEmergency(e.target.value)} placeholder="Next of kin + number" maxLength={200} />
          </div>
          <div className="space-y-1">
            <Label htmlFor="tv-blood">Blood type</Label>
            <Input id="tv-blood" value={blood} onChange={(e) => setBlood(e.target.value)} maxLength={8} placeholder="O+" />
          </div>
        </div>
        <div className="space-y-1">
          <Label htmlFor="tv-notes">Notes</Label>
          <Textarea id="tv-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={2} maxLength={2000} placeholder="Allergies, medication, languages…" />
        </div>
        {error && <p className="text-sm text-destructive">{error}</p>}
        <Button type="submit" disabled={busy || !name.trim()}>{busy ? "Adding…" : "Add to roster"}</Button>
      </form>

      {/* Roster list */}
      {ordered.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No travellers yet"
          description="Add the people you're responsible for. You'll be able to record check-ins, flag an SOS, and keep their emergency details to hand — all on your machine."
        />
      ) : (
        <ul className="space-y-3">
          {ordered.map((t) => (
            <li key={t.id} className="rounded-xl border border-border bg-card p-4 shadow-xs">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="space-y-1">
                  <p className="inline-flex items-center gap-2 font-display text-base font-semibold text-foreground">
                    {t.name}
                    {t.role && <span className="text-xs font-normal text-faint">· {t.role}</span>}
                  </p>
                  <div className="flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
                    {t.phone && <span className="inline-flex items-center gap-1"><Phone className="size-3" /> {t.phone}</span>}
                    {t.email && <span className="inline-flex items-center gap-1"><Mail className="size-3" /> {t.email}</span>}
                    {t.emergency_contact && <span className="inline-flex items-center gap-1"><HeartPulse className="size-3" /> {t.emergency_contact}</span>}
                    {t.blood_type && <span className="font-mono">{t.blood_type}</span>}
                  </div>
                  {t.notes && <p className="max-w-prose text-xs text-faint">{t.notes}</p>}
                  {t.last_checkin && t.checkin_status !== "sos" && (
                    <p className="font-mono text-[10px] text-faint">last check-in {t.last_checkin}</p>
                  )}
                </div>
                <span className={`shrink-0 rounded-md border px-2 py-0.5 text-xs font-medium ${STATUS_TONE[t.checkin_status]}`}>
                  {CHECKIN_LABEL[t.checkin_status]}
                </span>
              </div>
              <div className="mt-3 flex flex-wrap gap-2 border-t border-border pt-3">
                <Button variant="secondary" size="sm" onClick={() => checkin(t.id, "ok")}>
                  <CheckCircle2 className="size-4" /> Check in
                </Button>
                <Button variant="ghost" size="sm" onClick={() => checkin(t.id, "sos")} className="text-destructive hover:text-destructive">
                  <Siren className="size-4" /> SOS
                </Button>
                <Button variant="ghost" size="sm" onClick={() => remove(t.id)} className="ml-auto text-faint">
                  <Trash2 className="size-4" /> Remove
                </Button>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
