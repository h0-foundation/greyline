<svelte:head>
	<title>Tools - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-xl font-semibold text-surface-100">Tools</h1>
		<p class="mt-0.5 font-mono text-xs text-surface-500">OPERATIONAL TOOLS & UTILITIES</p>
	</div>

	<!-- Field Tools -->
	<div>
		<h2 class="mb-3 font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500">Field Tools</h2>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each [
				{ label: 'EXIF Stripper', desc: 'Remove metadata from photos', href: '/tools/exif', icon: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' },
				{ label: 'Hotel Security', desc: 'Room security verification checklist', href: '/tools/hotel', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z' },
				{ label: 'Room Sweep', desc: 'TSCM hotel room inspection guide', href: '/tools/sweep', icon: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z' },
				{ label: 'Packing List', desc: 'Gray-man gear lists by destination', href: '/tools/packing', icon: 'M9 11l3 3L22 4' },
				{ label: 'Wardrobe Planner', desc: 'Blend-in clothing recommendations', href: '/tools/wardrobe', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2' },
			] as tool}
				<a
					href={tool.href}
					class="group relative flex items-start gap-4 rounded-lg border border-surface-700/50 bg-surface-800 p-4 transition-all hover:border-accent-300/30"
				>
					<svg class="mt-0.5 h-5 w-5 shrink-0 text-surface-500 group-hover:text-accent-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						{#each tool.icon.split(' M') as segment, i}
							<path d="{i === 0 ? segment : 'M' + segment}" />
						{/each}
					</svg>
					<div class="min-w-0">
						<h3 class="text-[13px] font-medium text-surface-200 group-hover:text-surface-100">{tool.label}</h3>
						<p class="mt-0.5 text-xs text-surface-500">{tool.desc}</p>
					</div>
					<div class="pointer-events-none absolute bottom-0 right-0 h-5 w-5 rounded-br-lg border-b-2 border-r-2 border-accent-300 opacity-0 group-hover:opacity-20 transition-opacity"></div>
				</a>
			{/each}
		</div>
	</div>

	<!-- Intelligence -->
	<div>
		<h2 class="mb-3 font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500">Intelligence</h2>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each [
				{ label: 'Weather', desc: '16-day forecast for any location', href: '/tools/weather', icon: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z' },
				{ label: 'Currency Converter', desc: 'Exchange rates for 200+ currencies', href: '/tools/currency', icon: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
				{ label: 'Travel Advisories', desc: 'Risk scores for all countries', href: '/tools/advisories', icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z' },
				{ label: 'Financial OPSEC', desc: 'Payment norms and ATM safety', href: '/tools/financial', icon: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6' },
				{ label: 'Border Crossing', desc: 'Customs prep and doc requirements', href: '/tools/border', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9' },
			] as tool}
				<a
					href={tool.href}
					class="group relative flex items-start gap-4 rounded-lg border border-surface-700/50 bg-surface-800 p-4 transition-all hover:border-accent-300/30"
				>
					<svg class="mt-0.5 h-5 w-5 shrink-0 text-surface-500 group-hover:text-accent-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						{#each tool.icon.split(' M') as segment, i}
							<path d="{i === 0 ? segment : 'M' + segment}" />
						{/each}
					</svg>
					<div class="min-w-0">
						<h3 class="text-[13px] font-medium text-surface-200 group-hover:text-surface-100">{tool.label}</h3>
						<p class="mt-0.5 text-xs text-surface-500">{tool.desc}</p>
					</div>
					<div class="pointer-events-none absolute bottom-0 right-0 h-5 w-5 rounded-br-lg border-b-2 border-r-2 border-accent-300 opacity-0 group-hover:opacity-20 transition-opacity"></div>
				</a>
			{/each}
		</div>
	</div>

	<!-- Tactical -->
	<div>
		<h2 class="mb-3 font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500">Tactical</h2>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each [
				{ label: 'SDR Generator', desc: 'Surveillance detection routes', href: '/tools/sdr', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
				{ label: 'Extraction Planner', desc: 'Emergency escape route planning', href: '/tools/extraction', icon: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l5-5-5-5 M15 12H3' },
			] as tool}
				<a
					href={tool.href}
					class="group relative flex items-start gap-4 rounded-lg border border-surface-700/50 bg-surface-800 p-4 transition-all hover:border-accent-300/30"
				>
					<svg class="mt-0.5 h-5 w-5 shrink-0 text-surface-500 group-hover:text-accent-300 transition-colors" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						{#each tool.icon.split(' M') as segment, i}
							<path d="{i === 0 ? segment : 'M' + segment}" />
						{/each}
					</svg>
					<div class="min-w-0">
						<h3 class="text-[13px] font-medium text-surface-200 group-hover:text-surface-100">{tool.label}</h3>
						<p class="mt-0.5 text-xs text-surface-500">{tool.desc}</p>
					</div>
					<div class="pointer-events-none absolute bottom-0 right-0 h-5 w-5 rounded-br-lg border-b-2 border-r-2 border-accent-300 opacity-0 group-hover:opacity-20 transition-opacity"></div>
				</a>
			{/each}
		</div>
	</div>

	<!-- Coming Soon — Phase 2 -->
	<div>
		<h2 class="mb-3 font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500">Coming Soon — Phase 2</h2>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each [
				{ label: 'Route Variation Tracker', desc: 'Alerts when movement patterns become predictable', icon: 'M9 18l6-6-6-6' },
				{ label: 'Bug-Out Plan Builder', desc: 'Evacuation plans with rally points and comm protocols', icon: 'M13 2L3 14h9l-1 8 10-12h-9l1-8' },
				{ label: 'Behavioral Baseline', desc: 'Walking pace, eye contact, personal space by culture', icon: 'M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' },
				{ label: 'Active Trip Mode', desc: 'Operational mode with quick-access tools and check-ins', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
				{ label: 'News & Events Feed', desc: 'GDELT-powered news filtered by destination', icon: 'M19 20H5a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v1' },
			] as tool}
				<div
					class="group relative flex items-start gap-4 rounded-lg border border-surface-700/30 bg-surface-800/50 p-4 opacity-60"
				>
					<svg class="mt-0.5 h-5 w-5 shrink-0 text-surface-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						{#each tool.icon.split(' M') as segment, i}
							<path d="{i === 0 ? segment : 'M' + segment}" />
						{/each}
					</svg>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<h3 class="text-[13px] font-medium text-surface-400">{tool.label}</h3>
							<span class="rounded-full border border-accent-300/20 bg-accent-300/5 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-accent-300/60">Soon</span>
						</div>
						<p class="mt-0.5 text-xs text-surface-600">{tool.desc}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>

	<!-- Coming Soon — Phase 3 -->
	<div>
		<h2 class="mb-3 font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500">Coming Soon — Phase 3</h2>
		<div class="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
			{#each [
				{ label: 'Check-In System', desc: 'Timed encrypted check-ins with missed alerts', icon: 'M22 11.08V12a10 10 0 1 1-5.93-9.14' },
				{ label: 'Rally Point System', desc: 'Encrypted meeting points with time windows', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z' },
				{ label: 'Counter-Surveillance Log', desc: 'Log and cross-reference suspicious sightings', icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z' },
				{ label: 'Travel Profile Builder', desc: 'Cover story consistency checker', icon: 'M16 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2' },
				{ label: 'Camera Safe Zones', desc: 'Photography restrictions with geofenced warnings', icon: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z' },
				{ label: 'Offline Translation', desc: 'Argos Translate for 30+ languages without internet', icon: 'M5 8l6 6 M4 14l6-6 2 3 M2 5h12 M7 2h1' },
				{ label: 'Pattern Analyzer', desc: 'Comprehensive pattern-of-life self-analysis', icon: 'M18 20V10 M12 20V4 M6 20v-6' },
				{ label: 'Tor Integration', desc: 'Route sensitive API calls through Tor', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
				{ label: 'Transit Data', desc: 'GTFS feed viewer with offline timetables', icon: 'M8 6l4-4 4 4 M4 22h16 M3 14h18' },
			] as tool}
				<div
					class="group relative flex items-start gap-4 rounded-lg border border-surface-700/30 bg-surface-800/50 p-4 opacity-60"
				>
					<svg class="mt-0.5 h-5 w-5 shrink-0 text-surface-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
						{#each tool.icon.split(' M') as segment, i}
							<path d="{i === 0 ? segment : 'M' + segment}" />
						{/each}
					</svg>
					<div class="min-w-0 flex-1">
						<div class="flex items-center gap-2">
							<h3 class="text-[13px] font-medium text-surface-400">{tool.label}</h3>
							<span class="rounded-full border border-surface-600/30 bg-surface-700/20 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-surface-500">Phase 3</span>
						</div>
						<p class="mt-0.5 text-xs text-surface-600">{tool.desc}</p>
					</div>
				</div>
			{/each}
		</div>
	</div>
</div>
