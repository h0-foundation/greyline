import {
  ShieldQuestion,
  Wifi,
  KeyRound,
  Smartphone,
  Eye,
  Scale,
  Camera,
  Plane,
  Fingerprint,
  ExternalLink,
} from "lucide-react";
import * as intel from "@/lib/intel";
import type { CountryIntel } from "$server/db/repositories/intel";

function Row({
  icon: Icon,
  label,
  value,
  tone,
  note,
}: {
  icon: React.ComponentType<{ className?: string }>;
  label: string;
  value: string;
  tone: intel.Tone;
  note?: string | null;
}) {
  return (
    <div className="flex items-start gap-3 py-2.5">
      <Icon className="mt-0.5 size-4 shrink-0 text-faint" />
      <div className="min-w-0 flex-1">
        <div className="flex items-center justify-between gap-2">
          <span className="text-sm text-muted-foreground">{label}</span>
          <span className={`flex items-center gap-1.5 text-sm font-medium ${intel.TONE_CLASS[tone]}`}>
            <span className={`size-2 rounded-full ${intel.TONE_DOT[tone]}`} aria-hidden />
            {value}
          </span>
        </div>
        {note && <p className="mt-0.5 text-xs text-faint text-pretty">{note}</p>}
      </div>
    </div>
  );
}

/** The curated "what's captured about you here" layer. Renders nothing-but-a-prompt
 *  when no curated row exists yet (coverage is being expanded). */
export function PrivacyPosture({ data }: { data: CountryIntel | undefined }) {
  if (!data) {
    return (
      <section className="rounded-xl border border-dashed border-border bg-accent-subtle/40 p-5">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-accent-subtle-foreground">
          <ShieldQuestion className="size-4" />
          What&apos;s captured about you here
        </h2>
        <p className="mt-2 max-w-prose text-sm text-muted-foreground text-pretty">
          A curated privacy posture for this country isn&apos;t in the offline bundle yet — coverage
          is expanding. The layer covers surveillance posture, border device-search powers, VPN and
          encryption law, SIM registration, and biometric entry, with cited sources.
        </p>
      </section>
    );
  }

  const sources: string[] = (() => {
    try { return JSON.parse(data.source_urls) as string[]; } catch { return []; }
  })();

  const vpn = intel.vpn(data.vpn_legality);
  const dec = intel.decryption(data.decryption_compulsion);
  const sim = intel.sim(data.sim_registration);
  const lgbtq = intel.lgbtq(data.lgbtq_legal_risk);

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-xs">
      <div className="flex items-center justify-between gap-3">
        <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
          <ShieldQuestion className="size-4 text-accent-text" />
          What&apos;s captured about you here
        </h2>
        <span className="font-mono text-[11px] text-faint">
          updated {data.updated_at?.slice(0, 10)}
        </span>
      </div>

      <div className="mt-2 divide-y divide-border">
        <Row icon={Wifi} label="VPN legality" value={vpn.label} tone={vpn.tone} note={data.vpn_note} />
        <Row icon={KeyRound} label="Decryption compulsion" value={dec.label} tone={dec.tone} note={data.decryption_note} />
        <Row icon={Smartphone} label="SIM registration" value={sim.label} tone={sim.tone} note={data.surveillance_note} />
        <Row icon={Eye} label="Surveillance" value={data.gdpr_adequacy ? "GDPR-adequate" : "Limited data-protection"} tone={data.gdpr_adequacy ? "good" : "caution"} note={data.surveillance_note} />
        <Row icon={Scale} label="LGBTQ+ legal risk" value={lgbtq.label} tone={lgbtq.tone} />
        {data.photography_note && (
          <Row icon={Camera} label="Photography" value="See note" tone="neutral" note={data.photography_note} />
        )}
        {data.apis_pnr_note && (
          <Row icon={Plane} label="Flight data (API/PNR)" value="Collected" tone="caution" note={data.apis_pnr_note} />
        )}
        {data.biometric_entry_note && (
          <Row icon={Fingerprint} label="Biometric entry" value="See note" tone="caution" note={data.biometric_entry_note} />
        )}
      </div>

      {sources.length > 0 && (
        <div className="mt-3 flex flex-wrap items-center gap-x-3 gap-y-1 border-t border-border pt-3">
          <span className="text-xs text-faint">Sources:</span>
          {sources.map((url, i) => (
            <a
              key={url}
              href={url}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1 text-xs text-accent-text hover:underline"
            >
              {new URL(url).hostname.replace(/^www\./, "")}
              <ExternalLink className="size-3" />
            </a>
          ))}
        </div>
      )}
      <p className="mt-3 text-[11px] text-faint">
        Informational only — not legal advice. Verify current law before relying on it.
      </p>
    </section>
  );
}
