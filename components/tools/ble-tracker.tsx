"use client";

import { useState } from "react";
import { Radar, Smartphone, ShieldAlert, Info, CheckCircle2 } from "lucide-react";
import { cn } from "@/lib/utils";

/* BLE tracker-stalking defense — evidence-based education + a physical-sweep
 * checklist. Offline; nothing leaves the machine. Detection is imperfect by
 * design (research/COUNTER_SURVEILLANCE.md): this complements the OS scan and
 * AirGuard, it does not replace them. Safety-first framing. */

type Platform = "ios" | "android";

const PLATFORM_STEPS: Record<Platform, { label: string; steps: string[]; caveat: string }> = {
  ios: {
    label: "iPhone / iOS",
    steps: [
      "Act on any “Item Found Moving With You” notification immediately.",
      "Open Find My → Items → tap “Identify Found Item” to run a manual scan.",
      "Hold the tracker to the top of the phone (NFC) to read its serial / partial owner info.",
    ],
    caveat: "Apple's alerts can be bypassed by a cloned AirTag (PETS 2023) — always also do a physical sweep.",
  },
  android: {
    label: "Android",
    steps: [
      "Settings → Safety & emergency → Unknown tracker alerts → run a manual scan.",
      "Install AirGuard (TU Darmstadt, open-source) for continuous background scanning.",
      "Tap a detected tracker for a map of where it followed you and how to disable it.",
    ],
    caveat: "Cross-platform alerts (DULT, since May 2024) are slower and less reliable on Android than iOS.",
  },
};

const SWEEP = [
  "Bags & luggage: outer pockets, linings, laptop sleeves, the bottom seam.",
  "Vehicle exterior: wheel wells, bumpers, under the frame, gas-cap door, tow hitch.",
  "Vehicle interior: under seats, seat-back pockets, glovebox, trunk lining, spare-tire well.",
  "Clothing & gear: jacket pockets, bag straps, a child's backpack, a gift you were given.",
  "Listen: a tracker separated from its owner chirps after ~8–24h — search in a quiet room.",
];

const FACTS = [
  "≈19% of people experience stalking in their lifetime; AirTags are the most prevalent tracker (PETS 2024).",
  "22.5% of women have been stalked; 16–29% of victims face technology-facilitated tracking (CDC NISVS).",
];

export function BleTrackerDefense() {
  const [platform, setPlatform] = useState<Platform>("ios");
  const [checked, setChecked] = useState<Set<number>>(new Set());
  const toggle = (i: number) =>
    setChecked((prev) => {
      const next = new Set(prev);
      if (next.has(i)) next.delete(i);
      else next.add(i);
      return next;
    });

  const p = PLATFORM_STEPS[platform];

  return (
    <div className="space-y-6">
      {/* Safety-first banner */}
      <div className="flex items-start gap-3 rounded-xl border border-warning/40 bg-warning/10 p-4 text-sm">
        <ShieldAlert className="mt-0.5 size-4 shrink-0 text-warning" />
        <p className="text-foreground">
          <strong>If you suspect tracking by someone dangerous, don't immediately disable the tracker</strong> —
          it can signal that you've found it and escalate the situation. Get to a safe place, document it
          (photos, the map from your phone's scan), and contact a support service or law enforcement first.
        </p>
      </div>

      {/* What it is */}
      <div className="flex items-start gap-3 rounded-xl border border-border bg-accent-subtle/40 p-4 text-sm text-faint">
        <Info className="mt-0.5 size-4 shrink-0 text-accent-text" />
        <p>
          Bluetooth trackers (AirTag, Tile, Samsung SmartTag) report their location through the huge crowd of
          nearby phones, so a tracker hidden on you reveals your movements to whoever owns it. Detection below
          is honest about its limits — pair it with continuous OS / AirGuard scanning.
        </p>
      </div>

      {/* Platform detection */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
          <Smartphone className="size-3.5" /> Detect with your phone
        </h2>
        <div className="mt-3 flex gap-2">
          {(Object.keys(PLATFORM_STEPS) as Platform[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={platform === k}
              onClick={() => setPlatform(k)}
              className={cn(
                "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
                platform === k
                  ? "border-primary/40 bg-accent-subtle text-accent-text"
                  : "border-border text-faint hover:text-foreground",
              )}
            >
              {PLATFORM_STEPS[k].label}
            </button>
          ))}
        </div>
        <ol className="mt-4 list-decimal space-y-2 pl-5 text-sm text-foreground marker:text-faint">
          {p.steps.map((s, i) => (
            <li key={i}>{s}</li>
          ))}
        </ol>
        <p className="mt-3 text-xs text-faint">{p.caveat}</p>
      </div>

      {/* Physical sweep checklist */}
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h2 className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
          <Radar className="size-3.5" /> Physical sweep
        </h2>
        <ul className="mt-3 space-y-1.5">
          {SWEEP.map((s, i) => (
            <li key={i}>
              <button
                type="button"
                onClick={() => toggle(i)}
                className="flex w-full items-start gap-2.5 rounded-md px-1 py-1 text-left text-sm transition-colors hover:bg-accent-subtle/40"
              >
                <CheckCircle2
                  className={cn("mt-0.5 size-4 shrink-0", checked.has(i) ? "text-success" : "text-faint/50")}
                />
                <span className={cn(checked.has(i) ? "text-faint line-through" : "text-foreground")}>{s}</span>
              </button>
            </li>
          ))}
        </ul>
      </div>

      <ul className="space-y-1 text-xs text-faint">
        {FACTS.map((f, i) => (
          <li key={i}>· {f}</li>
        ))}
      </ul>
    </div>
  );
}
