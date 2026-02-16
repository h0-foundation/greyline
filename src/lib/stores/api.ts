import { writable } from 'svelte/store';

export interface ApiToggleState {
	apiId: string;
	enabled: boolean;
	useTor: boolean;
}

export const apiToggles = writable<ApiToggleState[]>([
	{ apiId: 'open-meteo', enabled: false, useTor: false },
	{ apiId: 'gdelt', enabled: false, useTor: false },
	{ apiId: 'travel-advisory', enabled: false, useTor: false },
	{ apiId: 'overpass', enabled: false, useTor: false },
	{ apiId: 'exchange-rates', enabled: false, useTor: false },
	{ apiId: 'nominatim', enabled: false, useTor: false },
	{ apiId: 'adsb', enabled: false, useTor: false },
	{ apiId: 'ip-api', enabled: false, useTor: false }
]);
