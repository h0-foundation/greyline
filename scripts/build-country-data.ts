import { getDb, closeDb } from '../server/db/index';
import { writeFileSync, mkdirSync, existsSync } from 'fs';
import { resolve } from 'path';

const BUNDLE_DIR = resolve('data/bundles/countries');

// REST Countries API limits to 10 fields per request, so we split into two calls
const FIELDS_1 = 'name,cca2,cca3,capital,region,subregion,population,area,latlng,flag';
const FIELDS_2 = 'cca2,landlocked,borders,languages,currencies,demonyms,car,idd,timezones,unMember';

// REST Countries intermittently 500s; a single failure was reddening the whole
// e2e pipeline (the bundle step runs before tests). Retry with backoff.
async function fetchFields(fields: string, attempts = 4): Promise<any[]> {
	const url = `https://restcountries.com/v3.1/all?fields=${fields}`;
	let lastErr: unknown;
	for (let i = 0; i < attempts; i++) {
		try {
			const res = await fetch(url);
			if (!res.ok) throw new Error(`Failed to fetch (${fields}): ${res.status}`);
			return await res.json();
		} catch (err) {
			lastErr = err;
			if (i < attempts - 1) {
				const backoffMs = 1000 * 2 ** i; // 1s, 2s, 4s
				console.warn(`  fetch failed (${String(err)}); retry ${i + 1}/${attempts - 1} in ${backoffMs}ms`);
				await new Promise((r) => setTimeout(r, backoffMs));
			}
		}
	}
	throw new Error(`Failed to fetch (${fields}) after ${attempts} attempts: ${String(lastErr)}`);
}

async function main() {
	console.log('Fetching REST Countries data (batch 1/2)...');
	const batch1 = await fetchFields(FIELDS_1);
	console.log(`Fetched ${batch1.length} countries (batch 1)`);

	console.log('Fetching REST Countries data (batch 2/2)...');
	const batch2 = await fetchFields(FIELDS_2);
	console.log(`Fetched ${batch2.length} countries (batch 2)`);

	// Merge by cca2
	const map = new Map<string, any>();
	for (const c of batch1) {
		if (c.cca2) map.set(c.cca2, { ...c });
	}
	for (const c of batch2) {
		if (c.cca2 && map.has(c.cca2)) {
			Object.assign(map.get(c.cca2), c);
		}
	}

	const countries = [...map.values()];
	console.log(`Merged ${countries.length} country profiles`);

	if (!existsSync(BUNDLE_DIR)) {
		mkdirSync(BUNDLE_DIR, { recursive: true });
	}

	// Save full bundle
	writeFileSync(resolve(BUNDLE_DIR, 'rest-countries.json'), JSON.stringify(countries, null, 2));
	console.log('Saved rest-countries.json bundle');

	// Upsert into database
	const db = getDb();
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
	console.log(`Upserted ${countries.length} country profiles into database`);

	closeDb();
	console.log('Done.');
}

main().catch((err) => {
	console.error('Error:', err);
	process.exit(1);
});
