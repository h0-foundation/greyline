<script lang="ts">
	import { page } from '$app/stores';

	let data = $state<any>(null);
	let loading = $state(true);

	$effect(() => {
		fetch(`/api/knowledge?code=${$page.params.code}`)
			.then((r) => r.json())
			.then((profile) => {
				if (profile.rest_countries) {
					data = JSON.parse(profile.rest_countries);
				}
				loading = false;
			})
			.catch(() => {
				loading = false;
			});
	});

	function fmt(val: unknown): string {
		if (val === null || val === undefined) return '--';
		if (typeof val === 'number') return val.toLocaleString();
		return String(val);
	}

	let languages = $derived(data?.languages ? Object.values(data.languages).join(', ') : '--');
	let currencies = $derived(
		data?.currencies
			? Object.values(data.currencies as Record<string, { name: string; symbol: string }>)
					.map((c) => `${c.name} (${c.symbol})`)
					.join(', ')
			: '--'
	);
	let drivingSide = $derived(data?.car?.side ? data.car.side.charAt(0).toUpperCase() + data.car.side.slice(1) : '--');
	let callingCode = $derived(data?.idd?.root ? `${data.idd.root}${data.idd.suffixes?.[0] ?? ''}` : '--');
	let timezones = $derived(data?.timezones?.join(', ') ?? '--');
	let borders = $derived(data?.borders?.join(', ') ?? 'None (island or isolated)');
</script>

<svelte:head>
	<title>{data?.name?.common ?? 'Country'} - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<a href="/knowledge" class="text-sm text-accent-400 hover:text-accent-300">&larr; Knowledge Base</a>
		{#if data}
			<div class="mt-2 flex items-center gap-3">
				<span class="text-4xl">{data.flag ?? ''}</span>
				<div>
					<h1 class="text-xl font-semibold text-surface-100">{data.name?.common}</h1>
					<p class="text-sm text-surface-400">
						{data.name?.official}
						{#if data.name?.nativeName}
							&middot; {(Object.values(data.name.nativeName)[0] as any)?.common ?? ''}
						{/if}
					</p>
				</div>
			</div>
		{:else}
			<h1 class="mt-2 text-xl font-semibold text-surface-100">Loading...</h1>
		{/if}
	</div>

	{#if data}
		<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
			<!-- Geography -->
			<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
				<h3 class="mb-3 text-sm font-medium uppercase tracking-wider text-surface-400">Geography</h3>
				<dl class="space-y-2">
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">Region</dt>
						<dd class="text-surface-200">{data.region} &middot; {data.subregion ?? '--'}</dd>
					</div>
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">Capital</dt>
						<dd class="text-surface-200">{data.capital?.join(', ') ?? '--'}</dd>
					</div>
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">Area</dt>
						<dd class="text-surface-200">{fmt(data.area)} km&sup2;</dd>
					</div>
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">Coordinates</dt>
						<dd class="text-surface-200">{data.latlng?.[0]?.toFixed(2)}, {data.latlng?.[1]?.toFixed(2)}</dd>
					</div>
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">Landlocked</dt>
						<dd class="text-surface-200">{data.landlocked ? 'Yes' : 'No'}</dd>
					</div>
					<div class="text-sm">
						<dt class="text-surface-400">Borders</dt>
						<dd class="mt-1 text-surface-200">{borders}</dd>
					</div>
				</dl>
			</div>

			<!-- People & Society -->
			<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
				<h3 class="mb-3 text-sm font-medium uppercase tracking-wider text-surface-400">People & Society</h3>
				<dl class="space-y-2">
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">Population</dt>
						<dd class="text-surface-200">{fmt(data.population)}</dd>
					</div>
					<div class="text-sm">
						<dt class="text-surface-400">Languages</dt>
						<dd class="mt-1 text-surface-200">{languages}</dd>
					</div>
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">Demonym</dt>
						<dd class="text-surface-200">{data.demonyms?.eng?.m ?? '--'}</dd>
					</div>
				</dl>
			</div>

			<!-- Practical Info -->
			<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
				<h3 class="mb-3 text-sm font-medium uppercase tracking-wider text-surface-400">Practical Info</h3>
				<dl class="space-y-2">
					<div class="text-sm">
						<dt class="text-surface-400">Currency</dt>
						<dd class="mt-1 text-surface-200">{currencies}</dd>
					</div>
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">Driving Side</dt>
						<dd class="text-surface-200">{drivingSide}</dd>
					</div>
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">Calling Code</dt>
						<dd class="text-surface-200">{callingCode}</dd>
					</div>
					<div class="text-sm">
						<dt class="text-surface-400">Timezones</dt>
						<dd class="mt-1 text-surface-200">{timezones}</dd>
					</div>
				</dl>
			</div>

			<!-- Identifiers -->
			<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
				<h3 class="mb-3 text-sm font-medium uppercase tracking-wider text-surface-400">Identifiers</h3>
				<dl class="space-y-2">
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">ISO Alpha-2</dt>
						<dd class="font-mono text-surface-200">{data.cca2}</dd>
					</div>
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">ISO Alpha-3</dt>
						<dd class="font-mono text-surface-200">{data.cca3}</dd>
					</div>
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">UN Member</dt>
						<dd class="text-surface-200">{data.unMember ? 'Yes' : 'No'}</dd>
					</div>
					<div class="flex justify-between text-sm">
						<dt class="text-surface-400">Independent</dt>
						<dd class="text-surface-200">{data.independent ? 'Yes' : 'No'}</dd>
					</div>
				</dl>
			</div>
		</div>

		{#if data.maps?.googleMaps}
			<div class="text-sm text-surface-500">
				Note: External map links omitted for privacy. Use the built-in Map view instead.
			</div>
		{/if}
	{:else if !loading}
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-8 text-center">
			<p class="text-surface-400">Country not found: {$page.params.code}</p>
		</div>
	{/if}
</div>
