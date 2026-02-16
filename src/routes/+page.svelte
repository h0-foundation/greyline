<script lang="ts">
	let tripCount = $state(0);
	let activeTrip = $state<string | null>(null);
	let vaultDocs = $state(0);
	let enabledApis = $state(0);
	let totalApis = $state(8);
	let countryCount = $state(0);

	$effect(() => {
		fetch('/api/trip')
			.then((r) => r.json())
			.then((trips: any[]) => {
				tripCount = trips.length;
				const active = trips.find((t) => t.status === 'active');
				activeTrip = active?.name ?? null;
			})
			.catch(() => {});

		fetch('/api/vault')
			.then((r) => r.json())
			.then((docs: any[]) => {
				vaultDocs = docs.length;
			})
			.catch(() => {});

		fetch('/api/settings')
			.then((r) => r.json())
			.then((data) => {
				if (data.apiToggles) {
					enabledApis = data.apiToggles.filter((t: any) => t.enabled).length;
					totalApis = data.apiToggles.length;
				}
			})
			.catch(() => {});

		fetch('/api/knowledge')
			.then((r) => r.json())
			.then((profiles: any[]) => {
				countryCount = profiles.length;
			})
			.catch(() => {});
	});
</script>

<svelte:head>
	<title>Dashboard - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-surface-100">Mission Dashboard</h1>
			<p class="mt-0.5 font-mono text-xs text-surface-500">OPERATIONAL OVERVIEW</p>
		</div>
		<div class="flex items-center gap-4">
			<span class="font-mono text-xs text-surface-500">{new Date().toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })}</span>
			<div class="flex items-center gap-2 rounded-full border border-accent-300/20 bg-accent-300/10 px-3 py-1">
				<div class="h-1.5 w-1.5 rounded-full bg-accent-300" style="box-shadow: 0 0 8px rgba(234,255,94,0.5)"></div>
				<span class="font-mono text-[10px] font-medium uppercase tracking-wider text-accent-300">SYSTEM ACTIVE</span>
			</div>
		</div>
	</div>

	<!-- Stats Grid -->
	<div class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
		<!-- Trips -->
		<a
			href="/trip"
			class="group relative rounded-lg border border-surface-700/50 bg-surface-800 p-5 transition-all hover:border-accent-300/30"
		>
			<div class="flex items-start justify-between">
				<p class="font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500">Trips</p>
				<svg class="h-4 w-4 text-surface-500 group-hover:text-accent-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M1 6v16l7-4 7 4 7-4V2l-7 4-7-4-7 4z" /></svg>
			</div>
			<p class="mt-3 text-3xl font-extralight tracking-tight text-surface-100">
				{activeTrip ?? (tripCount > 0 ? tripCount : '0')}
			</p>
			<p class="mt-1 text-xs text-surface-500">
				{activeTrip ? 'Active mission' : tripCount > 0 ? `${tripCount} planned` : 'No trips yet'}
			</p>
			<div class="pointer-events-none absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-accent-300 opacity-20"></div>
		</a>

		<!-- OPSEC -->
		<a
			href="/opsec"
			class="group relative rounded-lg border border-surface-700/50 bg-surface-800 p-5 transition-all hover:border-accent-300/30"
		>
			<div class="flex items-start justify-between">
				<p class="font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500">OPSEC Score</p>
				<svg class="h-4 w-4 text-surface-500 group-hover:text-accent-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>
			</div>
			<p class="mt-3 text-3xl font-extralight tracking-tight text-accent-300">Check</p>
			<p class="mt-1 text-xs text-surface-500">26-item security checklist</p>
			<div class="pointer-events-none absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-accent-300 opacity-20"></div>
		</a>

		<!-- Vault -->
		<a
			href="/vault"
			class="group relative rounded-lg border border-surface-700/50 bg-surface-800 p-5 transition-all hover:border-accent-300/30"
		>
			<div class="flex items-start justify-between">
				<p class="font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500">Vault</p>
				<svg class="h-4 w-4 text-surface-500 group-hover:text-accent-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>
			</div>
			<p class="mt-3 text-3xl font-extralight tracking-tight text-surface-100">
				{vaultDocs > 0 ? vaultDocs : 'Locked'}
			</p>
			<p class="mt-1 text-xs text-surface-500">
				{vaultDocs > 0 ? `${vaultDocs} encrypted doc${vaultDocs !== 1 ? 's' : ''}` : 'Encrypted storage'}
			</p>
			<div class="pointer-events-none absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-accent-300 opacity-20"></div>
		</a>

		<!-- Knowledge -->
		<a
			href="/knowledge"
			class="group relative rounded-lg border border-surface-700/50 bg-surface-800 p-5 transition-all hover:border-accent-300/30"
		>
			<div class="flex items-start justify-between">
				<p class="font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500">Intelligence</p>
				<svg class="h-4 w-4 text-surface-500 group-hover:text-accent-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" /><path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" /></svg>
			</div>
			<p class="mt-3 text-3xl font-extralight tracking-tight text-surface-100">
				{countryCount > 0 ? countryCount : '--'}
			</p>
			<p class="mt-1 text-xs text-surface-500">
				{countryCount > 0 ? 'Country profiles' : 'Run pnpm build:countries'}
			</p>
			<div class="pointer-events-none absolute bottom-0 right-0 h-6 w-6 rounded-br-lg border-b-2 border-r-2 border-accent-300 opacity-20"></div>
		</a>
	</div>

	<!-- Quick Actions -->
	<div>
		<h2 class="font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500 mb-3">Quick Actions</h2>
		<div class="grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-6">
			{#each [
				{ label: 'New Trip', href: '/trip', icon: 'M1 6v16l7-4 7 4 7-4V2l-7 4-7-4-7 4z' },
				{ label: 'Strip EXIF', href: '/tools/exif', icon: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' },
				{ label: 'Hotel Check', href: '/tools/hotel', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
				{ label: 'OPSEC Check', href: '/opsec', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
				{ label: 'Weather', href: '/tools/weather', icon: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z' },
				{ label: 'Advisories', href: '/tools/advisories', icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' },
			] as action}
				<a
					href={action.href}
					class="flex items-center justify-between rounded-lg border border-surface-700/30 bg-surface-800/50 px-4 py-3 text-[13px] text-surface-300 hover:bg-surface-700/50 hover:text-surface-100 transition-all group"
				>
					<span>{action.label}</span>
					<span class="font-mono text-[10px] text-accent-300 opacity-0 group-hover:opacity-100 transition-opacity">GO</span>
				</a>
			{/each}
		</div>
	</div>

	<!-- Environment -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<div class="flex items-start justify-between mb-4">
				<p class="font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500">Environment</p>
				<svg class="h-4 w-4 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M12 2v20M2 12h20" /></svg>
			</div>
			<div class="space-y-3">
				<div class="flex items-center justify-between text-[13px] border-b border-surface-700/30 pb-3">
					<span class="text-surface-400">Database</span>
					<span class="font-mono text-xs text-accent-300">ONLINE</span>
				</div>
				<div class="flex items-center justify-between text-[13px] border-b border-surface-700/30 pb-3">
					<span class="text-surface-400">External APIs</span>
					<span class="font-mono text-xs {enabledApis > 0 ? 'text-accent-300' : 'text-warning'}">
						{enabledApis > 0 ? `${enabledApis}/${totalApis} ACTIVE` : 'ALL DISABLED'}
					</span>
				</div>
				<div class="flex items-center justify-between text-[13px] border-b border-surface-700/30 pb-3">
					<span class="text-surface-400">Country Data</span>
					<span class="font-mono text-xs {countryCount > 0 ? 'text-accent-300' : 'text-surface-500'}">
						{countryCount > 0 ? `${countryCount} PROFILES` : 'NOT LOADED'}
					</span>
				</div>
				<div class="flex items-center justify-between text-[13px]">
					<span class="text-surface-400">Vault</span>
					<span class="font-mono text-xs text-surface-500">LOCKED</span>
				</div>
			</div>
		</div>

		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<div class="flex items-start justify-between mb-4">
				<p class="font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500">Preparation</p>
				<svg class="h-4 w-4 text-surface-500" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14" /><polyline points="22 4 12 14.01 9 11.01" /></svg>
			</div>
			<div class="space-y-2">
				{#each [
					{ label: 'Packing List Generator', href: '/tools/packing' },
					{ label: 'Border Crossing Prep', href: '/tools/border' },
					{ label: 'Financial OPSEC', href: '/tools/financial' },
					{ label: 'Wardrobe Planner', href: '/tools/wardrobe' },
				] as item}
					<a
						href={item.href}
						class="flex items-center justify-between rounded-md border border-surface-700/30 bg-surface-900/50 px-3 py-2.5 text-[13px] text-surface-300 hover:bg-surface-700/30 hover:text-surface-100 transition-all group"
					>
						<span>{item.label}</span>
						<span class="font-mono text-[10px] text-accent-300 opacity-0 group-hover:opacity-100 transition-opacity">OPEN</span>
					</a>
				{/each}
			</div>
		</div>
	</div>
</div>
