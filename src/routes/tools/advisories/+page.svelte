<script lang="ts">
	interface Advisory {
		iso_alpha2: string;
		name: string;
		continent: string;
		advisory: {
			score: number;
			sources_active: number;
			message: string;
			updated: string;
			source: string;
		};
	}

	function riskLevel(score: number): { label: string; color: string } {
		if (score <= 1.5) return { label: 'Low', color: 'text-green-400' };
		if (score <= 2.5) return { label: 'Medium', color: 'text-yellow-400' };
		if (score <= 3.5) return { label: 'High', color: 'text-amber-400' };
		return { label: 'Critical', color: 'text-red-400' };
	}

	function freshness(updated: string): { label: string; color: string } {
		const diff = Date.now() - new Date(updated).getTime();
		const hours = diff / (1000 * 60 * 60);
		if (hours < 24) return { label: 'Fresh', color: 'text-green-400' };
		if (hours < 72) return { label: 'Recent', color: 'text-yellow-400' };
		return { label: 'Stale', color: 'text-red-400' };
	}

	let advisories = $state<Advisory[]>([]);
	let loading = $state(true);
	let offline = $state(false);
	let errorMsg = $state('');
	let query = $state('');
	let sortKey = $state<'name' | 'score' | 'sources' | 'updated'>('score');
	let sortAsc = $state(false);

	$effect(() => {
		fetch('/api/advisories')
			.then((r) => r.json())
			.then((res) => {
				if (res.offline) {
					offline = true;
				} else if (res.error) {
					errorMsg = res.error;
				} else if (res.data) {
					const raw = res.data as Record<string, Advisory> | null;
					if (raw) {
						advisories = Object.values(raw);
					}
				}
				loading = false;
			})
			.catch(() => {
				errorMsg = 'Failed to connect to advisories API';
				loading = false;
			});
	});

	let filtered = $derived(
		query.length === 0
			? advisories
			: advisories.filter((a) =>
					a.name.toLowerCase().includes(query.toLowerCase()) ||
					a.iso_alpha2.toLowerCase().includes(query.toLowerCase())
				)
	);

	let sorted = $derived(
		[...filtered].sort((a, b) => {
			let cmp = 0;
			if (sortKey === 'name') cmp = a.name.localeCompare(b.name);
			else if (sortKey === 'score') cmp = a.advisory.score - b.advisory.score;
			else if (sortKey === 'sources') cmp = a.advisory.sources_active - b.advisory.sources_active;
			else if (sortKey === 'updated') cmp = new Date(a.advisory.updated).getTime() - new Date(b.advisory.updated).getTime();
			return sortAsc ? cmp : -cmp;
		})
	);

	function toggleSort(key: typeof sortKey) {
		if (sortKey === key) {
			sortAsc = !sortAsc;
		} else {
			sortKey = key;
			sortAsc = key === 'name';
		}
	}

	function sortIndicator(key: typeof sortKey): string {
		if (sortKey !== key) return '';
		return sortAsc ? ' \u2191' : ' \u2193';
	}
</script>

<svelte:head>
	<title>Travel Advisories - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<a href="/tools" class="text-sm text-accent-400 hover:text-accent-300">&larr; Tools</a>
		<h1 class="mt-2 text-xl font-semibold text-surface-100">Travel Advisories</h1>
		<p class="mt-1 text-sm text-surface-400">
			{#if advisories.length > 0}
				{advisories.length} countries &middot; Risk scores from aggregated sources
			{:else}
				Country risk scores from aggregated advisory sources
			{/if}
		</p>
	</div>

	{#if loading}
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-12 text-center">
			<p class="text-surface-400">Loading travel advisories...</p>
		</div>
	{:else if offline}
		<div class="rounded-lg border border-amber-700/50 bg-amber-900/10 p-8 text-center">
			<p class="text-amber-200">Travel Advisory API is offline</p>
			<p class="mt-2 text-sm text-amber-200/60">
				Enable the Travel Advisory API in
				<a href="/settings/api" class="underline hover:text-amber-100">Settings &rarr; API Toggles</a>
				to view live data.
			</p>
		</div>
	{:else if errorMsg}
		<div class="rounded-lg border border-red-700/50 bg-red-900/10 p-8 text-center">
			<p class="text-red-200">{errorMsg}</p>
			<p class="mt-2 text-sm text-red-200/60">Check your network connection and API settings.</p>
		</div>
	{:else}
		<!-- Search -->
		<div class="flex gap-3">
			<input
				type="text"
				bind:value={query}
				placeholder="Search countries..."
				class="flex-1 rounded-lg border border-surface-700 bg-surface-800 px-4 py-2.5 text-sm text-surface-200 placeholder-surface-500 focus:border-accent-500 focus:outline-none"
			/>
		</div>

		<p class="text-xs text-surface-500">{sorted.length} countries shown</p>

		<!-- Table -->
		<div class="overflow-x-auto rounded-lg border border-surface-800">
			<table class="w-full text-left text-sm">
				<thead class="border-b border-surface-700/50 bg-surface-800">
					<tr>
						<th class="px-4 py-3">
							<button
								onclick={() => toggleSort('name')}
								class="font-medium uppercase tracking-wider text-surface-400 hover:text-surface-200"
							>
								Country{sortIndicator('name')}
							</button>
						</th>
						<th class="px-4 py-3">
							<button
								onclick={() => toggleSort('score')}
								class="font-medium uppercase tracking-wider text-surface-400 hover:text-surface-200"
							>
								Score{sortIndicator('score')}
							</button>
						</th>
						<th class="px-4 py-3">
							<span class="font-medium uppercase tracking-wider text-surface-400">Risk Level</span>
						</th>
						<th class="px-4 py-3">
							<button
								onclick={() => toggleSort('sources')}
								class="font-medium uppercase tracking-wider text-surface-400 hover:text-surface-200"
							>
								Sources{sortIndicator('sources')}
							</button>
						</th>
						<th class="px-4 py-3">
							<button
								onclick={() => toggleSort('updated')}
								class="font-medium uppercase tracking-wider text-surface-400 hover:text-surface-200"
							>
								Last Updated{sortIndicator('updated')}
							</button>
						</th>
					</tr>
				</thead>
				<tbody class="divide-y divide-surface-800 bg-surface-950">
					{#each sorted as entry}
						{@const risk = riskLevel(entry.advisory.score)}
						{@const fresh = freshness(entry.advisory.updated)}
						<tr class="hover:bg-surface-900">
							<td class="px-4 py-3">
								<div>
									<span class="font-medium text-surface-200">{entry.name}</span>
									<span class="ml-1.5 text-xs text-surface-500">{entry.iso_alpha2}</span>
								</div>
							</td>
							<td class="px-4 py-3">
								<span class="font-mono font-medium {risk.color}">{entry.advisory.score.toFixed(1)}</span>
							</td>
							<td class="px-4 py-3">
								<span class="rounded-full px-2 py-0.5 text-xs font-medium {risk.color} bg-surface-800">
									{risk.label}
								</span>
							</td>
							<td class="px-4 py-3 text-surface-300">
								{entry.advisory.sources_active}
							</td>
							<td class="px-4 py-3">
								<div class="flex items-center gap-2">
									<span class="text-surface-400">{new Date(entry.advisory.updated).toLocaleDateString()}</span>
									<span class="rounded-full px-1.5 py-0.5 text-xs {fresh.color} bg-surface-800">
										{fresh.label}
									</span>
								</div>
							</td>
						</tr>
					{/each}
				</tbody>
			</table>
		</div>
	{/if}
</div>
