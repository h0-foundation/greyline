"use client";

import { useEffect, useState } from "react";
import {
  Search,
  Users,
  Database,
  UserSearch,
  Camera,
  CalendarClock,
  ExternalLink,
  RotateCcw,
} from "lucide-react";
import { Checkbox } from "@/components/ui/checkbox";

const STORAGE_KEY = "greyline:checklist:self-doxxing";

type LinkRef = { label: string; href: string };
type Item = { id: string; label: string; note?: string; links?: LinkRef[] };
type Section = {
  id: string;
  title: string;
  icon: React.ComponentType<{ className?: string }>;
  blurb: string;
  items: Item[];
};

const SECTIONS: Section[] = [
  {
    id: "search",
    title: "Search yourself",
    icon: Search,
    blurb:
      "Query the same way an attacker would. Use more than one engine — results differ, and stale data lingers.",
    items: [
      { id: "search-name", label: "Search your full name across multiple engines (Google, Bing, DuckDuckGo, Brave)." },
      { id: "search-name-city", label: "Search name + city, name + employer, and name + school." },
      { id: "search-phone", label: "Search each phone number you've used publicly." },
      { id: "search-email", label: "Search each email address, including old/forgotten ones." },
      { id: "search-usernames", label: "Search every handle/username you reuse across platforms." },
      { id: "search-reverse-image", label: "Reverse-image-search your profile and avatar photos to find where they've been reposted." },
      { id: "search-quotes", label: 'Search exact phrases in quotes (bios, taglines) to surface linked accounts.' },
    ],
  },
  {
    id: "social",
    title: "Social media",
    icon: Users,
    blurb:
      "View each account while logged out — that's what strangers see. Then tighten and prune.",
    items: [
      { id: "social-loggedout", label: "Audit every account logged-out (or in a private window) to see the public view." },
      { id: "social-privacy", label: "Lock down privacy settings; restrict who can see posts, friends/followers, and tagged photos." },
      { id: "social-location", label: "Disable location tags and remove geotags/EXIF from existing posts." },
      { id: "social-prune", label: "Prune or archive old posts that reveal routines, home, workplace, or travel patterns." },
      { id: "social-connections", label: "Hide friend/follower lists and contact info; review third-party app connections." },
      { id: "social-faces", label: "Untag yourself from others' posts that expose your location or relationships." },
    ],
  },
  {
    id: "brokers",
    title: "Data brokers",
    icon: Database,
    blurb:
      "Brokers aggregate public records, purchases, and online activity into sellable profiles. Opt-outs are tedious but effective; expect to re-do them periodically.",
    items: [
      {
        id: "brokers-accessnow",
        label: "Work through Access Now's Self-Doxing guide for a structured opt-out workflow.",
        links: [{ label: "Access Now — Self-Doxing guide", href: "https://guides.accessnow.org/self-doxing.html" }],
      },
      {
        id: "brokers-badbroker",
        label: "Use the Big Ass Data Broker Opt-Out List to find and remove your records broker-by-broker.",
        links: [{ label: "Yael Grauer — Big Ass Data Broker Opt-Out List", href: "https://github.com/yaelwrites/Big-Ass-Data-Broker-Opt-Out-List" }],
      },
      {
        id: "brokers-google",
        label: 'Use Google "Results about you" to monitor and request removal of search results exposing your contact info.',
        links: [{ label: 'Google — Results about you', href: "https://myactivity.google.com/results-about-you" }],
      },
      {
        id: "brokers-paid",
        label:
          "Consider a paid removal service if manual opt-outs are too much: DeleteMe, Optery, or EasyOptOuts handle filings and re-checks for you.",
      },
    ],
  },
  {
    id: "people-search",
    title: "People-search removal",
    icon: UserSearch,
    blurb:
      "People-search sites publish addresses, relatives, and phone numbers. Each has its own opt-out page — submit one per site.",
    items: [
      { id: "ps-whitepages", label: "Whitepages — submit the opt-out (each site has its own form)." },
      { id: "ps-spokeo", label: "Spokeo — locate your listing, then file the opt-out." },
      { id: "ps-beenverified", label: "BeenVerified — use its opt-out / suppression request." },
      { id: "ps-radaris", label: "Radaris — claim/remove your profile via its opt-out." },
      { id: "ps-recheck", label: "Re-check these sites months later — listings frequently reappear." },
    ],
  },
  {
    id: "photos",
    title: "Photos & metadata",
    icon: Camera,
    blurb:
      "Photos carry GPS coordinates, device IDs, and timestamps. Strip them before anything goes public.",
    items: [
      {
        id: "photos-exif",
        label: "Strip EXIF/GPS metadata from images before posting or sharing.",
        links: [{ label: "Greyline EXIF stripper", href: "/tools/exif" }],
      },
      { id: "photos-backgrounds", label: "Check photo backgrounds for addresses, plates, badges, screens, and reflections." },
    ],
  },
  {
    id: "recurring",
    title: "Recurring",
    icon: CalendarClock,
    blurb: "Exposure regrows. Treat this as maintenance, not a one-time cleanup.",
    items: [
      { id: "recurring-reminder", label: "Set a calendar reminder to re-run this audit every 3–12 months." },
      { id: "recurring-alerts", label: "Set up search alerts on your name and key identifiers to catch new exposure early." },
    ],
  },
];

