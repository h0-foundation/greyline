import { json } from '@sveltejs/kit';
import type { RequestHandler } from './$types.js';
import { getExchangeRates } from '$server/api-clients/exchange-rates.js';
import { isApiEnabled } from '$server/services/api-gateway.js';

export const GET: RequestHandler = async ({ url }) => {
	const base = url.searchParams.get('base') || url.searchParams.get('from') || 'usd';
	const to = url.searchParams.get('to');
	const amountStr = url.searchParams.get('amount');

	if (!isApiEnabled('exchange-rates')) {
		return json({ offline: true, message: 'Currency API disabled' });
	}

	try {
		const data = await getExchangeRates(base);
		if (!data) {
			return json({ error: 'No rate data available' }, { status: 502 });
		}

		// If conversion requested (from/to/amount)
		if (to && amountStr) {
			const amount = parseFloat(amountStr);
			if (isNaN(amount)) {
				return json({ error: 'Invalid amount' }, { status: 400 });
			}

			// The API returns { [base]: { [currency]: rate } }
			const rates = data[base.toLowerCase()] as Record<string, number> | undefined;
			if (!rates) {
				return json({ error: `No rates for ${base}` }, { status: 404 });
			}

			const rate = rates[to.toLowerCase()];
			if (rate === undefined) {
				return json({ error: `No rate for ${to}` }, { status: 404 });
			}

			return json({
				from: base.toUpperCase(),
				to: to.toUpperCase(),
				amount,
				rate,
				result: amount * rate
			});
		}

		return json({ data });
	} catch {
		return json({ error: 'Failed to fetch exchange rates' }, { status: 502 });
	}
};
