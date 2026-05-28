"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useReducedMotion } from "motion/react";
import maplibregl from "maplibre-gl";
import "maplibre-gl/dist/maplibre-gl.css";
import { Download } from "lucide-react";
import { DURATION } from "@/lib/motion";

type Visited = {
  code: string;
  name: string;
  days: number;
  trips: number;
  flag?: string;
  first?: string | null;
  last?: string | null;
};

const WORLD_BOUNDS: [[number, number], [number, number]] = [[-168, -56], [192, 78]];

// Oak-green = visited; gold spark = home country; NEUTRAL stone = unvisited.
function palette(dark: boolean) {
  return dark
    ? { off: "#2a2a27", on: "#74b277", homeFill: "#e0b24a", border: "#37372f" }
    : { off: "#eae8e3", on: "#3f6e44", homeFill: "#b9892a", border: "#dcd9d2" };
}

function yearRange(first?: string | null, last?: string | null) {
  const a = first?.slice(0, 4);
  const b = last?.slice(0, 4);
  if (!a && !b) return null;
  if (a && b && a !== b) return `${a}–${b}`;
  return a || b;
}

// Fully offline: country polygons are bundled (Natural Earth, public domain) and
// rendered with no tile server — on-brand and works with zero network.
export function WorldMap({
  visited,
  home,
  knownCodes,
  animateOnLoad = false,
  exportable = false,
  interactive = true,
  height = 340,
}: {
  visited: Visited[];
  home?: string;
  /** Codes with a country profile — clicking one opens its briefing. Falls back to visited. */
  knownCodes?: string[];
  animateOnLoad?: boolean;
  exportable?: boolean;
  interactive?: boolean;
  height?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const mapRef = useRef<maplibregl.Map | null>(null);
  const rafRef = useRef<number | null>(null);
  const animatedRef = useRef(false);
  const router = useRouter();
  const routerRef = useRef(router);
  routerRef.current = router;
  const { resolvedTheme } = useTheme();
  const reduce = useReducedMotion();
  const [hover, setHover] = useState<Visited | null>(null);
  const [exporting, setExporting] = useState(false);

  useEffect(() => {
    if (!ref.current) return;
    // Read the applied theme from the DOM for an accurate first paint (next-themes
    // sets the class pre-hydration); live toggles are handled by the recolor effect.
    const dark = document.documentElement.classList.contains("dark");
    const c = palette(dark);
    const codes = visited.map((v) => v.code);
    const homeCode = (home ?? "").toUpperCase();
    const stats = new Map(visited.map((v) => [v.code, v]));
    const clickable = new Set(
      (knownCodes && knownCodes.length ? knownCodes : codes).map((x) => x.toUpperCase()),
    );
    const willAnimate = animateOnLoad && !reduce;

    const map = new maplibregl.Map({
      container: ref.current,
      attributionControl: false,
      dragRotate: false,
      canvasContextAttributes: { preserveDrawingBuffer: exportable }, // read canvas for PNG export
      style: {
        version: 8,
        sources: {
          countries: { type: "geojson", data: "/geo/countries-110m.geojson", promoteId: "iso" },
        },
        layers: [
          { id: "bg", type: "background", paint: { "background-color": "transparent" } },
          {
            id: "fill",
            type: "fill",
            source: "countries",
            paint: {
              "fill-color": [
                "case",
                ["==", ["get", "iso"], homeCode], c.homeFill,
                ["in", ["get", "iso"], ["literal", codes]], c.on,
                c.off,
              ],
              // When animating, visited countries start hidden and fade in via
              // feature-state; everything else is shown at the base opacity.
              "fill-opacity": willAnimate
                ? [
                    "case",
                    ["==", ["get", "iso"], homeCode], 0.95,
                    ["in", ["get", "iso"], ["literal", codes]],
                    ["case", ["boolean", ["feature-state", "on"], false], 0.95, 0],
                    0.95,
                  ]
                : 0.95,
              "fill-opacity-transition": { duration: Math.round(DURATION.enter * 1000), delay: 0 },
            },
          },
          {
            id: "borders",
            type: "line",
            source: "countries",
            paint: { "line-color": c.border, "line-width": 0.5 },
          },
        ],
      },
      center: [10, 25],
      zoom: 0.7,
      maxZoom: 5,
    });
    mapRef.current = map;
    map.fitBounds(WORLD_BOUNDS, { padding: 16, animate: false });

    map.on("mousemove", "fill", (e) => {
      const f = e.features?.[0];
      if (!f) return;
      const iso = (f.properties as { iso?: string })?.iso ?? "";
      map.getCanvas().style.cursor = interactive && clickable.has(iso.toUpperCase()) ? "pointer" : "";
      const s = stats.get(iso);
      setHover({
        code: iso,
        name: (f.properties as { name?: string })?.name ?? iso,
        days: s?.days ?? 0,
        trips: s?.trips ?? 0,
        flag: s?.flag,
        first: s?.first,
        last: s?.last,
      });
    });
    map.on("mouseleave", "fill", () => {
      map.getCanvas().style.cursor = "";
      setHover(null);
    });

    // Click a country → its briefing. Guarded so we never 404 on the -99 sentinel
    // or a code without a profile. Keyboard users reach the same pages via StampWall.
    map.on("click", "fill", (e) => {
      if (!interactive) return;
      const iso = ((e.features?.[0]?.properties as { iso?: string })?.iso ?? "").toUpperCase();
      if (!iso || iso === "-99" || !clickable.has(iso)) return;
      const navigate = () => routerRef.current.push(`/countries/${iso}`);
      // Native View Transitions — gentle cross-fade where supported; graceful
      // fallback elsewhere. Honors `prefers-reduced-motion` via the browser.
      const doc = document as Document & { startViewTransition?: (cb: () => void) => unknown };
      if (typeof doc.startViewTransition === "function") {
        doc.startViewTransition(navigate);
      } else {
        navigate();
      }
    });

    if (willAnimate) {
      map.on("load", () => {
        // Re-init after the first run (e.g. a prop change) shows the final state
        // instantly — the staggered reveal plays once per mount only.
        if (animatedRef.current) {
          for (const v of visited) {
            try {
              map.setFeatureState({ source: "countries", id: v.code }, { on: true });
            } catch {
              /* feature may be absent in the 110m set */
            }
          }
          return;
        }
        animatedRef.current = true;
        // Most-traveled countries light up first (getVisitedCountries is days-desc).
        const order = visited.map((v) => v.code);
        const n = order.length;
        if (!n) return;
        const slots = Math.min(n, 60);
        const budget = DURATION.slow * 1000 * Math.min(3, Math.max(1, n / 20));
        const start = performance.now();
        const done = new Set<number>();
        const tick = (now: number) => {
          const elapsed = now - start;
          for (let i = 0; i < n; i++) {
            if (done.has(i)) continue;
            if (elapsed >= (Math.min(i, slots) / slots) * budget) {
              done.add(i);
              try {
                map.setFeatureState({ source: "countries", id: order[i] }, { on: true });
              } catch {
                /* ignore */
              }
            }
          }
          if (done.size < n && mapRef.current) rafRef.current = requestAnimationFrame(tick);
        };
        rafRef.current = requestAnimationFrame(tick);
      });
    }

    return () => {
      if (rafRef.current != null) cancelAnimationFrame(rafRef.current);
      map.remove();
      mapRef.current = null;
    };
  }, [visited, home, knownCodes, animateOnLoad, exportable, interactive, reduce]);

  // Recolor on theme toggle without re-initializing (so the fill animation never replays).
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !map.isStyleLoaded()) return;
    const c = palette(document.documentElement.classList.contains("dark"));
    const homeCode = (home ?? "").toUpperCase();
    const codes = visited.map((v) => v.code);
    try {
      map.setPaintProperty("fill", "fill-color", [
        "case",
        ["==", ["get", "iso"], homeCode], c.homeFill,
        ["in", ["get", "iso"], ["literal", codes]], c.on,
        c.off,
      ]);
      map.setPaintProperty("borders", "line-color", c.border);
    } catch {
      /* style not ready */
    }
  }, [resolvedTheme, home, visited]);

  // Keep the canvas sized to its (responsive) container.
  useEffect(() => {
    const map = mapRef.current;
    const el = ref.current;
    if (!map || !el) return;
    const ro = new ResizeObserver(() => map.resize());
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  async function exportPng() {
    const map = mapRef.current;
    const wrapper = ref.current?.parentElement;
    if (!map || !wrapper) return;
    setExporting(true);
    try {
      // Finish any in-flight reveal and frame the whole world for a consistent shot.
      if (rafRef.current != null) {
        cancelAnimationFrame(rafRef.current);
        rafRef.current = null;
      }
      for (const v of visited) {
        try {
          map.setFeatureState({ source: "countries", id: v.code }, { on: true });
        } catch {
          /* ignore */
        }
      }
      map.fitBounds(WORLD_BOUNDS, { padding: 16, animate: false });
      await Promise.race([
        new Promise<void>((res) => map.once("idle", () => res())),
        new Promise<void>((res) => setTimeout(res, 1500)),
      ]);

      const gl = map.getCanvas();
      const dpr = window.devicePixelRatio || 1;
      const titleH = Math.round(64 * dpr);
      const out = document.createElement("canvas");
      out.width = gl.width;
      out.height = gl.height + titleH;
      const ctx = out.getContext("2d");
      if (!ctx) return;
      // Computed styles resolve OKLCH tokens to rgb() — always canvas-safe.
      const bg = getComputedStyle(wrapper).backgroundColor || "#1a1a17";
      const fg = getComputedStyle(document.body).color || "#eee";
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, out.width, out.height);
      ctx.drawImage(gl, 0, titleH);
      ctx.fillStyle = fg;
      ctx.textBaseline = "middle";
      ctx.font = `600 ${Math.round(22 * dpr)}px Inter, system-ui, sans-serif`;
      ctx.fillText(`My world — ${visited.length} countries`, Math.round(24 * dpr), Math.round(titleH * 0.52));

      await new Promise<void>((res) =>
        out.toBlob((blob) => {
          if (blob) {
            const url = URL.createObjectURL(blob);
            const a = document.createElement("a");
            a.href = url;
            a.download = `my-world-map-${new Date().toISOString().slice(0, 10)}.png`;
            document.body.appendChild(a);
            a.click();
            a.remove();
            URL.revokeObjectURL(url);
          }
          res();
        }, "image/png"),
      );
    } finally {
      setExporting(false);
    }
  }

  const range = hover ? yearRange(hover.first, hover.last) : null;

  return (
    <div className="relative overflow-hidden rounded-xl border border-border bg-card shadow-xs">
      <div
        ref={ref}
        style={{ height }}
        className="w-full"
        role="img"
        aria-label={`World map with ${visited.length} countries visited highlighted`}
      />

      {/* Hover readout */}
      <div className="pointer-events-none absolute left-3 top-3 max-w-[60%] rounded-md border border-border bg-card/90 px-2.5 py-1.5 text-xs shadow-sm backdrop-blur">
        {hover ? (
          <span className="flex items-center gap-1.5 text-foreground">
            {hover.flag && (
              <span aria-hidden className="text-sm leading-none">
                {hover.flag}
              </span>
            )}
            <span className="truncate font-medium">{hover.name}</span>
            {hover.days > 0 && (
              <span className="shrink-0 font-mono text-faint">
                {hover.trips} trip{hover.trips === 1 ? "" : "s"} · {hover.days}d{range ? ` · ${range}` : ""}
              </span>
            )}
          </span>
        ) : (
          <span className="text-faint">Hover a country</span>
        )}
      </div>

      {/* Export */}
      {exportable && (
        <button
          type="button"
          onClick={exportPng}
          disabled={exporting}
          className="absolute right-3 top-3 inline-flex items-center gap-1.5 rounded-md border border-border bg-card/90 px-2.5 py-1.5 text-xs text-foreground shadow-sm backdrop-blur transition-colors hover:border-primary/30 hover:text-accent-text focus-visible:outline-none focus-visible:ring-[3px] focus-visible:ring-ring/50 disabled:opacity-60"
        >
          <Download className="size-3.5" />
          {exporting ? "Exporting…" : "Export"}
        </button>
      )}

      {/* Legend */}
      <div className="pointer-events-none absolute bottom-3 right-3 flex items-center gap-3 rounded-md border border-border bg-card/90 px-2.5 py-1.5 text-[11px] shadow-sm backdrop-blur">
        {home && (
          <span className="flex items-center gap-1.5">
            <span className="size-2.5 rounded-sm bg-spark" />
            Home
          </span>
        )}
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-primary" />
          Visited
        </span>
        <span className="flex items-center gap-1.5">
          <span className="size-2.5 rounded-sm bg-muted" />
          Not yet
        </span>
      </div>
    </div>
  );
}
