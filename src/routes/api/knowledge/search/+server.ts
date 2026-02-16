import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getAllCountrySummaries } from '$server/db/repositories/knowledge.js';
import { getCountryProfile } from '$server/db/repositories/knowledge.js';

export const GET: RequestHandler = async ({ url }) => {
	const q = (url.searchParams.get('q') ?? '').toLowerCase().trim();
	if (!q) {
		return json({ error: 'q parameter required' }, { status: 400 });
	}

	const summaries = getAllCountrySummaries();
	const matches = summaries
		.filter((s) => {
			const name = s.name.toLowerCase();
			const code = s.country_code.toLowerCase();
			return name.includes(q) || code === q;
		})
		.slice(0, 5);

	const results = matches.map((m) => {
		const profile = getCountryProfile(m.country_code) as { rest_countries?: string } | undefined;
		let capital = '';
		let population = 0;
		let currencies = '';
		let region = m.region;

		if (profile?.rest_countries) {
			try {
				const rc = JSON.parse(profile.rest_countries);
				capital = rc.capital?.[0] ?? '';
				population = rc.population ?? 0;
				region = rc.subregion ?? rc.region ?? m.region;
				if (rc.currencies) {
					currencies = Object.values(rc.currencies as Record<string, { name: string }>)
						.map((c) => c.name)
						.join(', ');
				}
			} catch {
				// ignore parse errors
			}
		}

		return {
			country_code: m.country_code,
			name: m.name,
			flag: m.flag,
			region,
			capital,
			population,
			currencies
		};
	});

	return json({ results });
};
