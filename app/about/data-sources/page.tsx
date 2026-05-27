import { Database, ExternalLink } from "lucide-react";
import { PageHeader } from "@/components/page-header";
import { Badge } from "@/components/ui/badge";
import { getDataSources } from "$server/db/repositories/intel";

export const dynamic = "force-dynamic";

export default function DataSourcesPage() {
  const sources = getDataSources();

  return (
    <div className="space-y-6">
      <PageHeader
        title="Data sources"
        description="Every dataset bundled into Greyline, with its license. All processed offline at build time — nothing is fetched while you use the app."
      />

      {sources.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          No datasets imported yet. Run <code className="font-mono text-xs">pnpm build:data</code>.
        </p>
      ) : (
        <ul className="divide-y divide-border rounded-xl border border-border bg-card">
          {sources.map((s) => (
            <li key={s.id} className="flex items-center justify-between gap-4 p-4">
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  <Database className="size-4 text-faint" />
                  <span className="font-medium text-foreground">{s.name}</span>
                  <Badge variant="outline" className="font-mono text-[11px]">{s.license}</Badge>
                </div>
                <p className="mt-0.5 font-mono text-xs text-faint">
                  {s.category} · {s.row_count.toLocaleString("en")} rows · updated {s.downloaded_at?.slice(0, 10)}
                </p>
              </div>
              {s.url && (
                <a
                  href={s.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-1 text-sm text-accent-text hover:underline"
                >
                  Source <ExternalLink className="size-3.5" />
                </a>
              )}
            </li>
          ))}
        </ul>
      )}

      <p className="max-w-prose text-xs text-faint text-pretty">
        Map data © OpenStreetMap contributors (ODbL). Country metadata via REST Countries. Curated
        privacy-posture and arrival data are compiled by Greyline from cited primary and secondary
        sources and are informational only — not legal advice.
      </p>
    </div>
  );
}
