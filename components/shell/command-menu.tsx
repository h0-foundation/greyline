"use client";

import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { Monitor, Moon, Sun } from "lucide-react";
import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { allNav } from "@/lib/nav";

export function CommandMenu({
  open,
  onOpenChange,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}) {
  const router = useRouter();
  const { setTheme } = useTheme();

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
      <CommandInput placeholder="Search or jump to…" />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        <CommandGroup heading="Navigate">
          {allNav.map((item) => (
            <CommandItem
              key={item.href}
              value={`${item.label} ${item.description}`}
              onSelect={() => run(() => router.push(item.href))}
            >
              <item.icon />
              <span>{item.label}</span>
              <span className="ml-2 truncate text-xs text-faint">
                {item.description}
              </span>
            </CommandItem>
          ))}
        </CommandGroup>
        <CommandGroup heading="Tools">
          {[
            ["Airports", "/tools/airports"],
            ["Visa checker", "/tools/visa"],
            ["EXIF stripper", "/tools/exif"],
            ["Currency", "/tools/currency"],
            ["Weather", "/tools/weather"],
            ["Advisories", "/tools/advisories"],
            ["Self-doxxing audit", "/tools/self-doxxing"],
            ["Data sources", "/about/data-sources"],
            ["Your data (backup)", "/settings/data"],
          ].map(([label, href]) => (
            <CommandItem key={href} value={label} onSelect={() => run(() => router.push(href))}>
              <span>{label}</span>
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
