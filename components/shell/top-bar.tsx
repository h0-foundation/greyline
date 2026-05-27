"use client";

import { usePathname } from "next/navigation";
import { Menu, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { ThemeToggle } from "@/components/theme-toggle";
import { allNav, isActive } from "@/lib/nav";

export function TopBar({
  onOpenMobileNav,
  onOpenCommand,
}: {
  onOpenMobileNav: () => void;
  onOpenCommand: () => void;
}) {
  const pathname = usePathname();
  const current = allNav.find((item) => isActive(pathname, item.href));

  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2 border-b border-border bg-background/80 px-4 backdrop-blur-md sm:px-6">
      <Button
        variant="ghost"
        size="icon"
        className="lg:hidden"
        onClick={onOpenMobileNav}
        aria-label="Open navigation"
      >
        <Menu className="size-5" />
      </Button>
      <span className="font-display text-sm font-semibold tracking-tight text-foreground lg:text-base">
        {current?.label ?? "Greyline"}
      </span>

      <div className="ml-auto flex items-center gap-1.5">
        <button
          type="button"
          onClick={onOpenCommand}
          className="hidden h-9 items-center gap-2 rounded-md border border-input bg-muted/50 px-3 text-sm text-muted-foreground outline-none transition-colors hover:bg-muted focus-visible:ring-2 focus-visible:ring-ring sm:flex"
        >
          <Search className="size-4" />
          <span>Search…</span>
          <kbd className="ml-3 rounded border border-border bg-background px-1.5 py-0.5 font-mono text-[10px] leading-none text-faint">
            ⌘K
          </kbd>
        </button>
        <Button
          variant="ghost"
          size="icon"
          className="sm:hidden"
          onClick={onOpenCommand}
          aria-label="Search"
        >
          <Search className="size-5" />
        </Button>
        <ThemeToggle />
      </div>
    </header>
  );
}
