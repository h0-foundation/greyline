"use client";

import { useEffect, useMemo, useState } from "react";
import { motion, useReducedMotion } from "motion/react";
import {
  ShieldCheck,
  DoorClosed,
  KeyRound,
  Copy,
  Check,
  RotateCcw,
  Info,
  ArrowDownRight,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import {
  FACTORS,
  DEFAULT_ANSWERS,
  scoreRoom,
  frontDeskRequest,
  type Answers,
  type Grade,
} from "@/lib/hotel";

const STORAGE_KEY = "greyline:hotel-score";

// Band styling per grade. Colors map to the project's semantic tokens.
const BANDS: Record<Grade, { label: string; text: string; ring: string; bg: string }> = {
  A: { label: "Hardened", text: "text-primary", ring: "border-primary/40", bg: "bg-primary/5" },
  B: { label: "Solid", text: "text-primary", ring: "border-primary/30", bg: "bg-primary/5" },
  C: { label: "Marginal", text: "text-spark", ring: "border-spark/40", bg: "bg-spark/5" },
  D: { label: "Weak", text: "text-spark", ring: "border-spark/40", bg: "bg-spark/5" },
  F: { label: "Avoid", text: "text-destructive", ring: "border-destructive/40", bg: "bg-destructive/5" },
};

function isAnswers(v: unknown): v is Answers {
  if (typeof v !== "object" || v === null) return false;
  const o = v as Record<string, unknown>;
  return typeof o.floor === "number";
}

export function HotelAssessment() {
  const reduce = useReducedMotion();
  const [answers, setAnswers] = useState<Answers>(DEFAULT_ANSWERS);
  const [highCrime, setHighCrime] = useState(false);
  const [copied, setCopied] = useState(false);
  const [hydrated, setHydrated] = useState(false);

  // Load persisted answers once on mount.
  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        const parsed: unknown = JSON.parse(raw);
        if (parsed && typeof parsed === "object") {
          const o = parsed as Record<string, unknown>;
          if (isAnswers(o.answers)) {
            setAnswers({ ...DEFAULT_ANSWERS, ...o.answers });
          }
          if (typeof o.highCrime === "boolean") setHighCrime(o.highCrime);
        }
      }
    } catch {
      // ignore corrupt storage
    }
    setHydrated(true);
  }, []);

  // Persist on change (after initial hydration).
  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify({ answers, highCrime }));
    } catch {
      // storage may be unavailable (private mode); non-fatal
    }
  }, [answers, highCrime, hydrated]);

  const result = useMemo(() => scoreRoom(answers, highCrime), [answers, highCrime]);
  const request = useMemo(
    () => frontDeskRequest(result.gaps, answers.floor),
    [result.gaps, answers.floor],
  );
  const band = BANDS[result.grade];

  function setBool(id: keyof Answers, value: boolean) {
    setAnswers((prev) => ({ ...prev, [id]: value }));
  }

  function reset() {
    setAnswers(DEFAULT_ANSWERS);
    setHighCrime(false);
  }

  async function copyRequest() {
    try {
      await navigator.clipboard.writeText(request);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      // clipboard blocked; no-op
    }
  }

  return (
    <div className="grid gap-6 lg:grid-cols-[1fr_22rem]">
      {/* Assessment form */}
      <div className="space-y-4">
        <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
          <div className="mb-4 flex items-center gap-2">
            <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-text">
              <DoorClosed className="size-4" />
            </span>
            <div>
              <h2 className="text-sm font-medium text-foreground">Room assessment</h2>
              <p className="text-xs text-muted-foreground">
                Answer what you can observe. The score updates live.
              </p>
            </div>
          </div>

          {/* Floor (numeric) */}
          <div className="mb-4 flex items-center justify-between gap-4 border-b border-border pb-4">
            <label htmlFor="hotel-floor" className="text-sm text-foreground">
              {FACTORS[0]?.question}
              <span className="mt-0.5 block text-xs text-faint">
                Floors 3–6 score best.
              </span>
            </label>
            <Input
              id="hotel-floor"
              type="number"
              min={0}
              max={200}
              inputMode="numeric"
              className="w-20 text-center tabular-nums"
              value={Number.isFinite(answers.floor) ? answers.floor : 0}
              onChange={(e) => {
                const n = parseInt(e.target.value, 10);
                setAnswers((prev) => ({ ...prev, floor: Number.isFinite(n) ? n : 0 }));
              }}
            />
          </div>

          {/* Boolean factors */}
          <ul className="space-y-3">
            {FACTORS.filter((f) => f.type === "boolean").map((f) => {
              const id = f.id;
              // Switch ON should mean "the desired/secure state".
              const desired = f.desired ?? true;
              const value = answers[id] as boolean;
              const checked = desired ? value : !value;
              return (
                <li key={id} className="flex items-center justify-between gap-4">
                  <label htmlFor={`hotel-${id}`} className="text-sm text-foreground">
                    {f.question}
                  </label>
                  <Switch
                    id={`hotel-${id}`}
                    checked={checked}
                    onCheckedChange={(on) => setBool(id, desired ? on : !on)}
                  />
                </li>
              );
            })}
          </ul>

          {/* High-crime amplifier */}
          <div className="mt-4 flex items-center justify-between gap-4 border-t border-border pt-4">
            <label htmlFor="hotel-highcrime" className="text-sm text-foreground">
              High-crime area / street-level city
              <span className="mt-0.5 block text-xs text-faint">
                Amplifies floor, window-access, and exterior-door risk.
              </span>
            </label>
            <Switch
              id="hotel-highcrime"
              checked={highCrime}
              onCheckedChange={setHighCrime}
            />
          </div>
        </div>

        <div className="flex items-start gap-2 text-xs text-faint">
          <Info className="mt-0.5 size-3.5 shrink-0" />
          <p>
            Scoring follows OSAC hotel-security guidance (room selection, door and
            window control, and egress). It is advisory and runs entirely offline.
          </p>
        </div>
      </div>

      {/* Result panel */}
      <div className="space-y-4 lg:sticky lg:top-4 lg:self-start">
        <motion.div
          key={result.grade}
          initial={reduce ? false : { opacity: 0, scale: 0.98 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.2 }}
          className={cn(
            "rounded-xl border bg-card p-5 text-center shadow-xs",
            band.ring,
            band.bg,
          )}
        >
          <div className="flex items-center justify-center gap-1.5 text-xs text-muted-foreground">
            <ShieldCheck className="size-3.5" />
            Room Security Score
          </div>
          <div className={cn("mt-1 font-mono text-5xl font-bold tabular-nums", band.text)}>
            {result.score}
          </div>
          <div className="mt-1 flex items-center justify-center gap-2">
            <span className={cn("text-2xl font-bold", band.text)}>{result.grade}</span>
            <Badge variant="outline" className={band.text}>
              {band.label}
            </Badge>
          </div>
          <Button
            variant="ghost"
            size="sm"
            className="mt-3 text-faint"
            onClick={reset}
          >
            <RotateCcw className="size-3.5" />
            Reset
          </Button>
        </motion.div>

        {/* Biggest gaps */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <h3 className="mb-3 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <ArrowDownRight className="size-3.5 text-faint" />
            Biggest gaps
          </h3>
          {result.gaps.length === 0 ? (
            <p className="text-xs text-muted-foreground">
              No weaknesses flagged. Still do the on-arrival walkthrough below.
            </p>
          ) : (
            <ul className="space-y-2.5">
              {result.gaps.map((gap, i) => (
                <motion.li
                  key={gap.label}
                  initial={reduce ? false : { opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.18, delay: reduce ? 0 : i * 0.025 }}
                  className="rounded-lg border border-border bg-accent-subtle/30 p-2.5"
                >
                  <div className="flex items-start justify-between gap-2">
                    <span className="text-xs text-foreground">{gap.label}</span>
                    <Badge variant="outline" className="font-mono text-faint tabular-nums">
                      −{gap.penalty}
                    </Badge>
                  </div>
                  <p className="mt-1 text-xs text-muted-foreground">{gap.fix}</p>
                </motion.li>
              ))}
            </ul>
          )}
        </div>

        {/* Front-desk request */}
        <div className="rounded-xl border border-border bg-card p-4 shadow-xs">
          <h3 className="mb-2 flex items-center gap-1.5 text-xs font-medium text-foreground">
            <KeyRound className="size-3.5 text-faint" />
            Front-desk request
          </h3>
          <p className="rounded-lg bg-background p-3 text-sm text-foreground">{request}</p>
          <Button
            variant="outline"
            size="sm"
            className="mt-3 w-full"
            onClick={copyRequest}
            disabled={result.gaps.length === 0}
          >
            {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
            {copied ? "Copied" : "Copy request"}
          </Button>
        </div>
      </div>
    </div>
  );
}
