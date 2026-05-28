import type { NextConfig } from "next";

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
};

export default nextConfig;
