<script lang="ts">
	interface CountryEntry {
		country_code: string;
		name: string;
		region: string;
		flag: string;
	}

	let countries = $state<CountryEntry[]>([]);
	let query = $state('');
	let loading = $state(true);

	$effect(() => {
		fetch('/api/knowledge?view=summaries')
			.then((r) => r.json())
			.then((list: CountryEntry[]) => {
				countries = list.sort((a, b) => a.name.localeCompare(b.name));
				loading = false;
			})
			.catch(() => {
				loading = false;
			});
	});

	let filtered = $derived(
		query.length === 0
			? countries
			: countries.filter(
					(c) =>
						c.name.toLowerCase().includes(query.toLowerCase()) ||
						c.country_code.toLowerCase().includes(query.toLowerCase())
				)
	);

	let regions = $derived([...new Set(countries.map((c) => c.region))].sort());
	let selectedRegion = $state('');

	let displayed = $derived(
		selectedRegion ? filtered.filter((c) => c.region === selectedRegion) : filtered
	);
</script>

<svelte:head>
	<title>Knowledge Base - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-xl font-semibold text-surface-100">Knowledge Base</h1>
		<p class="mt-1 text-sm text-surface-400">
			{countries.length > 0 ? `${countries.length} country profiles` : 'Country profiles and intelligence'}
		</p>
	</div>

	{#if countries.length > 0}
		<!-- Search and filter -->
		<div class="flex gap-3">
			<input
				type="text"
				bind:value={query}
				placeholder="Search countries..."
				class="flex-1 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-sm text-surface-200 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
			/>
			<select
				bind:value={selectedRegion}
				class="rounded-lg border border-surface-700 bg-surface-800 px-3 py-2.5 text-sm text-surface-200 focus:border-accent-500 focus:outline-none"
			>
				<option value="">All regions</option>
				{#each regions as region}
					<option value={region}>{region}</option>
				{/each}
			</select>
		</div>

		<p class="text-xs text-surface-500">{displayed.length} countries shown</p>

		<!-- Country grid -->
		<div class="grid grid-cols-1 gap-2 sm:grid-cols-2 lg:grid-cols-3">
			{#each displayed as country}
				<a
					href="/knowledge/country/{country.country_code}"
					class="flex items-center gap-3 rounded-lg border border-surface-700/50 bg-surface-800 px-4 py-3 transition-colors hover:border-surface-700"
				>
					<span class="text-2xl">{country.flag}</span>
					<div class="min-w-0 flex-1">
						<p class="truncate text-sm font-medium text-surface-200">{country.name}</p>
						<p class="text-xs text-surface-500">{country.country_code} &middot; {country.region}</p>
					</div>
				</a>
			{/each}
		</div>
	{:else if loading}
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-12 text-center">
			<p class="text-surface-400">Loading country data...</p>
		</div>
	{:else}
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-12 text-center">
			<p class="text-surface-400">No country data loaded</p>
			<p class="mt-2 text-sm text-surface-500">
				Download country profiles:
			</p>
			<code class="mt-2 inline-block rounded bg-surface-800 px-3 py-1.5 text-sm text-surface-300">
				pnpm build:countries
			</code>
		</div>
	{/if}
</div>
