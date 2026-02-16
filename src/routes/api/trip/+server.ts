import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getAllTrips, createTrip } from '$server/db/repositories/trip.js';

export const GET: RequestHandler = async () => {
	const trips = getAllTrips();
	return json(trips);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	if (!body.name) {
		return json({ error: 'Name is required' }, { status: 400 });
	}
	const trip = createTrip(body);
	return json(trip, { status: 201 });
};
