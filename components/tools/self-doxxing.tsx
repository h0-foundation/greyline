"use client";

import { useEffect, useMemo, useState } from "react";
import {
  Search,
  Copy,
  Check,
  ExternalLink,
  ShieldOff,
  CalendarClock,
  Trash2,
  RotateCcw,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  type Identifiers,
  emptyIdentifiers,
  buildDorks,
  auditStatus,
} from "@/lib/self-doxxing";

// ---------------------------------------------------------------------------
// localStorage keys (all data stays on this machine).
// ---------------------------------------------------------------------------
const IDENTIFIERS_KEY = "greyline:selfdox:identifiers";
const BROKERS_KEY = "greyline:selfdox:brokers";
const AUDIT_KEY = "greyline:selfdox:audit";

// ---------------------------------------------------------------------------
// Types for the bundled broker catalog (public/content/brokers.json).
// ---------------------------------------------------------------------------
type BrokerCategory = "data_broker" | "people_search" | "aggregator";
type BrokerMethod = "web_form" | "email" | "phone" | "account_required";
type BrokerStatus =
  | "not_started"
  | "submitted"
  | "pending_verification"
  | "confirmed"
  | "reappeared";

interface Broker {
  id: string;
  name: string;
  category: BrokerCategory;
  optOutUrl: string;
  method: BrokerMethod;
  requiresId: boolean;
  verificationEmail: boolean;
  reappearsDays: number;
}

interface BrokerState {
  status: BrokerStatus;
  confirmedAt: string | null; // ISO timestamp set when status -> confirmed
}

// ---------------------------------------------------------------------------
// Small UI helpers.
// ---------------------------------------------------------------------------

function CopyButton({ value }: { value: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <Button
      type="button"
      variant="ghost"
      size="sm"
      onClick={() => {
        void navigator.clipboard?.writeText(value).then(() => {
          setCopied(true);
          setTimeout(() => setCopied(false), 1200);
        });
      }}
      aria-label="Copy query"
    >
      {copied ? <Check className="text-spark" /> : <Copy />}
      {copied ? "Copied" : "Copy"}
    </Button>
  );
}

const CATEGORY_LABEL: Record<BrokerCategory, string> = {
  data_broker: "Data broker",
  people_search: "People search",
  aggregator: "Aggregator",
};

const METHOD_LABEL: Record<BrokerMethod, string> = {
  web_form: "Web form",
  email: "Email",
  phone: "Phone",
  account_required: "Account required",
};

const STATUS_LABEL: Record<BrokerStatus, string> = {
  not_started: "Not started",
  submitted: "Submitted",
  pending_verification: "Pending verification",
  confirmed: "Confirmed",
  reappeared: "Reappeared",
};

// Ordered cycle the "advance" button walks through.
const STATUS_ORDER: BrokerStatus[] = [
  "not_started",
  "submitted",
  "pending_verification",
  "confirmed",
];

function statusBadgeClass(status: BrokerStatus): string {
  switch (status) {
    case "confirmed":
      return "border-transparent bg-accent-subtle text-spark";
    case "reappeared":
      return "border-transparent bg-red-800 text-white";
    case "not_started":
      return "text-faint";
    default:
      return "text-accent-text";
  }
}

// ---------------------------------------------------------------------------
// MODULE 1 — Dork / query generator.
// ---------------------------------------------------------------------------

function commaList(values: string[]): string {
  return values.join(", ");
}

function parseList(value: string): string[] {
  return value
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean);
}

