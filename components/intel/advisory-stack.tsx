// Multi-source advisory stack — one card per source, colour-keyed 1..4 and
// linked back to the primary government source.
import Link from "next/link";
import { ShieldAlert, ExternalLink } from "lucide-react";
import type { AdvisoryRow } from "$server/db/repositories/dossier";

const LEVEL_TONE: Record<number, { bg: string; ring: string; text: string; label: string }> = {
  1: { bg: "bg-success/8",        ring: "ring-success/30",       text: "text-success",       label: "Level 1" },
  2: { bg: "bg-warning/10",       ring: "ring-warning/30",       text: "text-warning",       label: "Level 2" },
  3: { bg: "bg-accent-text/12",   ring: "ring-accent-text/35",   text: "text-accent-text",   label: "Level 3" },
  4: { bg: "bg-destructive/12",   ring: "ring-destructive/40",   text: "text-destructive",   label: "Level 4" },
};

const SOURCE_LABEL: Record<string, string> = {
  us_state: "US State Department",
  uk_fcdo:  "UK Foreign Office",
  au_dfat:  "Australia Smartraveller",
  ca_gac:   "Canada Global Affairs",
};

function relativeUpdated(iso: string): string {
  const t = Date.parse(iso);
  if (!t) return iso;
  const days = Math.floor((Date.now() - t) / 86400000);
  if (days <= 0) return "today";
  if (days === 1) return "yesterday";
  if (days < 30) return `${days}d ago`;
  if (days < 365) return `${Math.floor(days / 30)}mo ago`;
  return `${Math.floor(days / 365)}y ago`;
}

export function AdvisoryStack({ advisories }: { advisories: AdvisoryRow[] }) {
  if (advisories.length === 0) {
    return (
      <p className="text-sm text-muted-foreground">
        No advisories on file. Run <span className="font-mono text-xs">pnpm build:advisories</span> to fetch.
      </p>
    );
  }
  // Render highest-level first for visual hierarchy.
  const ordered = [...advisories].sort((a, b) => b.level - a.level);
  return (
    <ul className="space-y-2.5">
      {ordered.map((a) => {
        const tone = LEVEL_TONE[a.level] ?? LEVEL_TONE[1];
        return (
          <li
            key={`${a.iso2}-${a.source}`}
            className={`rounded-lg ring-1 ${tone.ring} ${tone.bg} p-3.5`}
          >
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0 flex-1">
                <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide">
                  <ShieldAlert className={`size-3.5 ${tone.text}`} />
                  <span className={tone.text}>{tone.label}</span>
                  <span aria-hidden className="text-faint/60">·</span>
                  <span className="text-foreground">{SOURCE_LABEL[a.source] ?? a.source}</span>
                </p>
                <p className={`mt-1 text-sm font-medium ${tone.text}`}>{a.level_label}</p>
                {a.summary && (
                  <p className="mt-1.5 text-sm text-muted-foreground line-clamp-4 text-pretty">
                    {a.summary}
                  </p>
                )}
                <p className="mt-2 font-mono text-[11px] text-muted-foreground">
                  Updated {relativeUpdated(a.updated)}
                </p>
              </div>
              {a.url && (
                <Link
                  href={a.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="shrink-0 inline-flex items-center gap-1 text-xs text-accent-text hover:underline"
                  aria-label={`Read full ${SOURCE_LABEL[a.source] ?? a.source} advisory in a new tab`}
                >
                  Open <ExternalLink className="size-3" />
                </Link>
              )}
            </div>
          </li>
        );
      })}
    </ul>
  );
}
