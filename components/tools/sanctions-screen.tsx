"use client";

import { useEffect, useRef, useState } from "react";
import { Search, ShieldAlert, CircleCheck, Info, Loader2 } from "lucide-react";
import { Badge } from "@/components/ui/badge";

type Entry = {
  list: string;
  ent_num: number;
  name: string;
  sdn_type: string | null;
  program: string | null;
  remarks: string | null;
  aliases: string[];
  matched_via: "name" | "alias";
};
type Result = { ok: boolean; query: string; count: number; results: Entry[] };

export function SanctionsScreen() {
  const [query, setQuery] = useState("");
  const [data, setData] = useState<Result | null>(null);
  const [loading, setLoading] = useState(false);
  const [total, setTotal] = useState<number | null>(null);
  const seq = useRef(0);

  // Load the list size once so the empty state can say what's being screened.
  useEffect(() => {
    fetch("/api/sanctions")
      .then((r) => r.json())
      .then((d: Result) => setTotal(d.count))
      .catch(() => {});
  }, []);

  // Debounced screening — substring match server-side over the bundled lists.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) { setData(null); setLoading(false); return; }
    setLoading(true);
    const id = ++seq.current;
    const t = setTimeout(() => {
      fetch(`/api/sanctions?q=${encodeURIComponent(q)}`)
        .then((r) => r.json())
        .then((d: Result) => { if (id === seq.current) { setData(d); setLoading(false); } })
        .catch(() => { if (id === seq.current) setLoading(false); });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  const hasQuery = query.trim().length >= 2;

  return (
    <div className="space-y-5">
      <div className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-faint" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Name of a person, company, or vessel…"
          aria-label="Name to screen against OFAC sanctions lists"
          autoFocus
          className="w-full rounded-xl border border-border bg-card py-3 pl-10 pr-4 text-base shadow-xs focus:outline-none focus:ring-1 focus:ring-ring"
        />
        {loading && <Loader2 className="absolute right-3 top-1/2 size-4 -translate-y-1/2 animate-spin text-faint" />}
      </div>

      {total !== null && !hasQuery && (
        <p className="text-sm text-muted-foreground">
          Screening against <span className="tabular-nums text-foreground">{total.toLocaleString()}</span> listed entities (OFAC SDN + Consolidated). Type at least two characters.
        </p>
      )}

      {hasQuery && data && (
        <div className="space-y-4">
          {data.results.length === 0 ? (
            <div className="flex items-start gap-3 rounded-xl border border-border bg-card p-5 shadow-xs">
              <CircleCheck className="mt-0.5 size-5 shrink-0 text-success" />
              <div>
                <p className="font-medium text-foreground">No match for &ldquo;{data.query}&rdquo;</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  This name does not appear on the bundled OFAC SDN or Consolidated lists. A clean result is not a compliance determination — official screening uses fuzzy matching and additional lists.
                </p>
              </div>
            </div>
          ) : (
            <>
              <p className="text-sm text-muted-foreground">
                <span className="tabular-nums text-warning">{data.results.length}</span> possible {data.results.length === 1 ? "match" : "matches"} for &ldquo;{data.query}&rdquo; — review carefully; a name match is not a confirmed identity.
              </p>
              <ul className="space-y-3">
                {data.results.map((e) => (
                  <li key={`${e.list}-${e.ent_num}`} className="rounded-xl border border-border bg-card p-5 shadow-xs">
                    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-2">
                      <div className="flex items-start gap-2.5">
                        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-destructive" />
                        <div>
                          <p className="font-display text-lg font-semibold leading-tight text-foreground">{e.name}</p>
                          <p className="mt-0.5 text-xs text-faint">
                            {e.sdn_type || "Entity"}
                            {e.matched_via === "alias" && <span className="text-warning"> · matched via alias</span>}
                          </p>
                        </div>
                      </div>
                      <div className="flex flex-wrap gap-1.5">
                        <Badge variant={e.list === "SDN" ? "destructive" : "secondary"}>{e.list}</Badge>
                        {e.program && <Badge variant="outline">{e.program}</Badge>}
                      </div>
                    </div>

                    {e.aliases.length > 0 && (
                      <p className="mt-3 text-sm text-muted-foreground">
                        <span className="text-faint">Also known as: </span>
                        {e.aliases.slice(0, 12).join(" · ")}
                        {e.aliases.length > 12 && <span className="text-faint"> +{e.aliases.length - 12} more</span>}
                      </p>
                    )}
                    {e.remarks && <p className="mt-2 text-sm leading-relaxed text-muted-foreground">{e.remarks}</p>}
                  </li>
                ))}
              </ul>
            </>
          )}
        </div>
      )}

      <div className="flex items-start gap-2.5 rounded-xl border border-border bg-muted/30 p-4 text-xs text-muted-foreground">
        <Info className="mt-0.5 size-4 shrink-0 text-faint" />
        <p>
          Bundled snapshot of the OFAC SDN and Consolidated Sanctions lists (public-domain US Treasury data). It is a screening aid, not legal advice or an official OFAC determination, and may lag the live lists. For compliance decisions, screen against the current lists at{" "}
          <a href="https://sanctionssearch.ofac.treas.gov" target="_blank" rel="noopener noreferrer" className="underline">sanctionssearch.ofac.treas.gov</a> and consult counsel.
        </p>
      </div>
    </div>
  );
}
