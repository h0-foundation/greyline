import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getTravelAdvisories } from '$server/api-clients/travel-advisory.js';
import { isApiEnabled } from '$server/services/api-gateway.js';

export const GET: RequestHandler = async () => {
	if (!isApiEnabled('travel-advisory')) {
		return json({ offline: true, message: 'Travel advisory API disabled' });
	}

	try {
		const data = await getTravelAdvisories();
		if (!data) {
			return json({ error: 'Travel advisory API returned no data. The upstream service may be temporarily unavailable.' }, { status: 502 });
		}
		return json({ data });
	} catch (err) {
		const msg = err instanceof Error ? err.message : String(err);
		const isSSL = msg.includes('certificate') || msg.includes('SSL') || msg.includes('CERT');
		const detail = isSSL
			? 'Travel advisory API has an SSL certificate issue. This is an upstream problem — try again later.'
			: 'Failed to fetch travel advisories. The upstream service may be temporarily unavailable.';
		return json({ error: detail }, { status: 502 });
	}
};
