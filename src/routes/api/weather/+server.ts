import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getWeather } from '$server/api-clients/open-meteo.js';
import { isApiEnabled } from '$server/services/api-gateway.js';

export const GET: RequestHandler = async ({ url }) => {
	const lat = parseFloat(url.searchParams.get('lat') || '');
	const lng = parseFloat(url.searchParams.get('lng') || '');

	if (isNaN(lat) || isNaN(lng)) {
		return json({ error: 'lat and lng are required' }, { status: 400 });
	}

	if (!isApiEnabled('open-meteo')) {
		return json({ offline: true, message: 'Weather API disabled' });
	}

	try {
		const data = await getWeather(lat, lng);
		return json({ data, cached: false });
	} catch (err) {
		return json({ error: 'Failed to fetch weather data' }, { status: 502 });
	}
};
