<script lang="ts">
	let countryCount = $state(0);
	let countryLoading = $state(false);
	let cacheClearing = $state(false);
	let message = $state('');

	$effect(() => {
		fetch('/api/knowledge')
			.then((r) => r.json())
			.then((profiles: any[]) => {
				countryCount = profiles.length;
			})
			.catch(() => {});
	});

	async function downloadCountries() {
		countryLoading = true;
		message = '';
		try {
			const res = await fetch('/api/knowledge', { method: 'POST' });
			const data = await res.json();
			if (data.error) {
				message = `Error: ${data.error}`;
			} else {
				countryCount = data.count ?? countryCount;
				message = `Downloaded ${data.count ?? 0} country profiles`;
			}
		} catch {
			message = 'Download failed. Check the console for details.';
		}
		countryLoading = false;
	}

	async function clearCache() {
		cacheClearing = true;
		try {
			await fetch('/api/settings', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ action: 'clear-cache' })
			});
			message = 'API cache cleared';
		} catch {
			message = 'Failed to clear cache';
		}
		cacheClearing = false;
	}

	interface BundleItem {
		name: string;
		desc: string;
		size: string;
		status: 'available' | 'loaded' | 'coming-soon';
		action?: () => void;
		loading?: boolean;
	}

	let bundles = $derived<BundleItem[]>([
		{
			name: 'Country Data',
			desc: 'REST Countries API (250+ countries)',
			size: '~3 MB',
			status: countryCount > 0 ? 'loaded' : 'available',
			action: downloadCountries,
			loading: countryLoading
		},
		{
			name: 'Cultural Data',
			desc: 'Wikivoyage parsed destination guides',
			size: '~80 MB',
			status: 'coming-soon'
		},
		{
			name: 'Map Tiles',
			desc: 'PMTiles vector tiles by region',
			size: 'Variable',
			status: 'coming-soon'
		},
		{
			name: 'Currency Rates',
			desc: 'Exchange rates for offline conversion',
			size: '~50 KB',
			status: 'coming-soon'
		},
		{
			name: 'Surveillance Data',
			desc: 'Cached Overpass camera locations',
			size: 'Variable',
			status: 'coming-soon'
		}
	]);
</script>

<svelte:head>
	<title>Data Management - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<a href="/settings" class="text-sm text-accent-400 hover:text-accent-300">&larr; Settings</a>
		<h1 class="mt-2 text-xl font-semibold text-surface-100">Data Management</h1>
		<p class="mt-1 text-sm text-surface-400">Download and manage offline data bundles</p>
	</div>

	{#if message}
		<div class="rounded-lg border border-surface-700 bg-surface-800 px-4 py-3 text-sm text-surface-300">
			{message}
			<button class="ml-2 text-surface-500 hover:text-surface-300" onclick={() => (message = '')}>Dismiss</button>
		</div>
	{/if}

	<div class="space-y-3">
		{#each bundles as bundle}
			<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
				<div class="flex items-center justify-between">
					<div>
						<div class="flex items-center gap-2">
							<h3 class="font-medium text-surface-200">{bundle.name}</h3>
							{#if bundle.status === 'loaded'}
								<span class="rounded bg-green-900/30 px-1.5 py-0.5 text-xs text-green-400">Loaded</span>
							{:else if bundle.status === 'coming-soon'}
								<span class="rounded bg-surface-800 px-1.5 py-0.5 text-xs text-surface-500">Phase 2</span>
							{/if}
						</div>
						<p class="text-sm text-surface-400">{bundle.desc}</p>
						<p class="mt-1 text-xs text-surface-500">
							Size: {bundle.size}
							{#if bundle.status === 'loaded' && bundle.name === 'Country Data'}
								&middot; {countryCount} profiles loaded
							{/if}
						</p>
					</div>
					{#if bundle.action}
						<button
							onclick={bundle.action}
							disabled={bundle.loading}
							class="rounded-lg border border-surface-700 px-4 py-2 text-sm text-surface-300 hover:bg-surface-800 disabled:opacity-50"
						>
							{bundle.loading ? 'Downloading...' : bundle.status === 'loaded' ? 'Re-download' : 'Download'}
						</button>
					{:else}
						<span class="text-xs text-surface-600">Coming soon</span>
					{/if}
				</div>
			</div>
		{/each}
	</div>

	<!-- Cache Management -->
	<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
		<div class="flex items-center justify-between">
			<div>
				<h3 class="font-medium text-surface-200">API Cache</h3>
				<p class="text-sm text-surface-400">Cached responses from external APIs</p>
			</div>
			<button
				onclick={clearCache}
				disabled={cacheClearing}
				class="rounded-lg border border-red-800/50 px-4 py-2 text-sm text-red-400 hover:bg-red-900/20 disabled:opacity-50"
			>
				{cacheClearing ? 'Clearing...' : 'Clear Cache'}
			</button>
		</div>
	</div>
</div>
