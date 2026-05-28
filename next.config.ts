import type { NextConfig } from "next";

// Defense-in-depth even though the app is local-only. CSP allows what MapLibre
// (WebGL + wasm + blob workers) and Tailwind 4 (inline style attrs) actually
// need; everything else is locked down.
const securityHeaders = [
  { key: "Strict-Transport-Security", value: "max-age=63072000; includeSubDomains; preload" },
  { key: "X-Content-Type-Options", value: "nosniff" },
  { key: "X-Frame-Options", value: "DENY" },
  { key: "Referrer-Policy", value: "no-referrer" },
  { key: "Cross-Origin-Opener-Policy", value: "same-origin" },
  { key: "Cross-Origin-Resource-Policy", value: "same-origin" },
  {
    key: "Permissions-Policy",
    value: [
      "camera=()",
      "microphone=()",
      "geolocation=()",
      "payment=()",
      "usb=()",
      "bluetooth=()",
      "serial=()",
      "browsing-topics=()",
      "interest-cohort=()",
    ].join(", "),
  },
  {
    key: "Content-Security-Policy",
    value: [
      "default-src 'self'",
      // 'unsafe-inline' is required by Next 15+/16 App Router: RSC streams page
      // chunks via inline `<script>self.__next_f.push(...)</script>` tags.
      // Without it, the static shell renders but no content streams in.
      // A future upgrade path is nonce-based CSP via middleware; for a local
      // same-origin app this is acceptable defense-in-depth.
      // 'wasm-unsafe-eval' is required by MapLibre's WebGL/WASM path.
      "script-src 'self' 'unsafe-inline' 'wasm-unsafe-eval'",
      // protomaps/MapLibre workers come from blob:.
      "worker-src 'self' blob:",
      // Tailwind v4 and shadcn primitives use inline styles.
      "style-src 'self' 'unsafe-inline'",
      // The grain SVG and the PNG-export pipeline use data:/blob: image URLs.
      // The OSINT map (`/map`) reaches public tile servers directly from the
      // browser — CARTO basemap, NASA GIBS satellite, RainViewer radar.
      // Server-proxied APIs (aircraft, quakes, disasters, cameras, geocode)
      // stay same-origin via /api/* and don't need to be allow-listed here.
      "img-src 'self' data: blob: https://*.basemaps.cartocdn.com https://tilecache.rainviewer.com https://gibs.earthdata.nasa.gov",
      "font-src 'self'",
      // Same OSINT-map exception applies to connect-src — RainViewer's
      // metadata endpoint is hit directly from the browser.
      "connect-src 'self' https://api.rainviewer.com",
      "object-src 'none'",
      "base-uri 'self'",
      "form-action 'self'",
      "frame-ancestors 'none'",
      "upgrade-insecure-requests",
    ].join("; "),
  },
];

const nextConfig: NextConfig = {
  // Pin the project root (a stray lockfile in the parent dir otherwise misleads Next).
  turbopack: { root: import.meta.dirname },
  outputFileTracingRoot: import.meta.dirname,
  // better-sqlite3 + argon2 are native addons: never bundle them, load via require.
  serverExternalPackages: ["better-sqlite3", "argon2"],
  // Local-server distribution (no cloud). Trace the native binary + the .sql
  // migration files (read from disk at runtime) into the standalone output.
  output: "standalone",
  outputFileTracingIncludes: {
    "/**/*": [
      "./server/db/migrations/**/*",
      "./node_modules/better-sqlite3/**/*",
    ],
  },
  // Apply the security headers to every route. Next merges these with the
  // route-handler-set headers; route-level Content-Type wins per HTTP semantics.
  async headers() {
    return [
      {
        source: "/:path*",
        headers: securityHeaders,
      },
    ];
  },
};

export default nextConfig;
