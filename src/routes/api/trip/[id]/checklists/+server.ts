import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import {
	getChecklistsByTrip,
	getChecklistsByDestination,
	getChecklistById,
	createChecklist,
	updateChecklistItems,
	deleteChecklist,
} from '$server/db/repositories/checklist.js';
import { regenerateChecklistsForDestination } from '$server/services/trip-automation.js';
import { getDestinationsByTrip } from '$server/db/repositories/trip.js';

export const GET: RequestHandler = async ({ params, url }) => {
	const destinationId = url.searchParams.get('destination_id');
	if (destinationId) {
		return json(getChecklistsByDestination(destinationId));
	}
	return json(getChecklistsByTrip(params.id));
};

export const POST: RequestHandler = async ({ params, request }) => {
	const body = await request.json();

	// Special action: regenerate all checklists for a destination
	if (body.action === 'regenerate' && body.destination_id) {
		const destinations = getDestinationsByTrip(params.id) as Array<{ id: string; country_code: string | null }>;
		const dest = destinations.find((d) => d.id === body.destination_id);
		if (!dest) {
			return json({ error: 'Destination not found' }, { status: 404 });
		}
		regenerateChecklistsForDestination(params.id, dest.id, dest.country_code);
		const checklists = getChecklistsByDestination(dest.id);
		return json(checklists);
	}

	// Create a custom checklist
	const checklist = createChecklist({
		trip_id: params.id,
		destination_id: body.destination_id ?? undefined,
		type: body.type ?? 'custom',
		name: body.name ?? 'Custom Checklist',
		items: body.items ?? [],
	});
	return json(checklist, { status: 201 });
};

export const PUT: RequestHandler = async ({ request }) => {
	const { id, items } = await request.json();
	if (!id || !items) {
		return json({ error: 'id and items are required' }, { status: 400 });
	}
	const updated = updateChecklistItems(id, items);
	if (!updated) {
		return json({ error: 'Checklist not found' }, { status: 404 });
	}
	return json(updated);
};

export const DELETE: RequestHandler = async ({ request }) => {
	const { id } = await request.json();
	if (!id) {
		return json({ error: 'id is required' }, { status: 400 });
	}
	deleteChecklist(id);
	return json({ ok: true });
};
