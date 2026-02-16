import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getDb } from '$server/db/index.js';

export const GET: RequestHandler = async () => {
	const db = getDb();
	const logs = db
		.prepare('SELECT * FROM counter_surveillance_log ORDER BY timestamp DESC LIMIT 50')
		.all();
	return json(logs);
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	const db = getDb();
	const { v4: uuid } = await import('uuid');
	const id = uuid();

	db.prepare(
		`INSERT INTO counter_surveillance_log (id, lat, lng, description, person_desc, vehicle_desc, threat_level, tags)
		 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
	).run(
		id,
		body.lat ?? null,
		body.lng ?? null,
		body.description ?? null,
		body.person_desc ?? null,
		body.vehicle_desc ?? null,
		body.threat_level ?? 'low',
		JSON.stringify(body.tags ?? [])
	);

	return json({ id }, { status: 201 });
};