const ALL_IDS = SECTIONS.flatMap((s) => s.items.map((i) => i.id));

function loadState(): Record<string, boolean> {
  if (typeof window === "undefined") return {};
  try {
    const raw = window.localStorage.getItem(STORAGE_KEY);
    if (!raw) return {};
    const parsed = JSON.parse(raw) as unknown;
    if (typeof parsed !== "object" || parsed === null) return {};
    const out: Record<string, boolean> = {};
    for (const [k, v] of Object.entries(parsed as Record<string, unknown>)) {
      if (typeof v === "boolean") out[k] = v;
    }
    return out;
  } catch {
    return {};
  }
}

function LinkRow({ link }: { link: LinkRef }) {
  const external = /^https?:\/\//.test(link.href);
  return (
    <a
      href={link.href}
      {...(external ? { target: "_blank", rel: "noopener noreferrer" } : {})}
      className="inline-flex items-center gap-1 text-xs text-accent-text hover:underline"
    >
      {link.label}
      <ExternalLink className="size-3" />
    </a>
  );
}

export function SelfDoxxingChecklist() {
  const [checked, setChecked] = useState<Record<string, boolean>>({});
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    setChecked(loadState());
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated || typeof window === "undefined") return;
    try {
      window.localStorage.setItem(STORAGE_KEY, JSON.stringify(checked));
    } catch {
      /* storage unavailable — non-fatal */
    }
  }, [checked, hydrated]);

  const doneCount = ALL_IDS.filter((id) => checked[id]).length;

  function toggle(id: string, value: boolean) {
    setChecked((prev) => ({ ...prev, [id]: value }));
  }

  function reset() {
    setChecked({});
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between gap-3 rounded-xl border border-border bg-card px-4 py-3 shadow-xs">
        <span className="font-mono text-xs text-muted-foreground">
          {doneCount} / {ALL_IDS.length} done
        </span>
        <button
          type="button"
          onClick={reset}
          className="inline-flex items-center gap-1.5 rounded-md px-2 py-1 text-xs text-faint transition-colors hover:text-foreground"
        >
          <RotateCcw className="size-3.5" />
          Reset
        </button>
      </div>

      {SECTIONS.map((section) => (
        <section
          key={section.id}
          className="rounded-xl border border-border bg-card p-5 shadow-xs"
        >
          <h2 className="flex items-center gap-2 font-display text-sm font-semibold text-foreground">
            <section.icon className="size-4 text-accent-text" />
            {section.title}
          </h2>
          <p className="mt-1 max-w-prose text-sm text-muted-foreground text-pretty">
            {section.blurb}
          </p>
          <ul className="mt-3 divide-y divide-border">
            {section.items.map((item) => (
              <li key={item.id} className="flex items-start gap-3 py-2.5">
                <Checkbox
                  id={item.id}
                  checked={!!checked[item.id]}
                  onCheckedChange={(v) => toggle(item.id, v === true)}
                  className="mt-0.5"
                />
                <div className="min-w-0 flex-1">
                  <label
                    htmlFor={item.id}
                    className={`block cursor-pointer text-sm text-pretty ${
                      checked[item.id]
                        ? "text-faint line-through"
                        : "text-foreground"
                    }`}
                  >
                    {item.label}
                  </label>
                  {item.note && (
                    <p className="mt-0.5 text-xs text-faint text-pretty">{item.note}</p>
                  )}
                  {item.links && item.links.length > 0 && (
                    <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1">
                      {item.links.map((link) => (
                        <LinkRow key={link.href} link={link} />
                      ))}
                    </div>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
