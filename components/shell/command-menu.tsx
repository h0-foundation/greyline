"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import {
  Monitor, Moon, Sun, Plus, FileDown, Lock, Eye, Database, HardDriveDownload, Compass,
} from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { allNav } from "@/lib/nav";
import { allTools } from "@/lib/tools";

const ACTIONS = [
  { label: "New trip", hint: "start planning", href: "/trips", icon: Plus },
  { label: "Log a sighting", hint: "counter-surveillance", href: "/surveillance", icon: Eye },
  { label: "Export disclosure report", hint: "7-year SF-86-style", href: "/disclosure", icon: FileDown },
  { label: "Open the vault", hint: "encrypted documents", href: "/vault", icon: Lock },
  { label: "Back up / export your data", hint: "local JSON", href: "/settings/data", icon: HardDriveDownload },
  { label: "Data sources & licenses", hint: "what's bundled", href: "/about/data-sources", icon: Database },
] as const;

type Trip = { id: string; name: string; status?: string };

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();
  const [trips, setTrips] = useState<Trip[]>([]);

  // Load trips once each time the palette opens, so search can jump straight to
  // a trip by name. cmdk's built-in filter scores each item's `value`; every
  // trip gets a STABLE, UNIQUE value (name + id) so duplicate names can't desync
  // cmdk's internal selection from the DOM (the bug a prior attempt hit).
  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    fetch("/api/trips")
      .then((r) => r.json())
      .then((data) => { if (!cancelled && Array.isArray(data)) setTrips(data as Trip[]); })
      .catch(() => { /* offline / no trips — the palette still works for pages */ });
    return () => { cancelled = true; };
  }, [open]);

  const run = (fn: () => void) => {
    onOpenChange(false);
    fn();
  };

  return (
    <CommandDialog
      open={open}
      onOpenChange={onOpenChange}
      title="Command menu"
      description="Search and jump to anywhere in Greyline"
    >
      <CommandInput placeholder="Search pages, tools, trips, actions…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Go to">
          {allNav.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.label} ${item.description}`}
              onSelect={() => run(() => router.push(item.href))}
            >
              <item.icon />
              <span>{item.label}</span>
              <span className="ml-2 truncate text-xs text-faint">{item.description}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Actions">
          {ACTIONS.map((a) => (
            <CommandItem key={a.label} value={`${a.label} ${a.hint}`} onSelect={() => run(() => router.push(a.href))}>
              <a.icon />
              <span>{a.label}</span>
              <span className="ml-2 truncate text-xs text-faint">{a.hint}</span>
            </CommandItem>
          ))}
        </CommandGroup>
        {trips.length > 0 && (
          <CommandGroup heading="Trips">
            {trips.map((t) => (
              <CommandItem
                key={t.id}
                value={`${t.name}__${t.id}`}
                onSelect={() => run(() => router.push(`/trips/${t.id}`))}
              >
                <Compass />
                <span>{t.name}</span>
                {t.status && <span className="ml-2 truncate text-xs text-faint">{t.status}</span>}
              </CommandItem>
            ))}
          </CommandGroup>
        )}
        <CommandGroup heading="Tools">
          {allTools.map((t) => (
            <CommandItem
              key={t.href}
              value={`${t.label} ${t.description}`}
              onSelect={() => run(() => router.push(t.href))}
            >
              <t.icon />
              <span>{t.label}</span>
              {t.offline && <span className="ml-2 text-xs text-faint">offline</span>}
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Appearance">
          <CommandItem value="theme light" onSelect={() => run(() => setTheme("light"))}>
            <Sun />
            Light theme
          </CommandItem>
          <CommandItem value="theme dark" onSelect={() => run(() => setTheme("dark"))}>
            <Moon />
            Dark theme
          </CommandItem>
          <CommandItem value="theme system" onSelect={() => run(() => setTheme("system"))}>
            <Monitor />
            System theme
          </CommandItem>
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
