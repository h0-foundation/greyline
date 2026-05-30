"use client";

import { useState } from "react";
import { ShieldAlert, Smartphone, Info } from "lucide-react";
import { cn } from "@/lib/utils";
import {
  buildThreatModel,
  THREAT_TIERS,
  type DeviceOs,
  type ThreatTier,
} from "@/lib/threat-model";

const DEVICES: { value: DeviceOs; label: string }[] = [
  { value: "android", label: "Android" },
  { value: "ios", label: "iPhone / iOS" },
  { value: "other", label: "Other" },
];

export function ThreatModelWizard() {
  const [os, setOs] = useState<DeviceOs>("android");
  const [tier, setTier] = useState<ThreatTier>("elevated");
  const vectors = buildThreatModel(os, tier);

  return (
    <div className="space-y-6">
      <div className="flex items-start gap-3 rounded-xl border border-border bg-accent-subtle/40 p-4 text-sm text-faint">
        <Info className="mt-0.5 size-4 shrink-0 text-accent-text" />
        <p>
          A defensive signature-reduction plan for your device and risk level — only documented threats with
          real, current mitigations (no folklore). Counter-surveillance here is defensive; nothing on this page
          leaves the machine. Not legal advice.
        </p>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <Picker label="Your device" icon={Smartphone}>
          {DEVICES.map((d) => (
            <Chip key={d.value} active={os === d.value} onClick={() => setOs(d.value)}>
              {d.label}
            </Chip>
          ))}
        </Picker>
        <Picker label="Threat level" icon={ShieldAlert}>
          {THREAT_TIERS.map((t) => (
            <Chip key={t.value} active={tier === t.value} onClick={() => setTier(t.value)}>
              {t.label}
            </Chip>
          ))}
        </Picker>
      </div>

      <ul className="space-y-3">
        {vectors.map((v) => (
          <li key={v.id} className="rounded-xl border border-border bg-card p-5 shadow-xs">
            <h3 className="font-medium text-foreground">{v.name}</h3>
            <p className="mt-1 text-sm text-muted-foreground">{v.summary}</p>
            <ul className="mt-3 space-y-3">
              {v.mitigations.map((m, i) => (
                <li key={i} className="border-l-2 border-primary/30 pl-3">
                  <p className="text-sm text-foreground">{m.text}</p>
                  <p className="mt-0.5 text-xs text-faint">
                    <span className="text-muted-foreground">Why:</span> {m.why}
                  </p>
                  <p className="mt-0.5 font-mono text-[11px] text-faint">{m.source}</p>
                </li>
              ))}
            </ul>
          </li>
        ))}
      </ul>
    </div>
  );
}

function Picker({
  label,
  icon: Icon,
  children,
}: {
  label: string;
  icon: React.ComponentType<{ className?: string }>;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <span className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-faint">
        <Icon className="size-3.5" /> {label}
      </span>
      <div className="mt-3 flex flex-wrap gap-2">{children}</div>
    </div>
  );
}

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-lg border px-3 py-1.5 text-sm font-medium transition-colors",
        active
          ? "border-primary/40 bg-accent-subtle text-accent-text"
          : "border-border text-faint hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}
