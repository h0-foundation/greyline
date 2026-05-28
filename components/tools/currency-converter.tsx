"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, PlugZap, AlertTriangle } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Badge } from "@/components/ui/badge";
import {
  channelCosts,
  perDiem,
  denominations,
  exceedsDeclarationThreshold,
  CASH_DECLARATION_THRESHOLD,
  type PerDiemTier,
} from "@/lib/currency";
import denominationData from "@/data/denominations.json";

const DENOMINATIONS: Record<string, number[]> = denominationData;

const TIERS: ReadonlyArray<{ id: PerDiemTier; label: string }> = [
  { id: "budget", label: "Budget" },
  { id: "standard", label: "Standard" },
  { id: "comfort", label: "Comfort" },
];

function fmt(n: number, max = 2): string {
  return n.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: max,
  });
}

const COMMON = [
  "USD", "EUR", "GBP", "JPY", "CHF", "CNY", "INR", "AUD",
  "CAD", "SGD", "AED", "BRL", "MXN", "THB", "TRY", "ZAR",
];

type CurrencyResponse =
  | { ok: true; base: string; rates: Record<string, number> }
  | { ok: false; disabled?: boolean; error: string };

function normalizeCode(value: string): string {
  return value.toUpperCase().replace(/[^A-Z]/g, "").slice(0, 3);
}

export function CurrencyConverter({ homeCurrency }: { homeCurrency?: string }) {
  const home = (homeCurrency || "USD").toUpperCase();
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState(home);
  const [to, setTo] = useState(home === "EUR" ? "USD" : "EUR");
  const [loading, setLoading] = useState(true);
  const [disabled, setDisabled] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [rates, setRates] = useState<Record<string, number>>({});

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setError(null);
    fetch(`/api/currency?base=${encodeURIComponent(from)}`)
      .then((r) => r.json() as Promise<CurrencyResponse>)
      .then((data) => {
        if (cancelled) return;
        if (data.ok) {
          setRates(data.rates ?? {});
          setDisabled(false);
        } else {
          setRates({});
          setDisabled(Boolean(data.disabled));
          setError(data.error);
        }
      })
      .catch(() => {
        if (cancelled) return;
        setError("Could not reach the currency service.");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [from]);

  function swap() {
    setFrom(to);
    setTo(from);
  }

  if (loading) {
    return (
      <div className="space-y-4">
        <Skeleton className="h-44 w-full rounded-xl" />
        <Skeleton className="h-20 w-full rounded-xl" />
      </div>
    );
  }

  if (disabled) {
    return <DisabledNotice />;
  }

  const numericAmount = Number.parseFloat(amount);
  const rate = to === from ? 1 : rates[to.toLowerCase()];
  const hasRate = typeof rate === "number" && Number.isFinite(rate);
  const result =
    hasRate && Number.isFinite(numericAmount) ? numericAmount * rate : null;

  return (
    <div className="space-y-4">
      <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <div className="grid gap-4 sm:grid-cols-[1fr_auto_1fr] sm:items-end">
          <div className="space-y-1.5">
            <label htmlFor="amount" className="text-sm text-muted-foreground">
              Amount
            </label>
            <Input
              id="amount"
              inputMode="decimal"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="font-mono tabular-nums"
            />
            <CodeField id="from" label="From" value={from} onChange={setFrom} />
          </div>

          <div className="flex justify-center pb-1 sm:pb-0">
            <Button
              type="button"
              variant="outline"
              size="icon"
              onClick={swap}
              aria-label="Swap currencies"
            >
              <ArrowRightLeft className="size-4" />
            </Button>
          </div>

          <div className="space-y-1.5">
            <span className="text-sm text-muted-foreground">Converted</span>
            <div className="flex h-9 items-center">
              <span className="font-mono text-3xl font-semibold tabular-nums text-foreground">
                {result === null
                  ? "—"
                  : result.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2,
                    })}
              </span>
            </div>
            <CodeField id="to" label="To" value={to} onChange={setTo} />
          </div>
        </div>

        {result !== null && (
          <p className="mt-4 font-mono text-xs text-faint tabular-nums">
            1 {from} = {rate.toLocaleString(undefined, { maximumFractionDigits: 6 })} {to}
          </p>
        )}
        {!hasRate && (
          <p className="mt-4 text-xs text-muted-foreground">
            No rate available for {to} against {from}.
          </p>
        )}
        {error && (
          <p className="mt-2 text-xs text-muted-foreground">{error}</p>
        )}
      </div>

      {hasRate && rate > 0 && (
        <TravelMoneyCards home={from} dest={to} midRate={rate} />
      )}
    </div>
  );
}

