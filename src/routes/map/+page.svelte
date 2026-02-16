<script lang="ts">
	import { onMount } from 'svelte';
	import { browser } from '$app/environment';

	let mapContainer: HTMLDivElement;
	let map: any = null;
	let maplibre: any = null;
	let mapLoaded = $state(false);
	let searchQuery = $state('');
	let searching = $state(false);
	let searchResults = $state<Array<{ display_name: string; lat: string; lon: string }>>([]);
	let showLayers = $state(false);
	let showInfo = $state(false);
	let infoContent = $state<{ title: string; details: string[]; type: string } | null>(null);

	// Layer toggles
	let layers = $state({
		cameras: false,
		embassies: false,
		hospitals: false,
		government: false,
		police: false,
	});

	// Layer loading states
	let layerLoading = $state<Record<string, boolean>>({});
	let layerCounts = $state<Record<string, number>>({});

	// Routing state
	let routeMode = $state(false);
	let routeStart = $state<{ lat: number; lng: number } | null>(null);
	let routeEnd = $state<{ lat: number; lng: number } | null>(null);
	let routeProfile = $state<'foot' | 'car' | 'bike'>('foot');
	let routeInfo = $state<{ distance: number; duration: number } | null>(null);
	let routeLoading = $state(false);

	// POI markers stored per layer
	let markers: Record<string, any[]> = {};

	const LAYER_CONFIG: Record<string, { label: string; color: string; emoji: string }> = {
		cameras: { label: 'Surveillance Cameras', color: '#ef4444', emoji: '📹' },
		embassies: { label: 'Embassies & Consulates', color: '#3b82f6', emoji: '🏛' },
		hospitals: { label: 'Hospitals', color: '#10b981', emoji: '🏥' },
		government: { label: 'Government Buildings', color: '#f59e0b', emoji: '🏢' },
		police: { label: 'Police Stations', color: '#8b5cf6', emoji: '👮' },
	};

	onMount(() => {
		if (!browser) return;

		let cleanup: (() => void) | undefined;

		(async () => {
			maplibre = await import('maplibre-gl');
			await import('maplibre-gl/dist/maplibre-gl.css');

			map = new maplibre.Map({
				container: mapContainer,
				style: {
					version: 8,
					sources: {
						'osm-tiles': {
							type: 'raster',
							tiles: ['https://tile.openstreetmap.org/{z}/{x}/{y}.png'],
							tileSize: 256,
							attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>',
						},
					},
					layers: [
						{
							id: 'osm-tiles',
							type: 'raster',
							source: 'osm-tiles',
							minzoom: 0,
							maxzoom: 19,
						},
					],
				},
				center: [0, 20],
				zoom: 2,
				attributionControl: {},
			});

			map.addControl(new maplibre.NavigationControl(), 'top-right');
			map.addControl(new maplibre.ScaleControl(), 'bottom-left');

			map.on('load', () => {
				mapLoaded = true;
			});

			// Right-click for routing
			map.on('contextmenu', (e: any) => {
				if (!routeMode) return;
				const { lat, lng } = e.lngLat;
				if (!routeStart) {
					routeStart = { lat, lng };
					addRouteMarker(lat, lng, 'start');
				} else if (!routeEnd) {
					routeEnd = { lat, lng };
					addRouteMarker(lat, lng, 'end');
					calculateRoute();
				}
			});

			cleanup = () => map?.remove();
		})();

		return () => {
			cleanup?.();
		};
	});

	// --- Search ---
	async function handleSearch() {
		if (!searchQuery.trim()) return;
		searching = true;
		try {
			const res = await fetch(
				`https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(searchQuery)}&limit=5`,
				{ headers: { 'User-Agent': 'Greyline/0.1' } }
			);
			searchResults = await res.json();
		} catch {
			searchResults = [];
		}
		searching = false;
	}

	function flyTo(lat: string, lon: string) {
		if (!map) return;
		map.flyTo({ center: [parseFloat(lon), parseFloat(lat)], zoom: 14, duration: 2000 });
		searchResults = [];
		searchQuery = '';
	}

	function handleSearchKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') {
			e.preventDefault();
			handleSearch();
		}
		if (e.key === 'Escape') searchResults = [];
	}

	// --- POI Layer Loading ---
	async function toggleLayer(type: string) {
		const key = type as keyof typeof layers;
		layers[key] = !layers[key];

		if (layers[key]) {
			await loadPOIs(type);
		} else {
			clearLayerMarkers(type);
			layerCounts[type] = 0;
		}
	}

	async function loadPOIs(type: string) {
		if (!map || !mapLoaded) return;

		const bounds = map.getBounds();
		const south = bounds.getSouth();
		const west = bounds.getWest();
		const north = bounds.getNorth();
		const east = bounds.getEast();

		// Check zoom level — require at least zoom 10
		if (map.getZoom() < 10) {
			layerCounts[type] = -1; // Signal "zoom in"
			return;
		}

		layerLoading[type] = true;
		try {
			const res = await fetch(
				`/api/map/pois?type=${type}&south=${south}&west=${west}&north=${north}&east=${east}`
			);
			const data = await res.json();

			if (data.offline) {
				layerCounts[type] = -2; // Signal "API offline"
				layerLoading[type] = false;
				return;
			}

			if (data.error) {
				// Bounding box too large
				layerCounts[type] = -1;
				layerLoading[type] = false;
				return;
			}

			clearLayerMarkers(type);

			if (data.data && maplibre) {
				const config = LAYER_CONFIG[type];
				markers[type] = [];

				for (const poi of data.data) {
					const el = document.createElement('div');
					el.className = 'poi-marker';
					el.style.cssText = `width:24px;height:24px;border-radius:50%;background:${config.color};border:2px solid white;cursor:pointer;display:flex;align-items:center;justify-content:center;font-size:12px;box-shadow:0 2px 4px rgba(0,0,0,0.3);`;
					el.textContent = config.emoji;
					el.title = poi.name || config.label;

					const marker = new maplibre.Marker({ element: el })
						.setLngLat([poi.lon, poi.lat])
						.addTo(map);

					el.addEventListener('click', () => {
						showPoiInfo(poi, type);
					});

					markers[type].push(marker);
				}

				layerCounts[type] = data.count;
			}
		} catch {
			layerCounts[type] = 0;
		}
		layerLoading[type] = false;
	}

	function clearLayerMarkers(type: string) {
		if (markers[type]) {
			for (const m of markers[type]) m.remove();
			markers[type] = [];
		}
	}

	function showPoiInfo(poi: any, type: string) {
		const config = LAYER_CONFIG[type];
		const details: string[] = [];

		if (poi.name) details.push(`Name: ${poi.name}`);
		if (poi.tags?.['addr:street']) details.push(`Address: ${poi.tags['addr:street']} ${poi.tags['addr:housenumber'] ?? ''}`);
		if (poi.tags?.phone) details.push(`Phone: ${poi.tags.phone}`);
		if (poi.tags?.website) details.push(`Web: ${poi.tags.website}`);
		if (poi.tags?.opening_hours) details.push(`Hours: ${poi.tags.opening_hours}`);
		if (poi.tags?.operator) details.push(`Operator: ${poi.tags.operator}`);
		if (poi.tags?.['surveillance:type']) details.push(`Camera type: ${poi.tags['surveillance:type']}`);
		if (poi.tags?.['surveillance:zone']) details.push(`Zone: ${poi.tags['surveillance:zone']}`);
		if (poi.tags?.country) details.push(`Country: ${poi.tags.country}`);
		details.push(`Coords: ${poi.lat.toFixed(5)}, ${poi.lon.toFixed(5)}`);

		infoContent = {
			title: poi.name || config.label,
			details,
			type,
		};
		showInfo = true;
	}

	// Refresh active layers when map moves
	function refreshVisibleLayers() {
		for (const [type, active] of Object.entries(layers)) {
			if (active) loadPOIs(type);
		}
	}

	$effect(() => {
		if (mapLoaded && map) {
			map.on('moveend', () => {
				refreshVisibleLayers();
			});
		}
	});

	// --- Routing ---
	let routeMarkers: any[] = [];
	let routeLayerAdded = false;

	function addRouteMarker(lat: number, lng: number, type: 'start' | 'end') {
		if (!map || !maplibre) return;
		const color = type === 'start' ? '#10b981' : '#ef4444';
		const el = document.createElement('div');
		el.style.cssText = `width:16px;height:16px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 2px 6px rgba(0,0,0,0.4);`;
		const marker = new maplibre.Marker({ element: el }).setLngLat([lng, lat]).addTo(map);
		routeMarkers.push(marker);
	}

	async function calculateRoute() {
		if (!routeStart || !routeEnd || !map) return;
		routeLoading = true;

		try {
			const res = await fetch(
				`/api/map/route?startLat=${routeStart.lat}&startLng=${routeStart.lng}&endLat=${routeEnd.lat}&endLng=${routeEnd.lng}&profile=${routeProfile}`
			);
			const data = await res.json();

			if (data.error) {
				routeInfo = null;
				routeLoading = false;
				return;
			}

			// Draw route on map
			if (routeLayerAdded) {
				map.removeLayer('route-line');
				map.removeSource('route');
				routeLayerAdded = false;
			}

			map.addSource('route', {
				type: 'geojson',
				data: {
					type: 'Feature',
					geometry: data.geometry,
					properties: {},
				},
			});

			map.addLayer({
				id: 'route-line',
				type: 'line',
				source: 'route',
				paint: {
					'line-color': '#6366f1',
					'line-width': 4,
					'line-opacity': 0.8,
				},
			});

			routeLayerAdded = true;
			routeInfo = {
				distance: data.distance,
				duration: data.duration,
			};

			// Fit map to route
			const coords = data.geometry.coordinates;
			const bounds = coords.reduce(
				(b: any, c: number[]) => b.extend(c),
				new maplibre.LngLatBounds(coords[0], coords[0])
			);
			map.fitBounds(bounds, { padding: 60, duration: 1000 });
		} catch {
			routeInfo = null;
		}

		routeLoading = false;
	}

	function clearRoute() {
		routeStart = null;
		routeEnd = null;
		routeInfo = null;
		routeLoading = false;

		for (const m of routeMarkers) m.remove();
		routeMarkers = [];

		if (map && routeLayerAdded) {
			try {
				map.removeLayer('route-line');
				map.removeSource('route');
			} catch { /* ignore */ }
			routeLayerAdded = false;
		}
	}

	function toggleRouteMode() {
		routeMode = !routeMode;
		if (!routeMode) clearRoute();
	}

	function formatDistance(meters: number): string {
		if (meters < 1000) return `${Math.round(meters)}m`;
		return `${(meters / 1000).toFixed(1)}km`;
	}

	function formatDuration(seconds: number): string {
		if (seconds < 60) return `${Math.round(seconds)}s`;
		const mins = Math.floor(seconds / 60);
		if (mins < 60) return `${mins}min`;
		const hrs = Math.floor(mins / 60);
		return `${hrs}h ${mins % 60}min`;
	}

	function getLayerStatusText(type: string): string {
		const count = layerCounts[type];
		if (layerLoading[type]) return 'Loading...';
		if (count === -1) return 'Zoom in more';
		if (count === -2) return 'API offline';
		if (count === undefined || count === 0) return '0 found';
		return `${count} found`;
	}
