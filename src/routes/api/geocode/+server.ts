import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { isApiEnabled } from '$server/services/api-gateway.js';
import { proxyFetch } from '$server/services/api-gateway.js';

interface NominatimResult {
	place_id: number;
	lat: string;
	lon: string;
	display_name: string;
	name?: string;
	address?: {
		country_code?: string;
		country?: string;
		city?: string;
		town?: string;
		state?: string;
	};
}

export const GET: RequestHandler = async ({ url }) => {
	const q = url.searchParams.get('q');
	if (!q) {
		return json({ error: 'q parameter required' }, { status: 400 });
	}

	if (!isApiEnabled('nominatim')) {
		return json({ offline: true, results: [] });
	}

	try {
		const result = await proxyFetch<NominatimResult[]>({
			apiId: 'nominatim',
			url: 'https://nominatim.openstreetmap.org/search',
			params: {
				q,
				format: 'json',
				limit: '5',
				addressdetails: '1'
			},
			cacheTtlSeconds: 86400
		});

		if (!result?.data) {
			return json({ results: [] });
		}

		const results = result.data.map((r) => ({
			lat: parseFloat(r.lat),
			lon: parseFloat(r.lon),
			name: r.address?.city ?? r.address?.town ?? r.name ?? r.display_name.split(',')[0],
			display_name: r.display_name,
			country_code: r.address?.country_code ?? null
		}));

		return json({ results });
	} catch {
		return json({ error: 'Geocoding failed' }, { status: 502 });
	}
};
