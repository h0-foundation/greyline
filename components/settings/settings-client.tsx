"use client";

import { useEffect, useState } from "react";
import { useTheme } from "next-themes";
import {
  ShieldCheck,
  Sun,
  Moon,
  Monitor,
  Plug,
  Info,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CONNECTIONS } from "@/lib/connections";

type Toggle = { api_id: string; enabled: boolean; use_tor: boolean };

function truthy(v: string | undefined): boolean {
  return String(v ?? "").replace(/"/g, "") === "true";
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5 shadow-xs">{children}</div>;
}

export function SettingsClient() {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState("metric");
  const [offline, setOffline] = useState(false);
  const [toggles, setToggles] = useState<Toggle[]>([]);

  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/toggles").then((r) => r.json()),
    ])
      .then(([settings, tg]: [Record<string, string>, Toggle[]]) => {
        setOffline(truthy(settings.master_offline));
        setUnits(String(settings.units ?? "metric").replace(/"/g, "") || "metric");
        setToggles(tg);
      })
      .finally(() => setLoading(false));
  }, []);

  async function saveSetting(key: string, value: string) {
    await fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ [key]: value }),
    });
  }

  function setMasterOffline(next: boolean) {
    setOffline(next);
    void saveSetting("master_offline", String(next));
  }

  function setUnit(next: string) {
    setUnits(next);
    void saveSetting("units", next);
  }

  async function setConnection(apiId: string, enabled: boolean) {
    setToggles((prev) =>
      prev.map((t) => (t.api_id === apiId ? { ...t, enabled } : t)),
    );
    await fetch("/api/toggles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_id: apiId, enabled }),
    });
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-28 w-full rounded-xl" />
        <Skeleton className="h-24 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  const enabledCount = toggles.filter((t) => t.enabled).length;

  return (
    <div className="space-y-6">
      {/* Master offline kill-switch */}
      <Card>
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <Label htmlFor="offline" className="flex items-center gap-2 text-base">
              <ShieldCheck className="size-4 text-accent-text" />
              Master offline switch
            </Label>
            <p className="max-w-prose text-sm text-muted-foreground">
              When on, Greyline makes no network requests at all — every surface renders from
              bundled local data. This overrides all connection toggles below.
            </p>
          </div>
          <Switch id="offline" checked={offline} onCheckedChange={setMasterOffline} />
        </div>
      </Card>

      {/* Appearance */}
      <Card>
        <h2 className="text-sm font-semibold text-foreground">Appearance</h2>
        <div className="mt-4 space-y-4">
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Theme</span>
            <Segmented
              value={mounted ? (theme ?? "system") : "system"}
              onChange={setTheme}
              options={[
                { value: "light", label: "Light", icon: Sun },
                { value: "dark", label: "Dark", icon: Moon },
                { value: "system", label: "System", icon: Monitor },
              ]}
            />
          </div>
          <div className="flex items-center justify-between gap-4">
            <span className="text-sm text-muted-foreground">Units</span>
            <Segmented
              value={units}
              onChange={setUnit}
              options={[
                { value: "metric", label: "Metric" },
                { value: "imperial", label: "Imperial" },
              ]}
            />
          </div>
        </div>
      </Card>

      {/* Connections */}
      <Card>
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
              <Plug className="size-4 text-faint" />
              Optional data connections
            </h2>
            <p className="mt-1 max-w-prose text-sm text-muted-foreground">
              Each connection is off by default. Turning one on lets Greyline fetch from the host
              shown — only when you use that feature, and only while the master switch is off.
            </p>
          </div>
          <span className="shrink-0 font-mono text-xs text-faint tabular-nums">
            {offline ? "0" : enabledCount} / {toggles.length}
          </span>
        </div>

        <ul className="mt-4 divide-y divide-border">
          {CONNECTIONS.map((conn) => {
            const t = toggles.find((x) => x.api_id === conn.id);
            const checked = !offline && (t?.enabled ?? false);
            return (
              <li key={conn.id} className="flex items-center justify-between gap-4 py-3.5">
                <div className="min-w-0 space-y-0.5">
                  <Label htmlFor={`conn-${conn.id}`} className="text-sm font-medium text-foreground">
                    {conn.label}
                  </Label>
                  <p className="text-sm text-muted-foreground">{conn.description}</p>
                  <p className="font-mono text-[11px] text-faint">{conn.host}</p>
                </div>
                <Switch
                  id={`conn-${conn.id}`}
                  checked={checked}
                  disabled={offline}
                  onCheckedChange={(v) => setConnection(conn.id, v)}
                  aria-label={`Toggle ${conn.label}`}
                />
              </li>
            );
          })}
        </ul>
        {offline && (
          <p className="mt-3 flex items-center gap-1.5 text-xs text-faint">
            <Info className="size-3" />
            Connections are paused while the master offline switch is on.
          </p>
        )}
      </Card>
    </div>
  );
}

function Segmented({
  value,
  onChange,
  options,
}: {
  value: string;
  onChange: (v: string) => void;
  options: { value: string; label: string; icon?: React.ComponentType<{ className?: string }> }[];
}) {
  return (
    <div className="inline-flex rounded-lg border border-border bg-muted/50 p-0.5">
      {options.map((o) => {
        const Icon = o.icon;
        const active = value === o.value;
        return (
          <button
            key={o.value}
            type="button"
            onClick={() => onChange(o.value)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium transition-colors",
              active
                ? "bg-card text-foreground shadow-xs"
                : "text-muted-foreground hover:text-foreground",
            )}
          >
            {Icon && <Icon className="size-3.5" />}
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
