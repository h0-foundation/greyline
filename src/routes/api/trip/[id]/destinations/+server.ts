import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
	getDestinationsByTrip,
	createDestination,
	updateDestination,
	deleteDestination
} from '$server/db/repositories/trip.js';
import { generateAllChecklistsForDestination } from '$server/services/trip-automation.js';
import { deleteChecklistsByDestination } from '$server/db/repositories/checklist.js';

export const GET: RequestHandler = async ({ params }) => {
	const destinations = getDestinationsByTrip(params.id);
	return json(destinations);
};

export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json();
	const dest = createDestination(params.id, body) as { id: string; country_code: string | null };

	// Auto-generate checklists for the new destination
	try {
		generateAllChecklistsForDestination(params.id, dest.id, dest.country_code);
	} catch {
		// Non-fatal — don't block destination creation
	}

	return json(dest, { status: 201 });
};

export const PUT: RequestHandler = async ({ request }) => {
	const { id, ...fields } = await request.json();
	if (!id) {
		return json({ error: 'Destination id is required' }, { status: 400 });
	}
	const dest = updateDestination(id, fields);
	return json(dest);
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id } = await request.json();
	// Clean up associated checklists before deleting destination
	deleteChecklistsByDestination(id);
	deleteDestination(id);
	return json({ ok: true });
};
