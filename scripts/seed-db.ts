import { getDb, closeDb } from '../server/db/index';
import { upsertBundle } from '../server/db/repositories/bundles';
import { readFileSync, existsSync, statSync } from 'fs';
import { resolve } from 'path';
import { createHash } from 'crypto';

const BUNDLE_DIR = resolve('data/bundles/countries');

console.log('Seeding database...');
const db = getDb();

// Verify tables exist
const tables = db
	.prepare("SELECT name FROM sqlite_master WHERE type='table' ORDER BY name")
	.all() as { name: string }[];
console.log(`Database tables: ${tables.map((t) => t.name).join(', ')}`);

// Check settings
const settings = db.prepare('SELECT * FROM settings').all();
console.log(`Settings: ${settings.length} entries`);

// Check API toggles
const toggles = db.prepare('SELECT * FROM api_toggles').all();
console.log(`API toggles: ${toggles.length} entries`);

// Load country data from bundle if available
const bundlePath = resolve(BUNDLE_DIR, 'rest-countries.json');
if (existsSync(bundlePath)) {
	const countries = JSON.parse(readFileSync(bundlePath, 'utf-8'));
	const upsert = db.prepare(`
    INSERT INTO country_profiles (country_code, rest_countries, updated_at)
    VALUES (?, ?, datetime('now'))
    ON CONFLICT(country_code) DO UPDATE SET
      rest_countries = excluded.rest_countries,
      updated_at = datetime('now')
  `);

	const insertMany = db.transaction((data: any[]) => {
		for (const country of data) {
			const code = country.cca2;
			if (!code) continue;
			upsert.run(code, JSON.stringify(country));
		}
	});

	insertMany(countries);
	console.log(`Loaded ${countries.length} country profiles from bundle`);
} else {
	console.log('No country data bundle found. Run: pnpm run build:countries');
}

// Summary
const profiles = db.prepare('SELECT COUNT(*) as count FROM country_profiles').get() as {
	count: number;
};
console.log(`Country profiles in database: ${profiles.count}`);

// Register the committed offline world basemap so /api/bundles and the map
// report it. Graceful no-op if it hasn't been built yet (pnpm build:tiles).
const worldTiles = resolve('public/geo/world.pmtiles');
if (existsSync(worldTiles)) {
	const size = statSync(worldTiles).size;
	const checksum = createHash('sha256').update(readFileSync(worldTiles)).digest('hex');
	upsertBundle({ id: 'map-world', type: 'map', region: 'world', path: 'public/geo/world.pmtiles', size, checksum });
	console.log(`Offline world basemap registered (${(size / 1024 / 1024).toFixed(2)} MB)`);
} else {
	console.log('No world basemap found. Run: pnpm run build:tiles');
}

closeDb();
console.log('Database seeded successfully.');
