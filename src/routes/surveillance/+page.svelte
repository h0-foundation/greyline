<svelte:head>
	<title>Surveillance - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-xl font-semibold text-surface-100">Surveillance</h1>
		<p class="mt-1 text-sm text-surface-400">Camera mapping and counter-surveillance tools</p>
	</div>

	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		<a href="/map" class="rounded-lg border border-surface-700/50 bg-surface-800 p-6 hover:border-surface-700">
			<h3 class="font-medium text-surface-200">Camera Map</h3>
			<p class="mt-1 text-sm text-surface-400">CCTV/ALPR overlay from Overpass API</p>
		</a>
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-6">
			<h3 class="font-medium text-surface-200">Counter-Surveillance Log</h3>
			<p class="mt-1 text-sm text-surface-400">Track and cross-reference sightings — Phase 3</p>
		</div>
	</div>
</div>
