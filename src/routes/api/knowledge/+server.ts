import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getAllCountryProfiles, getAllCountrySummaries, getCountryProfile, upsertCountryProfile } from '$server/db/repositories/knowledge.js';

export const GET: RequestHandler = async ({ url }) => {
	const code = url.searchParams.get('code');
	if (code) {
		const profile = getCountryProfile(code.toUpperCase());
		if (!profile) {
			return json({ error: 'Country not found' }, { status: 404 });
		}
		return json(profile);
	}

	const view = url.searchParams.get('view');
	if (view === 'summaries') {
		return json(getAllCountrySummaries());
	}

	const profiles = getAllCountryProfiles();
	return json(profiles);
};

export const POST: RequestHandler = async () => {
	const FIELDS_1 = 'name,cca2,cca3,capital,region,subregion,population,area,latlng,flag';
	const FIELDS_2 = 'cca2,landlocked,borders,languages,currencies,demonyms,car,idd,timezones,unMember';

	try {
		const [res1, res2] = await Promise.all([
			fetch(`https://restcountries.com/v3.1/all?fields=${FIELDS_1}`),
			fetch(`https://restcountries.com/v3.1/all?fields=${FIELDS_2}`)
		]);
		if (!res1.ok || !res2.ok) {
			return json({ error: 'Failed to fetch from REST Countries API' }, { status: 502 });
		}
		const batch1 = await res1.json();
		const batch2 = await res2.json();

		const map = new Map<string, any>();
		for (const c of batch1) { if (c.cca2) map.set(c.cca2, { ...c }); }
		for (const c of batch2) { if (c.cca2 && map.has(c.cca2)) Object.assign(map.get(c.cca2), c); }

		let count = 0;
		for (const country of map.values()) {
			upsertCountryProfile(country.cca2, { rest_countries: JSON.stringify(country) });
			count++;
		}
		return json({ count, message: `Downloaded ${count} country profiles` });
	} catch (err) {
		const msg = err instanceof Error ? err.message : 'Unknown error';
		return json({ error: msg }, { status: 500 });
	}
};
