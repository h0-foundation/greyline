"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { isPillarMode, type PillarMode } from "@/lib/pillars";

type Ctx = { mode: PillarMode; setMode: (m: PillarMode) => void };

const PillarContext = createContext<Ctx>({ mode: "all", setMode: () => {} });

export function usePillarMode() {
  return useContext(PillarContext);
}

// Holds the active pillar mode and persists it via the generic settings API
// (alongside units / home_country). Loads once on mount; defaults to "all" so
// the first paint is the full surface, then narrows if a mode was saved.
export function PillarModeProvider({ children }: { children: React.ReactNode }) {
  const [mode, setModeState] = useState<PillarMode>("all");

  useEffect(() => {
    fetch("/api/settings")
      .then((r) => r.json())
      .then((s: Record<string, string>) => {
        // Settings values can be stored quoted — strip surrounding quotes.
        const raw = (s?.pillar_mode ?? "").replace(/^"|"$/g, "");
        if (isPillarMode(raw)) setModeState(raw);
      })
      .catch(() => {});
  }, []);

  const setMode = (m: PillarMode) => {
    setModeState(m);
    fetch("/api/settings", {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ pillar_mode: m }),
    }).catch(() => {});
  };

  return <PillarContext.Provider value={{ mode, setMode }}>{children}</PillarContext.Provider>;
}
