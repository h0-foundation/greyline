import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { isApiEnabled } from '$server/services/api-gateway.js';
import { proxyFetch } from '$server/services/api-gateway.js';

interface OverpassElement {
	type: string;
	id: number;
	lat?: number;
	lon?: number;
	tags?: Record<string, string>;
	center?: { lat: number; lon: number };
}

interface OverpassResponse {
	elements: OverpassElement[];
}

type PoiType = 'cameras' | 'embassies' | 'hospitals' | 'government' | 'police';

const QUERIES: Record<PoiType, (s: number, w: number, n: number, e: number) => string> = {
	cameras: (s, w, n, e) =>
		`[out:json][timeout:30];node["man_made"="surveillance"](${s},${w},${n},${e});out body;`,
	embassies: (s, w, n, e) =>
		`[out:json][timeout:30];(node["office"="diplomatic"](${s},${w},${n},${e});way["office"="diplomatic"](${s},${w},${n},${e}););out center body;`,
	hospitals: (s, w, n, e) =>
		`[out:json][timeout:30];(node["amenity"="hospital"](${s},${w},${n},${e});way["amenity"="hospital"](${s},${w},${n},${e}););out center body;`,
	government: (s, w, n, e) =>
		`[out:json][timeout:30];(node["office"="government"](${s},${w},${n},${e});way["office"="government"](${s},${w},${n},${e}););out center body;`,
	police: (s, w, n, e) =>
		`[out:json][timeout:30];(node["amenity"="police"](${s},${w},${n},${e});way["amenity"="police"](${s},${w},${n},${e}););out center body;`,
};

export const GET: RequestHandler = async ({ url }) => {
	if (!isApiEnabled('overpass')) {
		return json({ offline: true, message: 'Overpass API disabled' });
	}

	const type = url.searchParams.get('type') as PoiType | null;
	const south = parseFloat(url.searchParams.get('south') ?? '');
	const west = parseFloat(url.searchParams.get('west') ?? '');
	const north = parseFloat(url.searchParams.get('north') ?? '');
	const east = parseFloat(url.searchParams.get('east') ?? '');

	if (!type || !QUERIES[type]) {
		return json({ error: 'Invalid type. Use: cameras, embassies, hospitals, government, police' }, { status: 400 });
	}

	if ([south, west, north, east].some(isNaN)) {
		return json({ error: 'Provide south, west, north, east bounds' }, { status: 400 });
	}

	// Limit bounding box size to prevent overloading Overpass
	const latSpan = north - south;
	const lngSpan = east - west;
	if (latSpan > 1 || lngSpan > 1) {
		return json({ error: 'Bounding box too large. Zoom in more (max ~1 degree span).' }, { status: 400 });
	}

	try {
		const query = QUERIES[type](south, west, north, east);
		const result = await proxyFetch<OverpassResponse>({
			apiId: 'overpass',
			url: 'https://overpass-api.de/api/interpreter',
			params: { data: query },
			cacheTtlSeconds: 86400,
		});

		if (!result) {
			return json({ offline: true });
		}

		const elements = (result.data?.elements ?? []).map((el) => ({
			id: el.id,
			lat: el.lat ?? el.center?.lat,
			lon: el.lon ?? el.center?.lon,
			name: el.tags?.name ?? el.tags?.['name:en'] ?? '',
			type: type,
			tags: el.tags ?? {},
		})).filter((el) => el.lat && el.lon);

		return json({ data: elements, count: elements.length });
	} catch (err) {
		return json({ error: 'Overpass query failed' }, { status: 502 });
	}
};
