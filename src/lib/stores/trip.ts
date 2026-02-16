import { writable } from 'svelte/store';
import type { Trip, Destination } from '$lib/types/trip.js';

export const trips = writable<Trip[]>([]);
export const activeTrip = writable<Trip | null>(null);
export const activeTripDestinations = writable<Destination[]>([]);
