import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { ofetch } from 'ofetch';

export const GET: RequestHandler = async ({ url }) => {
	const startLat = parseFloat(url.searchParams.get('startLat') ?? '');
	const startLng = parseFloat(url.searchParams.get('startLng') ?? '');
	const endLat = parseFloat(url.searchParams.get('endLat') ?? '');
	const endLng = parseFloat(url.searchParams.get('endLng') ?? '');
	const profile = url.searchParams.get('profile') ?? 'foot';

	if ([startLat, startLng, endLat, endLng].some(isNaN)) {
		return json({ error: 'Provide startLat, startLng, endLat, endLng' }, { status: 400 });
	}

	const profileMap: Record<string, string> = {
		foot: 'foot',
		car: 'car',
		bike: 'bike',
	};

	const osrmProfile = profileMap[profile] ?? 'foot';

	try {
		const coords = `${startLng},${startLat};${endLng},${endLat}`;
		const data = await ofetch(
			`https://router.project-osrm.org/route/v1/${osrmProfile}/${coords}?overview=full&geometries=geojson&steps=true`,
			{
				headers: { 'User-Agent': '', 'Referer': '' },
				timeout: 15000,
			}
		);

		if (!data.routes || data.routes.length === 0) {
			return json({ error: 'No route found' }, { status: 404 });
		}

		const route = data.routes[0];
		return json({
			geometry: route.geometry,
			distance: route.distance,
			duration: route.duration,
			steps: route.legs?.[0]?.steps?.map((s: any) => ({
				instruction: s.maneuver?.instruction ?? '',
				distance: s.distance,
				duration: s.duration,
				name: s.name,
			})) ?? [],
		});
	} catch (err) {
		return json({ error: 'Routing failed' }, { status: 502 });
	}
};