</script>

<svelte:head>
	<title>Map - Greyline</title>
</svelte:head>

<div class="relative h-[calc(100vh-5rem)]">
	<!-- Map container -->
	<div bind:this={mapContainer} class="h-full w-full rounded-lg"></div>

	<!-- Search overlay -->
	<div class="absolute left-4 top-4 z-10 w-80">
		<div class="relative">
			<input
				type="text"
				bind:value={searchQuery}
				onkeydown={handleSearchKeydown}
				placeholder="Search location..."
				class="w-full rounded-lg border border-surface-700 bg-surface-900/95 px-4 py-2.5 pr-10 text-sm text-surface-200 placeholder-surface-500 backdrop-blur focus:border-accent-500 focus:outline-none"
			/>
			<button
				onclick={handleSearch}
				disabled={searching}
				class="absolute right-2 top-1/2 -translate-y-1/2 rounded p-1 text-surface-400 hover:text-surface-200"
			>
				<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
					<circle cx="11" cy="11" r="8" />
					<path d="m21 21-4.3-4.3" />
				</svg>
			</button>
		</div>

		{#if searchResults.length > 0}
			<div class="mt-1 rounded-lg border border-surface-700 bg-surface-900/95 backdrop-blur">
				{#each searchResults as result}
					<button
						class="block w-full px-4 py-2 text-left text-sm text-surface-300 hover:bg-surface-800 first:rounded-t-lg last:rounded-b-lg"
						onclick={() => flyTo(result.lat, result.lon)}
					>
						<span class="line-clamp-1">{result.display_name}</span>
					</button>
				{/each}
			</div>
		{/if}
	</div>

	<!-- Layer panel -->
	<div class="absolute right-14 top-4 z-10">
		<button
			onclick={() => (showLayers = !showLayers)}
			class="rounded-lg border border-surface-700 bg-surface-900/95 px-3 py-2 text-sm text-surface-300 backdrop-blur hover:bg-surface-800"
			title="Toggle layers"
		>
			Layers
		</button>
		{#if showLayers}
			<div class="mt-1 w-64 rounded-lg border border-surface-700 bg-surface-900/95 p-3 backdrop-blur">
				<p class="mb-2 text-xs font-medium uppercase tracking-wider text-surface-500">POI Overlays</p>
				{#each Object.entries(LAYER_CONFIG) as [type, config]}
					<label class="flex items-center justify-between gap-2 rounded px-1 py-1.5 text-sm text-surface-300 hover:bg-surface-800/50">
						<div class="flex items-center gap-2">
							<input
								type="checkbox"
								checked={layers[type as keyof typeof layers]}
								onchange={() => toggleLayer(type)}
								class="rounded"
							/>
							<span class="text-xs">{config.emoji}</span>
							<span>{config.label}</span>
						</div>
						<span class="text-xs text-surface-500">
							{layers[type as keyof typeof layers] ? getLayerStatusText(type) : ''}
						</span>
					</label>
				{/each}

				<div class="mt-3 border-t border-surface-800 pt-3">
					<p class="mb-2 text-xs font-medium uppercase tracking-wider text-surface-500">Routing</p>
					<button
						onclick={toggleRouteMode}
						class="w-full rounded-lg px-3 py-2 text-left text-sm {routeMode
							? 'bg-accent-700/20 text-accent-300'
							: 'text-surface-400 hover:bg-surface-800'}"
					>
						{routeMode ? 'Exit Route Mode' : 'Plan Route (right-click)'}
					</button>

					{#if routeMode}
						<div class="mt-2 space-y-2">
							<div class="flex gap-1">
								{#each ['foot', 'car', 'bike'] as profile}
									<button
										class="flex-1 rounded px-2 py-1 text-xs {routeProfile === profile
											? 'bg-accent-600 text-white'
											: 'bg-surface-800 text-surface-400 hover:bg-surface-700'}"
										onclick={() => {
											routeProfile = profile as typeof routeProfile;
											if (routeStart && routeEnd) calculateRoute();
										}}
									>
										{profile === 'foot' ? 'Walk' : profile === 'car' ? 'Drive' : 'Bike'}
									</button>
								{/each}
							</div>

							<div class="text-xs text-surface-500 space-y-0.5">
								{#if !routeStart}
									<p>Right-click map to set start point</p>
								{:else if !routeEnd}
									<p class="text-emerald-400">Start set. Right-click for end point.</p>
								{:else if routeLoading}
									<p>Calculating route...</p>
								{:else if routeInfo}
									<p class="text-accent-300">
										{formatDistance(routeInfo.distance)} &middot; {formatDuration(routeInfo.duration)}
									</p>
								{/if}
							</div>

							{#if routeStart || routeEnd}
								<button
									onclick={clearRoute}
									class="w-full rounded px-2 py-1 text-xs text-surface-400 hover:bg-surface-800"
								>
									Clear Route
								</button>
							{/if}
						</div>
					{/if}
				</div>

				<p class="mt-3 text-xs text-surface-600">
					Enable Overpass API in Settings for POI data
				</p>
			</div>
		{/if}
	</div>

	<!-- POI Info Panel -->
	{#if showInfo && infoContent}
		<div class="absolute left-4 bottom-16 z-10 w-80">
			<div class="rounded-lg border border-surface-700 bg-surface-900/95 p-4 backdrop-blur">
				<div class="flex items-start justify-between">
					<div class="flex items-center gap-2">
						<span class="text-sm">{LAYER_CONFIG[infoContent.type]?.emoji ?? ''}</span>
						<h3 class="text-sm font-medium text-surface-200">{infoContent.title}</h3>
					</div>
					<button
						onclick={() => (showInfo = false)}
						class="text-surface-500 hover:text-surface-300"
					>
						<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
							<path d="M6 18L18 6M6 6l12 12" />
						</svg>
					</button>
				</div>
				<div class="mt-2 space-y-1">
					{#each infoContent.details as detail}
						<p class="text-xs text-surface-400">{detail}</p>
					{/each}
				</div>
			</div>
		</div>
	{/if}

	<!-- Status bar -->
	<div class="absolute bottom-8 left-1/2 z-10 -translate-x-1/2">
		<div class="rounded-full border border-surface-700 bg-surface-900/90 px-4 py-1.5 text-xs text-surface-400 backdrop-blur">
			{#if !mapLoaded}
				Loading map...
			{:else if routeMode}
				Route mode active &middot; Right-click to set waypoints
			{:else}
				{@const activeLayers = Object.entries(layers).filter(([, v]) => v).length}
				{activeLayers > 0
					? `${activeLayers} overlay${activeLayers > 1 ? 's' : ''} active`
					: 'OpenStreetMap tiles'} &middot; Zoom in and enable layers for POI data
			{/if}
		</div>
	</div>
</div>
