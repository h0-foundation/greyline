"use client";

import { useEffect, useRef, useState } from "react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";

type Visited = { code: string; name: string; days: number; trips: number };

// Fully offline: country polygons are bundled (Natural Earth, public domain) and
// rendered with no tile server — on-brand and works with zero network.
export function WorldMap({ visited }: { visited: Visited[] }) {
  const ref = useRef<HTMLDivElement>(null);
  const [hover, setHover] = useState<{ name: string; days?: number; trips?: number } | null>(null);

  useEffect(() => {
    if (!ref.current) return;
    const dark = document.documentElement.classList.contains("dark");
    // Oak-green fill for visited countries; NEUTRAL stone land otherwise.
    const c = dark
      ? { bg: "transparent", off: "#2a2a27", on: "#74b277", border: "#37372f", onText: "#fff" }
      : { bg: "transparent", off: "#eae8e3", on: "#3f6e44", border: "#dcd9d2", onText: "#fff" };
    const codes = visited.map((v) => v.code);
    const stats = new Map(visited.map((v) => [v.code, v]));

    const map = new maplibregl.Map({
      container: ref.current,
      attributionControl: false,
      dragRotate: false,
      style: {
        version: 8,
        sources: { countries: { type: "geojson", data: "/geo/countries-110m.geojson" } },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": c.bg } },
          {
            id: "fill", type: "fill", source: "countries",
            paint: {
              "fill-color": ["case", ["in", ["get", "iso"], ["literal", codes]], c.on, c.off],
              "fill-opacity": 0.95,
            },
          },
          { id: "borders", type: "line", source: "countries", paint: { "line-color": c.border, "line-width": 0.5 } },
        ],
      },
      center: [10, 25],
      zoom: 0.7,
      maxZoom: 5,
    });
    map.fitBounds([[-168, -56], [192, 78]], { padding: 16, animate: false });

    map.on("mousemove", "fill", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      map.getCanvas().style.cursor = "pointer";
      const iso = (f.properties as { iso?: string })?.iso ?? "";
      const s = stats.get(iso);
      setHover({ name: (f.properties as { name?: string })?.name ?? iso, days: s?.days, trips: s?.trips });
    });
    map.on("mouseleave", "fill", () => { map.getCanvas().style.cursor = ""; setHover(null); });

    return () => map.remove();
  }, [visited]);

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div ref={ref} className="h-[340px] w-full" role="img" aria-label={`World map with ${visited.length} countries visited highlighted`} />
      {/* Hover readout */}
      <div className="pointer-events-none absolute left-3 top-3 rounded-md border border-border bg-card/90 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur">
        {hover ? (
          <span className="text-foreground">
            {hover.name}
            {hover.days != null && <span className="ml-1.5 font-mono text-faint">{hover.trips} trip{hover.trips === 1 ? "" : "s"} · {hover.days}d</span>}
          </span>
        ) : (
          <span className="text-faint">Hover a country</span>
        )}
      </div>
      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-3 rounded-md border border-border bg-card/90 px-2.5 py-1.5 text-[11px] shadow-sm backdrop-blur">
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-primary" />Visited</span>
        <span className="flex items-center gap-1.5"><span className="size-2.5 rounded-sm bg-muted" />Not yet</span>
      </div>
    </div>
  );
}
