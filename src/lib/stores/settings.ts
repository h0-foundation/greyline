import { writable } from 'svelte/store';

export interface AppSettings {
	theme: 'dark' | 'light';
	units: 'metric' | 'imperial';
	defaultMapRegion: string;
	masterOffline: boolean;
}

export const settings = writable<AppSettings>({
	theme: 'dark',
	units: 'metric',
	defaultMapRegion: 'world',
	masterOffline: false
});
