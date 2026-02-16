import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getTripById, updateTrip, deleteTrip, getDestinationsByTrip } from '$server/db/repositories/trip.js';

export const GET: RequestHandler = async ({ params }) => {
	const trip = getTripById(params.id);
	if (!trip) {
		return json({ error: 'Trip not found' }, { status: 404 });
	}
	const destinations = getDestinationsByTrip(params.id);
	return json({ ...trip, destinations });
};

export const PUT: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const trip = updateTrip(params.id, body);
	if (!trip) {
		return json({ error: 'Trip not found' }, { status: 404 });
	}
	return json(trip);
};

export const DELETE: RequestHandler = async ({ params }) => {
	deleteTrip(params.id);
	return json({ ok: true });
};
