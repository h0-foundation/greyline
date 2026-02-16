export function formatDate(date: string | Date): string {
	const d = typeof date === 'string' ? new Date(date) : date;
	return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
}

export function formatDistance(meters: number, units: 'metric' | 'imperial' = 'metric'): string {
	if (units === 'imperial') {
		const miles = meters / 1609.34;
		return miles < 1 ? `${Math.round(meters * 3.281)} ft` : `${miles.toFixed(1)} mi`;
	}
	return meters < 1000 ? `${Math.round(meters)} m` : `${(meters / 1000).toFixed(1)} km`;
}

export function formatDuration(seconds: number): string {
	const h = Math.floor(seconds / 3600);
	const m = Math.floor((seconds % 3600) / 60);
	if (h > 0) return `${h}h ${m}m`;
	return `${m}m`;
}

export function formatFileSize(bytes: number): string {
	if (bytes < 1024) return `${bytes} B`;
	if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
	return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export function formatTemperature(celsius: number, units: 'metric' | 'imperial' = 'metric'): string {
	if (units === 'imperial') return `${Math.round(celsius * 9 / 5 + 32)}°F`;
	return `${Math.round(celsius)}°C`;
}
