import { writable } from 'svelte/store';

export interface MapViewState {
	center: [number, number];
	zoom: number;
	bearing: number;
	pitch: number;
}

export const mapView = writable<MapViewState>({
	center: [0, 20],
	zoom: 2,
	bearing: 0,
	pitch: 0
});

export const mapLayers = writable<Record<string, boolean>>({
	cameras: false,
	embassies: false,
	hospitals: false,
	routes: true,
	rallyPoints: true
});
