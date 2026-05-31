/**
 * Build the committed offline world basemap: a whole-world, low-zoom (z0–6)
 * vector PMTiles from public-domain Natural Earth data.
 *
 * MAINTAINER-ONLY. Requires the `tippecanoe` binary (brew install tippecanoe).
 * CI does NOT run this — `public/geo/world.pmtiles` is committed in-repo and
 * served as a static asset (Docker copies public/). Regenerate only when the
 * Natural Earth inputs change (~yearly). The raw NE GeoJSON is downloaded at
 * build time into a gitignored cache; nothing is fetched at runtime.
 *
 *   pnpm build:tiles
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync, statSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { createHash } from "node:crypto";

const CACHE_DIR = resolve("data/ne-cache");
const OUT_DIR = resolve("public/geo");
const OUT = resolve(OUT_DIR, "world.pmtiles");
const FALLBACK_COUNTRIES = resolve("public/geo/countries-110m.geojson");
const MAX_BYTES = 25 * 1024 * 1024; // hard ceiling for an in-repo binary asset

// Natural Earth vectors, public domain, served as ready-made GeoJSON by the
// nvkelso mirror so neither runtime nor CI needs GDAL/ogr2ogr.
const NE_BASE = "https://raw.githubusercontent.com/nvkelso/natural-earth-vector/master/geojson";

// tippecanoe layer name -> NE GeoJSON filename (50m: credible to z6, small).
const LAYERS: Record<string, string> = {
  land: "ne_50m_land.geojson",
  countries: "ne_50m_admin_0_countries.geojson",
  boundaries: "ne_50m_admin_0_boundary_lines_land.geojson",
  lakes: "ne_50m_lakes.geojson",
  rivers: "ne_50m_rivers_lake_centerlines.geojson",
  places: "ne_50m_populated_places_simple.geojson",
};

// Keep only the handful of attributes the style uses; NE ships dozens of
// columns that would bloat the tiles. tippecanoe `--include` is global and
// harmless for layers that lack a given attribute.
const KEEP_ATTRS = ["name", "NAME", "scalerank", "SCALERANK", "labelrank", "LABELRANK", "min_zoom", "pop_max", "POP_MAX", "ISO_A2", "ADM0_A3", "featurecla"];

async function download(url: string, dest: string, attempts = 4): Promise<void> {
  let lastErr: unknown;
  for (let i = 0; i < attempts; i++) {
    try {
      const res = await fetch(url);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const buf = Buffer.from(await res.arrayBuffer());
      writeFileSync(dest, buf);
      return;
    } catch (err) {
      lastErr = err;
      if (i < attempts - 1) {
        const ms = 1000 * 2 ** i;
        console.warn(`  download failed (${String(err)}); retry ${i + 1} in ${ms}ms`);
        await new Promise((r) => setTimeout(r, ms));
      }
    }
  }
  throw new Error(`Failed to download ${url} after ${attempts} attempts: ${String(lastErr)}`);
}

async function ensureLayer(name: string, file: string): Promise<string> {
  const dest = resolve(CACHE_DIR, file);
  if (existsSync(dest)) return dest;
  console.log(`  fetching ${file} …`);
  try {
    await download(`${NE_BASE}/${file}`, dest);
  } catch (err) {
    // Degrade gracefully for the countries layer using the committed 110m file.
    if (name === "countries" && existsSync(FALLBACK_COUNTRIES)) {
      console.warn(`  using committed countries-110m.geojson fallback (${String(err)})`);
      return FALLBACK_COUNTRIES;
    }
    throw err;
  }
  return dest;
}

function requireTippecanoe(): void {
  try {
    const v = execFileSync("tippecanoe", ["--version"], { stdio: "pipe" }).toString().trim();
    console.log(`tippecanoe: ${v}`);
  } catch {
    console.error("tippecanoe not found on PATH. Install it: brew install tippecanoe");
    process.exit(1);
  }
}

async function main() {
  requireTippecanoe();
  mkdirSync(CACHE_DIR, { recursive: true });
  mkdirSync(OUT_DIR, { recursive: true });

  console.log("Resolving Natural Earth layers…");
  const layerArgs: string[] = [];
  for (const [name, file] of Object.entries(LAYERS)) {
    const path = await ensureLayer(name, file);
    layerArgs.push("-L", `${name}:${path}`);
  }

  const args = [
    "-o", OUT,
    "--force",
    "--name=greyline-world",
    "--attribution=© Natural Earth",
    "-Z0", "-z6",
    "--simplification=4",
    "--detect-shared-borders",
    "--coalesce-densest-as-needed",
    "--drop-densest-as-needed",
    "--extend-zooms-if-still-dropping",
    ...KEEP_ATTRS.flatMap((a) => ["--include", a]),
    ...layerArgs,
  ];

  console.log(`\ntippecanoe ${args.join(" ")}\n`);
  execFileSync("tippecanoe", args, { stdio: "inherit" });

  const size = statSync(OUT).size;
  const sha256 = createHash("sha256").update(readFileSync(OUT)).digest("hex");
  const mb = (size / 1024 / 1024).toFixed(2);
  console.log(`\nworld.pmtiles → ${mb} MB · sha256 ${sha256}`);
  if (size > MAX_BYTES) {
    console.error(`Output ${mb} MB exceeds the ${MAX_BYTES / 1024 / 1024} MB ceiling. Raise --simplification or drop a layer.`);
    process.exit(1);
  }
  console.log("OK — commit public/geo/world.pmtiles. Seed picks up size + checksum.");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
