"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { footerNav, isActive, primaryNav, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { OfflineBadge } from "@/components/shell/offline-badge";

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <span className="flex size-7 items-center justify-center rounded-lg bg-primary shadow-sm">
        <span className="h-0.5 w-3.5 rounded-full bg-primary-foreground" />
      </span>
      <span className="font-display text-lg font-bold tracking-tight text-sidebar-foreground">
        Greyline
      </span>
    </Link>
  );
}

function NavLink({
  item,
  active,
  idPrefix,
  onNavigate,
}: {
  item: NavItem;
  active: boolean;
  idPrefix: string;
  onNavigate?: () => void;
}) {
  const reduce = useReducedMotion();
  const Icon = item.icon;
  return (
    <Link
      href={item.href}
      onClick={onNavigate}
      aria-current={active ? "page" : undefined}
      className={cn(
        "relative flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        active
          ? "text-sidebar-accent-foreground"
          : "text-sidebar-foreground/75 hover:bg-sidebar-accent/50 hover:text-sidebar-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId={`${idPrefix}-active-pill`}
          className="absolute inset-0 -z-10 rounded-md bg-sidebar-accent"
          transition={
            reduce ? { duration: 0 } : { type: "spring", stiffness: 400, damping: 35 }
          }
        />
      )}
      <Icon className="size-4 shrink-0" />
      <span>{item.label}</span>
    </Link>
  );
}

export function SidebarContent({
  idPrefix = "desktop",
  onNavigate,
}: {
  idPrefix?: string;
  onNavigate?: () => void;
}) {
  const pathname = usePathname();
  return (
    <div className="flex h-full flex-col gap-1 p-3">
      <div className="px-1 py-2">
        <Brand />
      </div>
      <nav className="mt-1 flex flex-1 flex-col gap-0.5">
        {primaryNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            idPrefix={idPrefix}
            onNavigate={onNavigate}
          />
        ))}
      </nav>
      <div className="flex flex-col gap-2">
        {footerNav.map((item) => (
          <NavLink
            key={item.href}
            item={item}
            active={isActive(pathname, item.href)}
            idPrefix={idPrefix}
            onNavigate={onNavigate}
          />
        ))}
        <OfflineBadge />
      </div>
    </div>
  );
}
