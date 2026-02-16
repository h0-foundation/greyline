export function isValidCountryCode(code: string): boolean {
	return /^[A-Z]{2}$/.test(code);
}

export function isValidCoordinate(lat: number, lng: number): boolean {
	return lat >= -90 && lat <= 90 && lng >= -180 && lng <= 180;
}

export function isValidDate(date: string): boolean {
	const d = new Date(date);
	return !isNaN(d.getTime());
}

export function isValidUuid(id: string): boolean {
	return /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(id);
}