function DorkGenerator() {
  const [ids, setIds] = useState<Identifiers>(emptyIdentifiers);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(IDENTIFIERS_KEY);
      if (raw) {
        const parsed = JSON.parse(raw) as Partial<Identifiers>;
        setIds({ ...emptyIdentifiers(), ...parsed });
      }
    } catch {
      /* ignore */
    }
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(IDENTIFIERS_KEY, JSON.stringify(ids));
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [ids, hydrated]);

  const groups = useMemo(() => buildDorks(ids), [ids]);
  const hasInput =
    ids.name.trim() !== "" ||
    ids.emails.length > 0 ||
    ids.phones.length > 0 ||
    ids.usernames.length > 0;

  function clearAll() {
    setIds(emptyIdentifiers());
    try {
      window.localStorage.removeItem(IDENTIFIERS_KEY);
    } catch {
      /* ignore */
    }
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
        <Search className="size-4 text-accent-text" />
        Search yourself
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
        Enter what you want to hunt for. Greyline builds copy-ready queries and
        direct lookup links but never runs them — you paste them into a search
        engine yourself. Everything you type is stored only in this browser.
      </p>

      <div className="mt-4 grid gap-3 sm:grid-cols-2">
        <Field label="Full name">
          <Input
            value={ids.name}
            placeholder="Jane Q. Doe"
            onChange={(e) => setIds((p) => ({ ...p, name: e.target.value }))}
          />
        </Field>
        <Field label="Aliases / maiden names (comma-separated)">
          <Input
            value={commaList(ids.aliases)}
            placeholder="J. Doe, Jane Smith"
            onChange={(e) =>
              setIds((p) => ({ ...p, aliases: parseList(e.target.value) }))
            }
          />
        </Field>
        <Field label="City">
          <Input
            value={ids.city}
            placeholder="Austin"
            onChange={(e) => setIds((p) => ({ ...p, city: e.target.value }))}
          />
        </Field>
        <Field label="Employer / school">
          <Input
            value={ids.employer}
            placeholder="Acme Corp"
            onChange={(e) =>
              setIds((p) => ({ ...p, employer: e.target.value }))
            }
          />
        </Field>
        <Field label="Emails (comma-separated)">
          <Input
            value={commaList(ids.emails)}
            placeholder="jane@example.com, old@mail.com"
            onChange={(e) =>
              setIds((p) => ({ ...p, emails: parseList(e.target.value) }))
            }
          />
        </Field>
        <Field label="Phones (comma-separated)">
          <Input
            value={commaList(ids.phones)}
            placeholder="555-123-4567"
            onChange={(e) =>
              setIds((p) => ({ ...p, phones: parseList(e.target.value) }))
            }
          />
        </Field>
        <Field label="Usernames / handles (comma-separated)">
          <Input
            value={commaList(ids.usernames)}
            placeholder="janedoe, jdoe99"
            onChange={(e) =>
              setIds((p) => ({ ...p, usernames: parseList(e.target.value) }))
            }
          />
        </Field>
      </div>

      <div className="mt-3 flex items-center justify-between gap-3">
        <p className="text-[11px] text-faint">
          Stored only on this machine. Nothing is transmitted.
        </p>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={clearAll}
          disabled={!hasInput}
        >
          <Trash2 />
          Clear all
        </Button>
      </div>

      {groups.length > 0 && (
        <div className="mt-4 space-y-4">
          {groups.map((g) => (
            <div
              key={g.group}
              className="rounded-lg border border-border bg-background/40 p-3"
            >
              <h3 className="font-mono text-xs font-medium text-muted-foreground">
                {g.group}
              </h3>
              <ul className="mt-2 space-y-1.5">
                {g.queries.map((q, i) => (
                  <li
                    key={`${g.group}-${i}`}
                    className="flex items-start gap-2"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-[11px] text-faint">{q.label}</p>
                      {q.query ? (
                        <code className="block break-all font-mono text-xs text-foreground">
                          {q.query}
                        </code>
                      ) : (
                        <a
                          href={q.url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 break-all text-xs text-accent-text hover:underline"
                        >
                          {q.url}
                          <ExternalLink className="size-3 shrink-0" />
                        </a>
                      )}
                    </div>
                    {q.query && <CopyButton value={q.query} />}
                  </li>
                ))}
              </ul>
            </div>
          ))}
        </div>
      )}
    </section>
  );
}

function Field({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <label className="block space-y-1">
      <span className="text-xs text-muted-foreground">{label}</span>
      {children}
    </label>
  );
}

// ---------------------------------------------------------------------------
// MODULE 2 — Broker opt-out tracker.
// ---------------------------------------------------------------------------

type CategoryFilter = "all" | BrokerCategory;
type StatusFilter = "all" | BrokerStatus | "needs_recheck";

