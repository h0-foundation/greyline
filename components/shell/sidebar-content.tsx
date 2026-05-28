"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { motion, useReducedMotion } from "motion/react";
import { footerNav, isActive, primaryNav, type NavItem } from "@/lib/nav";
import { cn } from "@/lib/utils";
import { OfflineBadge } from "@/components/shell/offline-badge";
import { Lauburu } from "@/components/brand/logo";

function Brand() {
  return (
    <Link
      href="/"
      className="flex items-center gap-2.5 rounded-md px-2 py-1.5 outline-none focus-visible:ring-2 focus-visible:ring-sidebar-ring"
    >
      <Lauburu className="size-7 text-primary drop-shadow-sm" />
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
        "relative flex items-center gap-3 rounded-md py-2 pl-4 pr-3 text-sm outline-none transition-colors focus-visible:ring-2 focus-visible:ring-sidebar-ring",
        active
          ? "font-medium text-sidebar-primary"
          : "text-sidebar-foreground/70 hover:bg-sidebar-accent/40 hover:text-sidebar-foreground",
      )}
    >
      {active && (
        <motion.span
          layoutId={`${idPrefix}-active-bar`}
          className="absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-sidebar-primary"
          transition={reduce ? { duration: 0 } : { type: "spring", stiffness: 500, damping: 38 }}
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
      <span className="label-caps mt-3 mb-1 px-4">Navigate</span>
      <nav className="flex flex-1 flex-col gap-0.5">
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
