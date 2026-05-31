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
  UserRound,
} from "lucide-react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import { cn } from "@/lib/utils";
import { CONNECTIONS, CONNECTION_CATEGORIES, type ConnectionMeta } from "@/lib/connections";

type Country = { code: string; name: string };

type Toggle = { api_id: string; enabled: boolean; use_tor: boolean; has_key?: boolean };

function truthy(v: string | undefined): boolean {
  return String(v ?? "").replace(/"/g, "") === "true";
}

function Card({ children }: { children: React.ReactNode }) {
  return <div className="rounded-xl border border-border bg-card p-5 shadow-xs">{children}</div>;
}

export function SettingsClient({ countries }: { countries: Country[] }) {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [units, setUnits] = useState("metric");
  const [offline, setOffline] = useState(false);
  const [toggles, setToggles] = useState<Toggle[]>([]);
  const [homeCountry, setHomeCountry] = useState("");
  const [passport, setPassport] = useState("");
  const [currency, setCurrency] = useState("");

  const clean = (v: string | undefined) => String(v ?? "").replace(/"/g, "");

  useEffect(() => {
    setMounted(true);
    Promise.all([
      fetch("/api/settings").then((r) => r.json()),
      fetch("/api/toggles").then((r) => r.json()),
    ])
      .then(([settings, tg]: [Record<string, string>, Toggle[]]) => {
        setOffline(truthy(settings.master_offline));
        setUnits(clean(settings.units) || "metric");
        setHomeCountry(clean(settings.home_country));
        setPassport(clean(settings.passport_country));
        setCurrency(clean(settings.home_currency));
        setToggles(tg);
      })
      .finally(() => setLoading(false));
  }, []);

  /** Resolve a typed name-or-code to an ISO2 code, then persist. */
  function saveCountry(key: string, raw: string, setter: (v: string) => void) {
    const match = countries.find(
      (c) => c.code === raw.toUpperCase() || c.name.toLowerCase() === raw.toLowerCase(),
    );
    const value = match?.code ?? raw.toUpperCase();
    setter(value);
    void saveSetting(key, value);
  }

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

  // Save (or clear, with "") a connector's API key. The raw key is never read
  // back — the toggles API returns only has_key — so we just track that boolean.
  async function setKey(apiId: string, key: string) {
    const has_key = key.trim().length > 0;
    setToggles((prev) => prev.map((t) => (t.api_id === apiId ? { ...t, has_key } : t)));
    await fetch("/api/toggles", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_id: apiId, api_key: key }),
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

  const countryName = (code: string) => countries.find((c) => c.code === code)?.name ?? code;

  return (
    <div className="space-y-6">
      {/* Traveler profile — sets sensible defaults across the app */}
      <Card>
        <h2 className="flex items-center gap-2 text-sm font-semibold text-foreground">
          <UserRound className="size-4 text-accent-text" /> Your profile
        </h2>
        <p className="mt-1 max-w-prose text-sm text-muted-foreground">
          Set this once and the tools match you — the visa checker defaults to your passport, the
          currency converter to your home currency. Stored only on this machine.
        </p>
        <div className="mt-4 grid grid-cols-1 gap-4 sm:grid-cols-3">
          <div className="space-y-1.5">
            <Label htmlFor="home-country">Home country</Label>
            <Input
              id="home-country" list="profile-countries"
              defaultValue={homeCountry ? countryName(homeCountry) : ""}
              placeholder="e.g. United States"
              onBlur={(e) => saveCountry("home_country", e.target.value, setHomeCountry)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="passport">Passport</Label>
            <Input
              id="passport" list="profile-countries"
              defaultValue={passport ? countryName(passport) : ""}
              placeholder="e.g. United States"
              onBlur={(e) => saveCountry("passport_country", e.target.value, setPassport)}
            />
          </div>
          <div className="space-y-1.5">
            <Label htmlFor="home-currency">Home currency</Label>
            <Input
              id="home-currency" defaultValue={currency} placeholder="e.g. USD" maxLength={3}
              onBlur={(e) => { const v = e.target.value.toUpperCase(); setCurrency(v); void saveSetting("home_currency", v); }}
            />
          </div>
        </div>
        <datalist id="profile-countries">
          {countries.map((c) => <option key={c.code} value={c.name}>{c.code}</option>)}
        </datalist>
      </Card>

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

        <div className="mt-4 space-y-5">
          {CONNECTION_CATEGORIES.map((cat) => {
            const conns = CONNECTIONS.filter((c) => c.category === cat.id);
            if (conns.length === 0) return null;
            return (
              <div key={cat.id}>
                <p className="label-caps mb-1 text-faint">{cat.label}</p>
                <ul className="divide-y divide-border">
                  {conns.map((conn) => {
                    const t = toggles.find((x) => x.api_id === conn.id);
                    const checked = !offline && (t?.enabled ?? false);
                    return (
                      <li key={conn.id} className="py-3.5">
                        <div className="flex items-center justify-between gap-4">
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
                        </div>
                        {conn.needsKey && (
                          <KeyField conn={conn} hasKey={Boolean(t?.has_key)} onSave={(k) => setKey(conn.id, k)} />
                        )}
                      </li>
                    );
                  })}
                </ul>
              </div>
            );
          })}
        </div>
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

// Masked API-key field for a key-required connector. The key never leaves the
// server once set (we only know has_key), so the input starts empty and we track
// the saved state locally.
function KeyField({ conn, hasKey, onSave }: { conn: ConnectionMeta; hasKey: boolean; onSave: (k: string) => void }) {
  const [value, setValue] = useState("");
  const [saved, setSaved] = useState(hasKey);
  const trimmed = value.trim();
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <input
        type="password"
        value={value}
        onChange={(e) => setValue(e.target.value)}
        placeholder={saved ? "Key saved — paste to replace" : "Paste API key"}
        aria-label={`${conn.label} API key`}
        autoComplete="off"
        className="min-w-0 flex-1 rounded-md border border-border bg-background px-2 py-1.5 text-sm focus:outline-none focus:ring-1 focus:ring-ring"
      />
      <button
        type="button"
        disabled={!trimmed && !saved}
        onClick={() => {
          if (trimmed) { onSave(trimmed); setSaved(true); setValue(""); }
          else if (saved) { onSave(""); setSaved(false); }
        }}
        className="rounded-md border border-border px-2.5 py-1.5 text-xs font-medium transition-colors hover:bg-accent-subtle disabled:opacity-40"
      >
        {trimmed ? "Save" : saved ? "Clear" : "Save"}
      </button>
      {saved && <span className="text-[11px] text-accent-text">Key saved</span>}
      {conn.keyHint && <span className="w-full text-[11px] text-faint">{conn.keyHint}</span>}
    </div>
  );
}
