import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { isApiEnabled, proxyFetch } from '$server/services/api-gateway.js';

export const POST: RequestHandler = async ({ request }) => {
	const { apiId, url, params, cacheTtlSeconds } = await request.json();

	if (!apiId || !url) {
		return json({ error: 'apiId and url are required' }, { status: 400 });
	}

	if (!isApiEnabled(apiId)) {
		return json({ error: `API "${apiId}" is disabled`, disabled: true }, { status: 403 });
	}

	try {
		const result = await proxyFetch({ apiId, url, params, cacheTtlSeconds });
		return json(result);
	} catch (err) {
		const message = err instanceof Error ? err.message : 'Unknown error';
		return json({ error: message }, { status: 502 });
	}
};
