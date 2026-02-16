<script lang="ts">
	import { goto } from '$app/navigation';
	import { commandPaletteOpen, closeCommandPalette, toggleTheme } from '$lib/stores/app.js';

	type CommandCategory = 'Navigation' | 'Tools' | 'Settings' | 'Actions';

	interface Command {
		label: string;
		href?: string;
		action?: () => void;
		category: CommandCategory;
		icon: string;
		keywords?: string;
	}

	interface InlineResult {
		type: 'currency' | 'weather' | 'country' | 'time';
		loading: boolean;
		data: string | null;
		error: string | null;
	}

	const commands: Command[] = [
		// Navigation
		{ label: 'Dashboard', href: '/', category: 'Navigation', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z', keywords: 'home overview' },
		{ label: 'Trips', href: '/trip', category: 'Navigation', icon: 'M1 6v16l7-4 7 4 7-4V2l-7 4-7-4-7 4z', keywords: 'travel plan itinerary' },
		{ label: 'Map', href: '/map', category: 'Navigation', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z', keywords: 'location routes pois cameras' },
		{ label: 'OPSEC Dashboard', href: '/opsec', category: 'Navigation', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z', keywords: 'security score' },
		{ label: 'Document Vault', href: '/vault', category: 'Navigation', icon: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z', keywords: 'passport encrypted files' },
		{ label: 'Knowledge Base', href: '/knowledge', category: 'Navigation', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20', keywords: 'countries profiles' },
		{ label: 'Surveillance', href: '/surveillance', category: 'Navigation', icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z', keywords: 'cameras counter' },
		{ label: 'Training', href: '/training', category: 'Navigation', icon: 'M22 12h-4l-3 9L9 3l-3 9H2', keywords: 'courses learn' },

		// Tools
		{ label: 'EXIF Stripper', href: '/tools/exif', category: 'Tools', icon: 'M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z', keywords: 'photo metadata strip gps' },
		{ label: 'Wardrobe Planner', href: '/tools/wardrobe', category: 'Tools', icon: 'M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2', keywords: 'clothing blend dress' },
		{ label: 'Packing List', href: '/tools/packing', category: 'Tools', icon: 'M9 11l3 3L22 4', keywords: 'checklist gear items' },
		{ label: 'Hotel Security', href: '/tools/hotel', category: 'Tools', icon: 'M3 9l9-7 9 7v11a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2z', keywords: 'room sweep check' },
		{ label: 'Border Crossing', href: '/tools/border', category: 'Tools', icon: 'M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9', keywords: 'customs passport control' },
		{ label: 'Financial OPSEC', href: '/tools/financial', category: 'Tools', icon: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', keywords: 'money cash cards atm' },
		{ label: 'Weather Lookup', href: '/tools/weather', category: 'Tools', icon: 'M18 10h-1.26A8 8 0 1 0 9 20h9a5 5 0 0 0 0-10z', keywords: 'forecast temperature' },
		{ label: 'Currency Converter', href: '/tools/currency', category: 'Tools', icon: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6', keywords: 'exchange rate money' },
		{ label: 'Travel Advisories', href: '/tools/advisories', category: 'Tools', icon: 'M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', keywords: 'risk safety warning' },
		{ label: 'SDR Route Generator', href: '/tools/sdr', category: 'Tools', icon: 'M22 12h-4l-3 9L9 3l-3 9H2', keywords: 'surveillance detection route' },
		{ label: 'Extraction Planner', href: '/tools/extraction', category: 'Tools', icon: 'M15 3h4a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2h-4 M10 17l5-5-5-5 M15 12H3', keywords: 'escape emergency bugout' },
		{ label: 'Room Sweep', href: '/tools/sweep', category: 'Tools', icon: 'M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7z', keywords: 'tscm bug detection' },

		// Settings
		{ label: 'Settings', href: '/settings', category: 'Settings', icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z', keywords: 'preferences config' },
		{ label: 'API Toggles', href: '/settings/api', category: 'Settings', icon: 'M18 20V10 M12 20V4 M6 20v-6', keywords: 'apis online offline' },
		{ label: 'Data Management', href: '/settings/data', category: 'Settings', icon: 'M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', keywords: 'offline bundles download' },

		// Actions
		{ label: 'Toggle Dark/Light Mode', category: 'Actions', icon: 'M12 3v1m0 16v1m9-9h-1M4 12H3m15.364 6.364l-.707-.707M6.343 6.343l-.707-.707m12.728 0l-.707.707M6.343 17.657l-.707.707 M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z', action: () => toggleTheme(), keywords: 'theme dark light' },
	];

	let query = $state('');
	let selectedIndex = $state(0);
	let inputRef: HTMLInputElement | undefined = $state();
	let inlineResult: InlineResult | null = $state(null);
	let abortController: AbortController | null = null;

	// Currency conversion pattern: "100 USD to EUR" or "50 eur in usd"
	const currencyPattern = /^(\d+(?:\.\d+)?)\s*([a-zA-Z]{3})\s+(?:to|in|->)\s+([a-zA-Z]{3})$/i;
	// Weather pattern: "weather <city>"
	const weatherPattern = /^weather\s+(.+)$/i;
	// Country pattern: "country <name>"
	const countryPattern = /^country\s+(.+)$/i;

	const filtered = $derived.by(() => {
		if (!query.length) return commands;
		const q = query.toLowerCase();
		return commands.filter((c) => {
			const searchable = `${c.label} ${c.category} ${c.keywords ?? ''}`.toLowerCase();
			return searchable.includes(q);
		});
	});

	$effect(() => {
		if (!query) {
			inlineResult = null;
			return;
		}

		const currencyMatch = query.match(currencyPattern);
		if (currencyMatch) {
			const [, amount, from, to] = currencyMatch;
			fetchCurrency(parseFloat(amount), from.toUpperCase(), to.toUpperCase());
			return;
		}

		const weatherMatch = query.match(weatherPattern);
		if (weatherMatch) {
			inlineResult = { type: 'weather', loading: true, data: null, error: null };
			fetchWeather(weatherMatch[1].trim());
			return;
		}

		const countryMatch = query.match(countryPattern);
		if (countryMatch) {
			inlineResult = { type: 'country', loading: true, data: null, error: null };
			fetchCountry(countryMatch[1].trim());
			return;
		}

		inlineResult = null;
	});

	async function fetchCurrency(amount: number, from: string, to: string) {
		inlineResult = { type: 'currency', loading: true, data: null, error: null };
		abortController?.abort();
		abortController = new AbortController();
		try {
			const res = await fetch(`/api/currency?from=${from}&to=${to}&amount=${amount}`, { signal: abortController.signal });
			if (!res.ok) throw new Error('Failed');
			const data = await res.json();
			if (data.result !== undefined) {
				inlineResult = { type: 'currency', loading: false, data: `${amount} ${from} = ${data.result.toFixed(2)} ${to}`, error: null };
			} else if (data.offline) {
				inlineResult = { type: 'currency', loading: false, data: null, error: 'Currency API offline' };
			} else {
				inlineResult = { type: 'currency', loading: false, data: null, error: 'Conversion failed' };
			}
		} catch {
			if (inlineResult?.type === 'currency') {
				inlineResult = { type: 'currency', loading: false, data: null, error: 'Conversion failed' };
			}
		}
	}

	async function fetchWeather(city: string) {
		abortController?.abort();
		abortController = new AbortController();
		try {
			// First geocode the city
			const geoRes = await fetch(`/api/geocode?q=${encodeURIComponent(city)}`, { signal: abortController.signal });
			if (!geoRes.ok) throw new Error('Geocode failed');
			const geoData = await geoRes.json();
			if (!geoData.results?.length) {
				inlineResult = { type: 'weather', loading: false, data: null, error: `City "${city}" not found` };
				return;
			}
			const { lat, lon, name, country_code } = geoData.results[0];
			const wxRes = await fetch(`/api/weather?lat=${lat}&lng=${lon}`, { signal: abortController.signal });
			if (!wxRes.ok) throw new Error('Weather failed');
			const wxData = await wxRes.json();
			const current = wxData.data?.current;
			if (current) {
				const weatherCodes: Record<number, string> = {
					0: 'Clear', 1: 'Mostly clear', 2: 'Partly cloudy', 3: 'Overcast',
					45: 'Foggy', 51: 'Drizzle', 61: 'Rain', 63: 'Moderate rain', 65: 'Heavy rain',
					71: 'Snow', 80: 'Showers', 95: 'Thunderstorm'
				};
				const desc = weatherCodes[current.weather_code] ?? `Code ${current.weather_code}`;
				inlineResult = {
					type: 'weather',
					loading: false,
					data: `${name}, ${(country_code ?? '').toUpperCase()} — ${current.temperature_2m}°C, ${desc}, Wind ${current.wind_speed_10m} km/h, Humidity ${current.relative_humidity_2m}%`,
					error: null
				};
			} else {
				inlineResult = { type: 'weather', loading: false, data: null, error: wxData.offline ? 'Weather API offline — enable in Settings > API Toggles' : 'Weather data unavailable' };
			}
		} catch {
			if (inlineResult?.type === 'weather') {
				inlineResult = { type: 'weather', loading: false, data: null, error: 'Weather lookup failed' };
			}
		}
	}

	async function fetchCountry(name: string) {
		abortController?.abort();
		abortController = new AbortController();
		try {
			const res = await fetch(`/api/knowledge/search?q=${encodeURIComponent(name)}`, { signal: abortController.signal });
			if (!res.ok) throw new Error('Search failed');
			const data = await res.json();
			if (data.results?.length) {
				const c = data.results[0];
				const parts = [c.name];
				if (c.capital) parts.push(`Capital: ${c.capital}`);
				if (c.region) parts.push(c.region);
				if (c.population) parts.push(`Pop: ${(c.population / 1e6).toFixed(1)}M`);
				if (c.currencies) parts.push(c.currencies);
				inlineResult = { type: 'country', loading: false, data: parts.join(' | '), error: null };
			} else {
				// Fallback: navigate to knowledge page
				inlineResult = { type: 'country', loading: false, data: null, error: `No results for "${name}"` };
			}
		} catch {
			if (inlineResult?.type === 'country') {
				inlineResult = { type: 'country', loading: false, data: null, error: 'Country lookup failed' };
			}
		}
	}

	function handleSelect(command: Command) {
		closeCommandPalette();
		query = '';
		inlineResult = null;
		if (command.href) {
			goto(command.href);
		} else if (command.action) {
			command.action();
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'ArrowDown') {
			e.preventDefault();
			selectedIndex = Math.min(selectedIndex + 1, filtered.length - 1);
		} else if (e.key === 'ArrowUp') {
			e.preventDefault();
			selectedIndex = Math.max(selectedIndex - 1, 0);
		} else if (e.key === 'Enter' && filtered[selectedIndex]) {
			e.preventDefault();
			handleSelect(filtered[selectedIndex]);
		} else if (e.key === 'Escape') {
			closeCommandPalette();
			query = '';
			inlineResult = null;
		}
	}

	$effect(() => {
		if ($commandPaletteOpen && inputRef) {
			selectedIndex = 0;
			query = '';
			inlineResult = null;
			inputRef.focus();
		}
	});

	$effect(() => {
		function onKeydown(e: KeyboardEvent) {
			if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
				e.preventDefault();
				if ($commandPaletteOpen) {
					closeCommandPalette();
				} else {
					commandPaletteOpen.set(true);
				}
			}
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	$effect(() => {
		// Reset selection when query changes
		query;
		selectedIndex = 0;
	});
</script>

{#if $commandPaletteOpen}
	<!-- Backdrop -->
	<div class="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" role="presentation">
		<button class="absolute inset-0 w-full h-full cursor-default" onclick={() => { closeCommandPalette(); query = ''; }} tabindex="-1">&nbsp;</button>
	</div>

	<!-- Palette -->
	<div class="fixed inset-x-0 top-[18%] z-50 mx-auto w-full max-w-xl">
		<div
			class="overflow-hidden rounded-xl border border-surface-700/50 bg-surface-900 shadow-2xl shadow-black/40"
			role="dialog"
			aria-label="Command palette"
		>
			<!-- Search input -->
			<div class="border-b border-surface-700/50 px-4 py-3 flex items-center gap-3">
				<svg class="h-4 w-4 text-surface-500 shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
				<input
					bind:this={inputRef}
					bind:value={query}
					onkeydown={handleKeydown}
					type="text"
					placeholder="Search commands, tools, or try: 100 USD to EUR, weather Tokyo, country Japan..."
					class="w-full bg-transparent text-sm text-surface-200 placeholder-surface-500 outline-none"
				/>
				<kbd class="shrink-0 rounded border border-surface-700 bg-surface-800 px-1.5 py-0.5 font-mono text-[10px] text-surface-500">ESC</kbd>
			</div>

			<!-- Inline result -->
			{#if inlineResult}
				<div class="border-b border-surface-700/50 px-4 py-3">
					{#if inlineResult.loading}
						<div class="flex items-center gap-2 text-sm text-surface-400">
							<div class="h-3 w-3 animate-spin rounded-full border-2 border-accent-300 border-t-transparent"></div>
							<span>Looking up...</span>
						</div>
					{:else if inlineResult.data}
						<div class="flex items-center gap-2">
							<div class="h-1.5 w-1.5 rounded-full bg-accent-300"></div>
							<span class="text-sm font-medium text-accent-300">{inlineResult.data}</span>
						</div>
					{:else if inlineResult.error}
						<div class="flex items-center gap-2">
							<div class="h-1.5 w-1.5 rounded-full bg-red-400"></div>
							<span class="text-sm text-red-400">{inlineResult.error}</span>
						</div>
					{/if}
				</div>
			{/if}

			<!-- Hints -->
			{#if !query}
				<div class="border-b border-surface-700/50 px-4 py-2.5 flex flex-wrap gap-2">
					<span class="rounded bg-surface-800 px-2 py-0.5 font-mono text-[10px] text-surface-500">100 USD to EUR</span>
					<span class="rounded bg-surface-800 px-2 py-0.5 font-mono text-[10px] text-surface-500">weather Bangkok</span>
					<span class="rounded bg-surface-800 px-2 py-0.5 font-mono text-[10px] text-surface-500">country Japan</span>
				</div>
			{/if}

			<!-- Results list -->
			<div class="max-h-80 overflow-y-auto py-1">
				{#each filtered as command, i}
					<button
						class="flex w-full items-center gap-3 px-4 py-2.5 text-left text-[13px] transition-colors {i === selectedIndex
							? 'bg-accent-300/10 text-accent-300'
							: 'text-surface-400 hover:bg-surface-800 hover:text-surface-200'}"
						onclick={() => handleSelect(command)}
						onmouseenter={() => (selectedIndex = i)}
					>
						<svg class="h-4 w-4 shrink-0 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
							{#each command.icon.split(' M') as segment, si}
								<path d="{si === 0 ? segment : 'M' + segment}" />
							{/each}
						</svg>
						<span class="flex-1">{command.label}</span>
						<span class="font-mono text-[10px] uppercase tracking-wider text-surface-600">{command.category}</span>
					</button>
				{/each}

				{#if filtered.length === 0 && !inlineResult}
					<p class="px-4 py-8 text-center text-sm text-surface-500">No matching commands</p>
				{/if}
			</div>
		</div>
	</div>
{/if}
