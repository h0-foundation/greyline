"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRightLeft, PlugZap } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";

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

export function CurrencyConverter() {
  const [amount, setAmount] = useState("100");
  const [from, setFrom] = useState("USD");
  const [to, setTo] = useState("EUR");
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
            <Link href="/settings" className="text-accent-text underline-offset-4 hover:underline">
              Settings
            </Link>{" "}
            to convert with live rates. Everything else still works offline.
          </p>
        </div>
      </div>
    </div>
  );
}
