export interface BoundingBox {
	south: number;
	west: number;
	north: number;
	east: number;
}

export function getBoundingBox(lat: number, lng: number, radiusKm: number): BoundingBox {
	const latDelta = radiusKm / 111.32;
	const lngDelta = radiusKm / (111.32 * Math.cos((lat * Math.PI) / 180));
	return {
		south: lat - latDelta,
		west: lng - lngDelta,
		north: lat + latDelta,
		east: lng + lngDelta
	};
}

export function haversineDistance(lat1: number, lng1: number, lat2: number, lng2: number): number {
	const R = 6371000;
	const dLat = ((lat2 - lat1) * Math.PI) / 180;
	const dLng = ((lng2 - lng1) * Math.PI) / 180;
	const a =
		Math.sin(dLat / 2) ** 2 +
		Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
	return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}
