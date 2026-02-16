<script lang="ts">
	interface ApiEntry {
		id: string;
		name: string;
		desc: string;
		enabled: boolean;
	}

	let apis = $state<ApiEntry[]>([
		{ id: 'open-meteo', name: 'Open-Meteo', desc: 'Weather forecasts and elevation data', enabled: false },
		{ id: 'gdelt', name: 'GDELT', desc: 'Global news and events feed', enabled: false },
		{ id: 'travel-advisory', name: 'Travel Advisory', desc: 'Country risk scores', enabled: false },
		{ id: 'overpass', name: 'Overpass (OSM)', desc: 'Surveillance camera locations', enabled: false },
		{ id: 'exchange-rates', name: 'Exchange Rates', desc: 'Currency conversion rates', enabled: false },
		{ id: 'nominatim', name: 'Nominatim', desc: 'Geocoding and address search', enabled: false },
		{ id: 'adsb', name: 'ADSB.lol', desc: 'Flight tracking data', enabled: false },
		{ id: 'ip-api', name: 'IP-API', desc: 'IP geolocation check', enabled: false }
	]);

	let masterOffline = $state(false);
	let loading = $state(true);

	$effect(() => {
		fetch('/api/settings')
			.then((r) => r.json())
			.then((data) => {
				if (data.settings?.master_offline) {
					masterOffline = data.settings.master_offline === 'true';
				}
				if (data.apiToggles) {
					for (const toggle of data.apiToggles) {
						const api = apis.find((a) => a.id === toggle.api_id);
						if (api) api.enabled = toggle.enabled;
					}
				}
				loading = false;
			});
	});

	async function toggleApi(apiId: string, enabled: boolean) {
		await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ apiId, enabled })
		});
	}

	async function toggleMasterOffline() {
		masterOffline = !masterOffline;
		await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ key: 'master_offline', value: String(masterOffline) })
		});
	}

	let enabledCount = $derived(apis.filter((a) => a.enabled).length);
</script>

<svelte:head>
	<title>API Toggles - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<a href="/settings" class="text-sm text-accent-400 hover:text-accent-300">&larr; Settings</a>
		<h1 class="mt-2 text-xl font-semibold text-surface-100">API Toggles</h1>
		<p class="mt-1 text-xs text-surface-400">
			Control which external APIs are allowed to make requests.
			{enabledCount} of {apis.length} enabled.
		</p>
	</div>

	<!-- Master toggle -->
	<div
		class="rounded-lg border p-5 {masterOffline
			? 'border-red-700/50 bg-red-900/10'
			: 'border-amber-700/50 bg-amber-900/10'}"
	>
		<div class="flex items-center justify-between">
			<div>
				<h3 class="font-medium {masterOffline ? 'text-red-200' : 'text-amber-200'}">
					Master Offline Mode
				</h3>
				<p class="text-sm {masterOffline ? 'text-red-200/60' : 'text-amber-200/60'}">
					{masterOffline ? 'All external connections blocked' : 'External APIs available per toggle'}
				</p>
			</div>
			<button
				onclick={toggleMasterOffline}
				class="rounded-lg px-4 py-2 text-sm font-medium {masterOffline
					? 'bg-red-700 text-white hover:bg-red-600'
					: 'bg-surface-800 text-surface-300 hover:bg-surface-700'}"
			>
				{masterOffline ? 'Go Online' : 'Go Offline'}
			</button>
		</div>
	</div>

	<!-- Individual toggles -->
	<div class="space-y-3">
		{#each apis as api}
			<div
				class="rounded-lg border border-surface-700/50 bg-surface-800 p-4 transition-opacity {masterOffline
					? 'opacity-50'
					: ''}"
			>
				<div class="flex items-center justify-between">
					<div>
						<h3 class="text-sm font-medium text-surface-200">{api.name}</h3>
						<p class="text-xs text-surface-500">{api.desc}</p>
					</div>
					<button
						type="button"
						role="switch"
						aria-checked={api.enabled}
						disabled={masterOffline}
						class="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors {api.enabled && !masterOffline
							? 'bg-accent-300'
							: 'bg-surface-700'}"
						onclick={() => {
							api.enabled = !api.enabled;
							toggleApi(api.id, api.enabled);
						}}
					>
						<span
							class="pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform {api.enabled
								? 'translate-x-[22px]'
								: 'translate-x-0.5'}"
						></span>
					</button>
				</div>
			</div>
		{/each}
	</div>

	<p class="text-xs text-surface-500">
		All API calls are proxied through the local gateway. Headers are stripped for privacy. No API
		keys required.
	</p>
</div>
