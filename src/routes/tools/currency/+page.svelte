<script lang="ts">
	import { onMount } from 'svelte';

	const COMMON_CURRENCIES = ['USD', 'EUR', 'GBP', 'JPY', 'CHF', 'AUD', 'CAD', 'CNY', 'HKD', 'SGD'];

	let fromCurrency = $state('USD');
	let toCurrency = $state('EUR');
	let amount = $state(1);
	let rateFilter = $state('');

	let rates: Record<string, number> | null = $state(null);
	let loading = $state(false);
	let offline = $state(false);
	let errorMsg = $state('');
	let freshness: 'live' | 'cached' | 'offline' = $state('live');
	let lastFetchedBase = $state('');

	const allCurrencies: string[] = $derived(
		rates ? Object.keys(rates).map((c) => c.toUpperCase()).sort() : COMMON_CURRENCIES
	);

	const convertedAmount = $derived.by(() => {
		if (!rates || !amount) return null;
		const toKey = toCurrency.toLowerCase();
		const rate = rates[toKey];
		if (rate == null) return null;
		return amount * rate;
	});

	const filteredRates = $derived.by((): [string, number][] => {
		if (!rates) return [];
		const search = rateFilter.toLowerCase();
		return Object.entries(rates)
			.filter(([key]) => key.toLowerCase().includes(search))
			.sort(([a], [b]) => a.localeCompare(b));
	});

	async function fetchRates(base: string) {
		loading = true;
		errorMsg = '';
		try {
			const res = await fetch(`/api/currency?base=${encodeURIComponent(base.toLowerCase())}`);
			const json = await res.json();

			if (json.offline) {
				offline = true;
				freshness = 'offline';
				rates = null;
				return;
			}

			if (json.error) {
				errorMsg = json.error;
				return;
			}

			offline = false;

			// The API returns { data: { date: "...", [base]: { ...rates } } }
			// Extract the rates object from the nested structure
			const payload = json.data;
			if (payload) {
				const baseKey = base.toLowerCase();
				if (payload[baseKey] && typeof payload[baseKey] === 'object') {
					rates = payload[baseKey] as Record<string, number>;
				} else {
					// Fallback: maybe the data is already flat rates
					rates = payload as Record<string, number>;
				}
				freshness = 'live';
			}
			lastFetchedBase = base.toUpperCase();
		} catch {
			errorMsg = 'Failed to fetch exchange rates';
		} finally {
			loading = false;
		}
	}

	function handleFromChange() {
		if (fromCurrency && fromCurrency.toUpperCase() !== lastFetchedBase) {
			fetchRates(fromCurrency);
		}
	}

	function swapCurrencies() {
		const tmp = fromCurrency;
		fromCurrency = toCurrency;
		toCurrency = tmp;
		fetchRates(fromCurrency);
	}

	function formatRate(value: number): string {
		if (value >= 1000) return value.toFixed(2);
		if (value >= 1) return value.toFixed(4);
		return value.toFixed(6);
	}

	onMount(() => {
		fetchRates(fromCurrency);
	});
</script>

