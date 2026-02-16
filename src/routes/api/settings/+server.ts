import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getAllSettings, setSetting, getApiToggles, setApiToggle } from '$server/db/repositories/settings.js';
import { clearCache } from '$server/services/api-gateway.js';

export const GET: RequestHandler = async () => {
	const settings = getAllSettings();
	const apiToggles = getApiToggles();
	return json({ settings, apiToggles });
};

export const PUT: RequestHandler = async ({ request }) => {
	const body = await request.json();
	if (body.key && body.value !== undefined) {
		setSetting(body.key, typeof body.value === 'string' ? body.value : JSON.stringify(body.value));
	}
	if (body.apiId !== undefined && body.enabled !== undefined) {
		setApiToggle(body.apiId, body.enabled, body.useTor ?? false);
	}
	return json({ ok: true });
};

export const POST: RequestHandler = async ({ request }) => {
	const body = await request.json();
	if (body.action === 'clear-cache') {
		clearCache(body.apiId);
		return json({ ok: true, message: 'Cache cleared' });
	}
	return json({ error: 'Unknown action' }, { status: 400 });
};
