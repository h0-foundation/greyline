"use client";

import { Printer } from "lucide-react";

/** Triggers the browser print dialog for the briefing sheet. Hidden when printing. */
export function PrintButton() {
  return (
    <button
      type="button"
      onClick={() => window.print()}
      className="inline-flex items-center gap-1.5 rounded-md border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 shadow-sm transition-colors hover:bg-zinc-50 print:hidden"
    >
      <Printer className="size-4" /> Print / save as PDF
    </button>
  );
}