function loadBrokerStates(): Record<string, BrokerState> {
  try {
    const raw = window.localStorage.getItem(BROKERS_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    return parsed as Record<string, BrokerState>;
  } catch {
    return {};
  }
}

function needsRecheck(broker: Broker, state: BrokerState, now: number): boolean {
  if (state.status !== "confirmed" || !state.confirmedAt) return false;
  const confirmed = new Date(state.confirmedAt).getTime();
  if (Number.isNaN(confirmed)) return false;
  const daysSince = (now - confirmed) / (1000 * 60 * 60 * 24);
  return daysSince > broker.reappearsDays;
}

function BrokerTracker() {
  const [brokers, setBrokers] = useState<Broker[]>([]);
  const [states, setStates] = useState<Record<string, BrokerState>>({});
  const [hydrated, setHydrated] = useState(false);
  const [categoryFilter, setCategoryFilter] = useState<CategoryFilter>("all");
  const [statusFilter, setStatusFilter] = useState<StatusFilter>("all");
  const now = Date.now();

  useEffect(() => {
    setStates(loadBrokerStates());
    setHydrated(true);
    void fetch("/content/brokers.json")
      .then((r) => (r.ok ? (r.json() as Promise<Broker[]>) : []))
      .then((data) => setBrokers(Array.isArray(data) ? data : []))
      .catch(() => setBrokers([]));
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(BROKERS_KEY, JSON.stringify(states));
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [states, hydrated]);

  function getState(id: string): BrokerState {
    return states[id] ?? { status: "not_started", confirmedAt: null };
  }

  function setStatus(id: string, status: BrokerStatus) {
    setStates((prev) => ({
      ...prev,
      [id]: {
        status,
        confirmedAt:
          status === "confirmed"
            ? (prev[id]?.confirmedAt ?? new Date().toISOString())
            : null,
      },
    }));
  }

  // Advance through the normal lifecycle (not_started -> ... -> confirmed),
  // wrapping back to not_started after confirmed.
  function advance(id: string) {
    const current = getState(id).status;
    if (current === "reappeared") {
      setStatus(id, "submitted");
      return;
    }
    const idx = STATUS_ORDER.indexOf(current);
    const next = STATUS_ORDER[(idx + 1) % STATUS_ORDER.length] ?? "not_started";
    setStatus(id, next);
  }

  const confirmedCount = brokers.filter(
    (b) => getState(b.id).status === "confirmed"
  ).length;

  const recheckList = brokers.filter((b) =>
    needsRecheck(b, getState(b.id), now)
  );

  const visible = brokers.filter((b) => {
    if (categoryFilter !== "all" && b.category !== categoryFilter) return false;
    const st = getState(b.id);
    if (statusFilter === "all") return true;
    if (statusFilter === "needs_recheck") return needsRecheck(b, st, now);
    return st.status === statusFilter;
  });

  const pct = brokers.length
    ? Math.round((confirmedCount / brokers.length) * 100)
    : 0;

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
        <ShieldOff className="size-4 text-accent-text" />
        Broker opt-out tracker
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
        Work each broker through its opt-out flow and record where you are.
        Confirmed removals frequently reappear — Greyline flags them for re-check
        based on each broker&apos;s typical relisting window.
      </p>

      <div className="mt-4 space-y-2">
        <div className="flex items-center justify-between text-xs">
          <span className="font-mono text-muted-foreground">
            {confirmedCount} / {brokers.length} confirmed removed
          </span>
          {recheckList.length > 0 && (
            <span className="text-destructive">
              {recheckList.length} need re-check
            </span>
          )}
        </div>
        <Progress value={pct} />
      </div>

      <div className="mt-4 flex flex-wrap gap-3">
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Category
          <select
            value={categoryFilter}
            onChange={(e) =>
              setCategoryFilter(e.target.value as CategoryFilter)
            }
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
          >
            <option value="all">All</option>
            <option value="data_broker">Data broker</option>
            <option value="people_search">People search</option>
            <option value="aggregator">Aggregator</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-muted-foreground">
          Status
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
            className="h-8 rounded-md border border-input bg-background px-2 text-xs text-foreground"
          >
            <option value="all">All</option>
            <option value="not_started">Not started</option>
            <option value="submitted">Submitted</option>
            <option value="pending_verification">Pending verification</option>
            <option value="confirmed">Confirmed</option>
            <option value="reappeared">Reappeared</option>
            <option value="needs_recheck">Needs re-check</option>
          </select>
        </label>
      </div>

      <ul className="mt-4 divide-y divide-border">
        {visible.map((b) => {
          const st = getState(b.id);
          const recheck = needsRecheck(b, st, now);
          return (
            <li
              key={b.id}
              className="flex flex-wrap items-center gap-x-3 gap-y-2 py-3"
            >
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2">
                  <a
                    href={b.optOutUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1 text-sm font-medium text-foreground hover:text-accent-text hover:underline"
                  >
                    {b.name}
                    <ExternalLink className="size-3 shrink-0 text-faint" />
                  </a>
                  <Badge variant="outline" className="text-faint">
                    {CATEGORY_LABEL[b.category]}
                  </Badge>
                </div>
                <p className="mt-0.5 text-[11px] text-faint">
                  {METHOD_LABEL[b.method]}
                  {b.requiresId && " · ID required"}
                  {b.verificationEmail && " · email verification"}
                  {" · relists ~"}
                  {b.reappearsDays}d
                  {recheck && (
                    <span className="text-destructive"> · re-check now</span>
                  )}
                </p>
              </div>
              <Badge
                variant="outline"
                className={statusBadgeClass(
                  recheck ? "reappeared" : st.status
                )}
              >
                {recheck ? "Re-check due" : STATUS_LABEL[st.status]}
              </Badge>
              <div className="flex gap-1.5">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => advance(b.id)}
                >
                  Advance
                </Button>
                {recheck ? (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setStatus(b.id, "reappeared")}
                  >
                    Mark reappeared
                  </Button>
                ) : (
                  st.status !== "not_started" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setStatus(b.id, "not_started")}
                      aria-label="Reset broker status"
                    >
                      <RotateCcw />
                    </Button>
                  )
                )}
              </div>
            </li>
          );
        })}
        {visible.length === 0 && (
          <li className="py-4 text-center text-xs text-faint">
            No brokers match this filter.
          </li>
        )}
      </ul>
    </section>
  );
}