function TravelMoneyCards({
  home,
  dest,
  midRate,
}: {
  home: string;
  dest: string;
  midRate: number;
}) {
  const [days, setDays] = useState("7");
  const [tier, setTier] = useState<PerDiemTier>("standard");
  const [cash, setCash] = useState("500");

  const channels = channelCosts(midRate);

  const numDays = Number.parseInt(days, 10);
  const budget = perDiem(Number.isFinite(numDays) ? numDays : 0, tier);

  const cashAmount = Number.parseFloat(cash);
  const safeCash = Number.isFinite(cashAmount) && cashAmount > 0 ? cashAmount : 0;
  const notes = DENOMINATIONS[dest] ?? [];
  const breakdown = denominations(safeCash, dest, notes);
  const remainder =
    notes.length > 0
      ? Math.floor(safeCash) -
        breakdown.reduce((s, r) => s + r.note * r.count, 0)
      : Math.floor(safeCash);
  const mustDeclare = exceedsDeclarationThreshold(safeCash, midRate);

  return (
    <div className="grid gap-4 lg:grid-cols-2">
      {/* (a) Exchange-channel markup estimator */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h3 className="text-sm font-medium text-foreground">
          Where you exchange matters
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Effective {home} -&gt; {dest} rate by channel, against the mid-market
          rate of {fmt(midRate, 6)}. Spreads use published industry midpoints.
        </p>
        <div className="mt-4 overflow-hidden rounded-lg border border-border">
          <table className="w-full text-sm">
            <thead className="bg-accent-subtle text-xs text-accent-text">
              <tr>
                <th className="px-3 py-2 text-left font-medium">Channel</th>
                <th className="px-3 py-2 text-right font-medium">Rate</th>
                <th className="px-3 py-2 text-right font-medium">
                  Loss / 100 {home}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border">
              {channels.map((c) => (
                <tr key={c.name}>
                  <td className="px-3 py-2 text-foreground">
                    {c.name}
                    <span className="ml-1 text-faint">
                      ({fmt(c.spreadPct * 100, 1)}%)
                    </span>
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-foreground">
                    {fmt(c.effectiveRate, 4)}
                  </td>
                  <td className="px-3 py-2 text-right font-mono tabular-nums text-spark">
                    {fmt(c.lossPer100, 2)} {home}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      {/* (b) Per-diem budgeter */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
        <h3 className="text-sm font-medium text-foreground">Trip budget</h3>
        <p className="mt-1 text-xs text-muted-foreground">
          Daily defaults in {home}, based on US State Dept per-diem tiers.
        </p>
        <div className="mt-4 grid gap-3 sm:grid-cols-[7rem_1fr] sm:items-end">
          <div className="space-y-1.5">
            <label htmlFor="days" className="block text-xs text-faint">
              Days
            </label>
            <Input
              id="days"
              inputMode="numeric"
              value={days}
              onChange={(e) => setDays(e.target.value)}
              className="font-mono tabular-nums"
            />
          </div>
          <div className="flex gap-1.5">
            {TIERS.map((t) => (
              <Button
                key={t.id}
                type="button"
                size="sm"
                variant={tier === t.id ? "default" : "outline"}
                onClick={() => setTier(t.id)}
                className="flex-1"
              >
                {t.label}
              </Button>
            ))}
          </div>
        </div>

        <dl className="mt-4 space-y-1.5 text-sm">
          {(
            [
              ["Lodging", budget.daily.lodging],
              ["Meals (M&IE)", budget.daily.meals],
              ["Local transport", budget.daily.transport],
              ["Buffer", budget.daily.buffer],
            ] as const
          ).map(([label, value]) => (
            <div key={label} className="flex justify-between">
              <dt className="text-muted-foreground">{label} / day</dt>
              <dd className="font-mono tabular-nums text-foreground">
                {fmt(value)} {home}
              </dd>
            </div>
          ))}
        </dl>

        <div className="mt-4 border-t border-border pt-3">
          <div className="flex items-baseline justify-between">
            <span className="text-sm text-muted-foreground">
              Total ({budget.total > 0 ? `${fmt(budget.daily.total)} ${home}/day x ${Math.floor(numDays > 0 ? numDays : 0)}` : "set days"})
            </span>
            <span className="font-mono text-lg font-semibold tabular-nums text-foreground">
              {fmt(budget.total)} {home}
            </span>
          </div>
          {budget.total > 0 && (
            <p className="mt-1 text-right font-mono text-xs text-faint tabular-nums">
              ~ {fmt(budget.total * midRate)} {dest}
            </p>
          )}
        </div>
      </section>

      {/* (c) Denomination breakdown + declaration warning */}
      <section className="rounded-xl border border-border bg-card p-5 shadow-xs lg:col-span-2">
        <h3 className="text-sm font-medium text-foreground">
          Cash denominations ({dest})
        </h3>
        <p className="mt-1 text-xs text-muted-foreground">
          How a cash amount breaks down into {dest} banknotes.
        </p>

        <div className="mt-4 max-w-xs space-y-1.5">
          <label htmlFor="cash" className="block text-xs text-faint">
            Cash target ({dest})
          </label>
          <Input
            id="cash"
            inputMode="decimal"
            value={cash}
            onChange={(e) => setCash(e.target.value)}
            className="font-mono tabular-nums"
          />
        </div>

        {notes.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            No banknote data for {dest}.
          </p>
        ) : breakdown.length === 0 ? (
          <p className="mt-4 text-sm text-muted-foreground">
            Enter an amount of at least {fmt(Math.min(...notes))} {dest}.
          </p>
        ) : (
          <div className="mt-4 flex flex-wrap gap-2">
            {breakdown.map((row) => (
              <Badge key={row.note} variant="outline" className="font-mono tabular-nums">
                {row.count} x {fmt(row.note)}
              </Badge>
            ))}
            {remainder > 0 && (
              <Badge variant="secondary" className="font-mono tabular-nums">
                +{fmt(remainder)} {dest} in coins
              </Badge>
            )}
          </div>
        )}

        {mustDeclare && (
          <div className="mt-4 flex items-start gap-2.5 rounded-lg border border-destructive/40 bg-destructive/10 p-3">
            <AlertTriangle className="mt-0.5 size-4 shrink-0 text-destructive" />
            <p className="text-sm text-destructive">
              This exceeds the ~{CASH_DECLARATION_THRESHOLD.toLocaleString()}{" "}
              {home}-equivalent threshold (about{" "}
              {fmt(CASH_DECLARATION_THRESHOLD * midRate)} {dest}). Most countries
              require declaring cash at or above this when entering or leaving.
            </p>
          </div>
        )}
      </section>
    </div>
  );
}

function CodeField({
  id,
  label,
  value,
  onChange,
}: {
  id: string;
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <div className="space-y-1.5">
      <label htmlFor={id} className="block text-xs text-faint">
        {label}
      </label>
      <Input
        id={id}
        list="currency-codes"
        value={value}
        onChange={(e) => onChange(normalizeCode(e.target.value))}
        placeholder="USD"
        maxLength={3}
        className="font-mono uppercase tabular-nums"
      />
      <datalist id="currency-codes">
        {COMMON.map((c) => (
          <option key={c} value={c} />
        ))}
      </datalist>
    </div>
  );
}

function DisabledNotice() {
  return (
    <div className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-start gap-3">
        <span className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-accent-subtle text-accent-text">
          <PlugZap className="size-5" />
        </span>
        <div className="space-y-1">
          <p className="text-sm font-medium text-foreground">
            Currency connection is off.
          </p>
          <p className="max-w-prose text-sm text-muted-foreground">
            Enable it in{" "}
            <Link href="/settings" className="text-accent-text underline underline-offset-4">
              Settings
            </Link>{" "}
            to convert with live rates. Everything else still works offline.
          </p>
        </div>
      </div>
    </div>
  );
}