<svelte:head>
	<title>Currency Converter - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<a href="/tools" class="text-sm text-accent-400 hover:text-accent-300">&larr; Tools</a>
		<div class="mt-2 flex items-center gap-3">
			<h1 class="text-xl font-semibold text-surface-100">Currency Converter</h1>
			{#if freshness === 'live'}
				<span class="rounded-full bg-green-900/40 px-2.5 py-0.5 text-xs font-medium text-green-400">Live</span>
			{:else if freshness === 'cached'}
				<span class="rounded-full bg-amber-900/40 px-2.5 py-0.5 text-xs font-medium text-amber-400">Cached</span>
			{:else}
				<span class="rounded-full bg-red-900/40 px-2.5 py-0.5 text-xs font-medium text-red-400">Offline</span>
			{/if}
		</div>
		<p class="mt-1 text-sm text-surface-400">Real-time currency exchange rates</p>
	</div>

	<!-- Offline banner -->
	{#if offline}
		<div class="rounded-lg border border-red-900/50 bg-red-950/30 p-4">
			<p class="text-sm text-red-300">
				Currency API is currently disabled. Enable the <strong>exchange-rates</strong> API in Settings to use this tool.
			</p>
		</div>
	{/if}

	<!-- Error banner -->
	{#if errorMsg}
		<div class="rounded-lg border border-red-900/50 bg-red-950/30 p-4">
			<p class="text-sm text-red-300">{errorMsg}</p>
		</div>
	{/if}

	<!-- Converter card -->
	<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-6">
		<div class="grid grid-cols-1 gap-4 sm:grid-cols-[1fr_auto_1fr]">
			<!-- From -->
			<div class="space-y-2">
				<label for="from-currency" class="block text-sm font-medium text-surface-300">From</label>
				<input
					id="from-currency"
					type="text"
					bind:value={fromCurrency}
					onblur={handleFromChange}
					onkeydown={(e) => { if (e.key === 'Enter') handleFromChange(); }}
					placeholder="USD"
					list="from-currencies"
					class="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 placeholder-surface-600 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
				/>
				<datalist id="from-currencies">
					{#each allCurrencies as c}
						<option value={c}></option>
					{/each}
				</datalist>
			</div>

			<!-- Swap button -->
			<div class="flex items-end justify-center pb-1">
				<button
					onclick={swapCurrencies}
					class="rounded-lg border border-surface-700 p-2 text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200"
					title="Swap currencies"
					disabled={loading}
				>
					<svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						<path d="M7 16V4m0 0L3 8m4-4l4 4M17 8v12m0 0l4-4m-4 4l-4-4" />
					</svg>
				</button>
			</div>

			<!-- To -->
			<div class="space-y-2">
				<label for="to-currency" class="block text-sm font-medium text-surface-300">To</label>
				<input
					id="to-currency"
					type="text"
					bind:value={toCurrency}
					placeholder="EUR"
					list="to-currencies"
					class="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 placeholder-surface-600 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
				/>
				<datalist id="to-currencies">
					{#each allCurrencies as c}
						<option value={c}></option>
					{/each}
				</datalist>
			</div>
		</div>

		<!-- Amount input -->
		<div class="mt-4 space-y-2">
			<label for="amount" class="block text-sm font-medium text-surface-300">Amount</label>
			<input
				id="amount"
				type="number"
				bind:value={amount}
				min="0"
				step="any"
				placeholder="1.00"
				class="w-full rounded-lg border border-surface-700 bg-surface-950 px-3 py-2 text-sm text-surface-100 placeholder-surface-600 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600 sm:max-w-xs"
			/>
		</div>

		<!-- Result -->
		<div class="mt-6 rounded-lg bg-surface-950 p-5">
			{#if loading}
				<p class="text-center text-surface-500">Loading rates...</p>
			{:else if offline}
				<p class="text-center text-surface-500">Rates unavailable while offline</p>
			{:else if convertedAmount != null}
				<div class="text-center">
					<p class="text-sm text-surface-400">
						{amount}
						{fromCurrency.toUpperCase()} =
					</p>
					<p class="mt-1 text-3xl font-bold text-surface-100">
						{formatRate(convertedAmount)}
						<span class="text-xl font-normal text-surface-300">{toCurrency.toUpperCase()}</span>
					</p>
					{#if rates}
						{@const rate = rates[toCurrency.toLowerCase()]}
						{#if rate != null}
							<p class="mt-2 text-xs text-surface-500">
								1 {fromCurrency.toUpperCase()} = {formatRate(rate)} {toCurrency.toUpperCase()}
							</p>
						{/if}
					{/if}
				</div>
			{:else if rates}
				<p class="text-center text-sm text-surface-500">
					Select a valid target currency
				</p>
			{/if}
		</div>
	</div>

	<!-- All rates table -->
	{#if rates && !offline}
		<div class="space-y-3">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-medium text-surface-200">
					All Rates
					<span class="text-sm font-normal text-surface-500">
						(base: {lastFetchedBase})
					</span>
				</h2>
				<div>
					<input
						type="text"
						bind:value={rateFilter}
						placeholder="Filter currencies..."
						class="rounded-lg border border-surface-700 bg-surface-950 px-3 py-1.5 text-sm text-surface-100 placeholder-surface-600 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
					/>
				</div>
			</div>
			<div class="max-h-96 overflow-y-auto rounded-lg border border-surface-800">
				<table class="w-full text-left text-sm">
					<thead class="sticky top-0 border-b border-surface-700/50 bg-surface-800">
						<tr>
							<th class="px-4 py-3 font-medium text-surface-300">Currency</th>
							<th class="px-4 py-3 text-right font-medium text-surface-300">Rate</th>
							<th class="px-4 py-3 text-right font-medium text-surface-300">Inverse</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-800">
						{#each filteredRates as [code, rate]}
							<tr
								class="bg-surface-950 transition-colors hover:bg-surface-900 {code === toCurrency.toLowerCase() ? 'ring-1 ring-inset ring-accent-700' : ''}"
							>
								<td class="px-4 py-2.5">
									<button
										onclick={() => { toCurrency = code.toUpperCase(); }}
										class="font-mono text-surface-200 hover:text-accent-400"
									>
										{code.toUpperCase()}
									</button>
								</td>
								<td class="px-4 py-2.5 text-right font-mono text-surface-300">{formatRate(rate)}</td>
								<td class="px-4 py-2.5 text-right font-mono text-surface-500">
									{rate > 0 ? formatRate(1 / rate) : '--'}
								</td>
							</tr>
						{/each}
						{#if filteredRates.length === 0}
							<tr>
								<td colspan="3" class="px-4 py-6 text-center text-surface-500">
									No currencies match "{rateFilter}"
								</td>
							</tr>
						{/if}
					</tbody>
				</table>
			</div>
			<p class="text-xs text-surface-600">
				{filteredRates.length} of {Object.keys(rates).length} currencies shown
			</p>
		</div>
	{/if}
</div>