// ---------------------------------------------------------------------------
// MODULE 3 — Recurring audit cadence.
// ---------------------------------------------------------------------------

interface AuditPrefs {
  lastRun: string | null;
  cadenceMonths: number;
}

function loadAudit(): AuditPrefs {
  try {
    const raw = window.localStorage.getItem(AUDIT_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<AuditPrefs>;
      return {
        lastRun: typeof parsed.lastRun === "string" ? parsed.lastRun : null,
        cadenceMonths:
          typeof parsed.cadenceMonths === "number" ? parsed.cadenceMonths : 6,
      };
    }
  } catch {
    /* ignore */
  }
  return { lastRun: null, cadenceMonths: 6 };
}

function AuditCadence() {
  const [prefs, setPrefs] = useState<AuditPrefs>({
    lastRun: null,
    cadenceMonths: 6,
  });
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setPrefs(loadAudit());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      window.localStorage.setItem(AUDIT_KEY, JSON.stringify(prefs));
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [prefs, hydrated]);

  const status = auditStatus(prefs.lastRun, prefs.cadenceMonths);

  let stateLabel = "On track";
  let stateClass = "border-transparent bg-accent-subtle text-spark";
  if (status.overdue) {
    stateLabel = "Overdue";
    stateClass = "border-transparent bg-red-800 text-white";
  } else if (status.due) {
    stateLabel = "Due";
    stateClass = "border-transparent bg-red-700 text-white";
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
        <CalendarClock className="size-4 text-accent-text" />
        Audit cadence
      </h2>
      <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
        Exposure regrows. Pick how often you&apos;ll re-run this audit and start
        a run to reset the clock.
      </p>

      <div className="mt-4 flex flex-wrap items-end gap-4">
        <label className="space-y-1 text-xs text-muted-foreground">
          <span>Cadence</span>
          <select
            value={prefs.cadenceMonths}
            onChange={(e) =>
              setPrefs((p) => ({
                ...p,
                cadenceMonths: Number(e.target.value),
              }))
            }
            className="block h-9 rounded-md border border-input bg-background px-3 text-sm text-foreground"
          >
            <option value={3}>Every 3 months</option>
            <option value={6}>Every 6 months</option>
            <option value={12}>Every 12 months</option>
          </select>
        </label>

        <div className="space-y-1">
          <Badge variant="outline" className={stateClass}>
            {stateLabel}
          </Badge>
          <p className="text-xs text-muted-foreground">
            {prefs.lastRun
              ? status.daysRemaining >= 0
                ? `${status.daysRemaining} day${status.daysRemaining === 1 ? "" : "s"} until next due`
                : `${Math.abs(status.daysRemaining)} day${Math.abs(status.daysRemaining) === 1 ? "" : "s"} past due`
              : "No run recorded yet"}
          </p>
        </div>

        <Button
          type="button"
          onClick={() =>
            setPrefs((p) => ({ ...p, lastRun: new Date().toISOString() }))
          }
        >
          Start new run
        </Button>
      </div>

      {prefs.lastRun && (
        <p className="mt-3 text-[11px] text-faint">
          Last run {new Date(prefs.lastRun).toLocaleDateString()}.
        </p>
      )}
    </section>
  );
}

// ---------------------------------------------------------------------------
// Top-level tool — three interactive modules.
// ---------------------------------------------------------------------------

export function SelfDoxxingChecklist() {
  return (
    <div className="space-y-6">
      <DorkGenerator />
      <BrokerTracker />
      <AuditCadence />

      <p className="text-[11px] text-faint text-pretty">
        Method: Michael Bazzell&apos;s IntelTechniques workbook, Yael Grauer&apos;s
        Big Ass Data Broker Opt-Out List, and the Access Now self-doxxing guide.
        Greyline runs no searches and stores everything only in this browser.
      </p>
    </div>
  );
}
