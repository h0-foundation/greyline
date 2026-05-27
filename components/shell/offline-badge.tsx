"use client";

import { ShieldCheck } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip";

/**
 * Persistent, quiet offline-reassurance. The promise of the product, always in view.
 */
export function OfflineBadge({ collapsed = false }: { collapsed?: boolean }) {
  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className="flex items-center gap-2 rounded-md border border-border/60 bg-accent-subtle/40 px-2.5 py-2 text-xs text-muted-foreground"
          role="status"
        >
          <ShieldCheck className="size-4 shrink-0 text-success" />
          {!collapsed && (
            <span className="leading-tight">
              <span className="font-medium text-foreground">Works offline</span>
              <span className="block text-[11px] text-faint">
                Nothing leaves this machine
              </span>
            </span>
          )}
        </div>
      </TooltipTrigger>
      <TooltipContent side="right" className="max-w-56 text-pretty">
        No account, no cloud, no tracking. Your trips, documents, and research
        stay on your device.
      </TooltipContent>
    </Tooltip>
  );
}
