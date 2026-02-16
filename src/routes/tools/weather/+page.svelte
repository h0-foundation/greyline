<script lang="ts">
	interface WeatherCurrent {
		temperature_2m: number;
		weather_code: number;
		wind_speed_10m: number;
		relative_humidity_2m: number;
	}

	interface WeatherDaily {
		time: string[];
		temperature_2m_max: number[];
		temperature_2m_min: number[];
		weather_code: number[];
		precipitation_sum: number[];
	}

	interface WeatherData {
		current: WeatherCurrent;
		daily: WeatherDaily;
	}

	interface WeatherResponse {
		data?: WeatherData;
		cached?: boolean;
		offline?: boolean;
		message?: string;
		error?: string;
	}

	let lat = $state('');
	let lng = $state('');
	let loading = $state(false);
	let result = $state<WeatherResponse | null>(null);
	let fetchError = $state('');

	let hasData = $derived(result?.data != null);
	let isOffline = $derived(result?.offline === true);

	function weatherDesc(code: number): string {
		const map: Record<number, string> = {
			0: 'Clear sky', 1: 'Mainly clear', 2: 'Partly cloudy', 3: 'Overcast',
			45: 'Foggy', 48: 'Rime fog', 51: 'Light drizzle', 53: 'Moderate drizzle',
			55: 'Dense drizzle', 61: 'Slight rain', 63: 'Moderate rain', 65: 'Heavy rain',
			71: 'Slight snow', 73: 'Moderate snow', 75: 'Heavy snow', 77: 'Snow grains',
			80: 'Slight showers', 81: 'Moderate showers', 82: 'Violent showers',
			85: 'Slight snow showers', 86: 'Heavy snow showers',
			95: 'Thunderstorm', 96: 'Thunderstorm + hail', 99: 'Thunderstorm + heavy hail'
		};
		return map[code] ?? `Code ${code}`;
	}

	function useDefault() {
		lat = '40.71';
		lng = '-74.01';
	}

	async function fetchWeather() {
		const latVal = parseFloat(lat);
		const lngVal = parseFloat(lng);

		if (isNaN(latVal) || isNaN(lngVal)) {
			fetchError = 'Please enter valid latitude and longitude values.';
			return;
		}

		loading = true;
		fetchError = '';
		result = null;

		try {
			const res = await fetch(`/api/weather?lat=${latVal}&lng=${lngVal}`);
			const data: WeatherResponse = await res.json();

			if (!res.ok) {
				fetchError = data.error ?? 'Request failed';
			} else {
				result = data;
			}
		} catch {
			fetchError = 'Network error: could not reach the weather API.';
		}

		loading = false;
	}

	function formatDate(dateStr: string): string {
		const d = new Date(dateStr + 'T00:00:00');
		return d.toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' });
	}
</script>

<svelte:head>
	<title>Weather - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<a href="/tools" class="text-sm text-accent-400 hover:text-accent-300">&larr; Tools</a>
		<h1 class="mt-2 text-xl font-semibold text-surface-100">Weather</h1>
		<p class="mt-1 text-sm text-surface-400">Current conditions and 16-day forecast via Open-Meteo</p>
	</div>

	<!-- Input form -->
	<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
		<div class="flex flex-wrap items-end gap-3">
			<div>
				<label for="lat" class="block text-xs font-medium uppercase tracking-wider text-surface-400">Latitude</label>
				<input
					id="lat"
					type="text"
					bind:value={lat}
					placeholder="40.71"
					class="mt-1 w-32 rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 placeholder-surface-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
				/>
			</div>
			<div>
				<label for="lng" class="block text-xs font-medium uppercase tracking-wider text-surface-400">Longitude</label>
				<input
					id="lng"
					type="text"
					bind:value={lng}
					placeholder="-74.01"
					class="mt-1 w-32 rounded-md border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-200 placeholder-surface-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500"
				/>
			</div>
			<button
				onclick={useDefault}
				class="rounded-md border border-surface-700 px-3 py-2 text-sm text-surface-400 hover:bg-surface-800"
			>
				Use default (NYC)
			</button>
			<button
				onclick={fetchWeather}
				disabled={loading}
				class="rounded-md bg-accent-700 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600 disabled:opacity-50"
			>
				{loading ? 'Fetching...' : 'Fetch Weather'}
			</button>
		</div>
	</div>

	<!-- Error message -->
	{#if fetchError}
		<div class="rounded-lg border border-red-700/50 bg-red-900/10 px-4 py-3 text-sm text-red-300">
			{fetchError}
		</div>
	{/if}

	<!-- Offline state -->
	{#if isOffline}
		<div class="rounded-lg border border-amber-700/50 bg-amber-900/10 px-4 py-3">
			<div class="flex items-center gap-2">
				<span class="inline-block h-2 w-2 rounded-full bg-amber-400"></span>
				<span class="text-sm font-medium text-amber-300">Offline</span>
			</div>
			<p class="mt-1 text-sm text-amber-400/80">
				{result?.message ?? 'Weather API is currently disabled. Enable it in Settings to fetch live data.'}
			</p>
		</div>
	{/if}

	<!-- Results -->
	{#if hasData}
		{@const weather = result!.data!}

		<!-- Freshness badge -->
		<div class="flex items-center gap-2">
			{#if result!.cached}
				<span class="inline-flex items-center gap-1.5 rounded-full bg-surface-800 px-3 py-1 text-xs font-medium text-surface-400">
					<span class="h-1.5 w-1.5 rounded-full bg-surface-500"></span>
					Cached
				</span>
			{:else}
				<span class="inline-flex items-center gap-1.5 rounded-full bg-emerald-900/30 px-3 py-1 text-xs font-medium text-emerald-400">
					<span class="h-1.5 w-1.5 rounded-full bg-emerald-400"></span>
					Live
				</span>
			{/if}
		</div>

		<!-- Current conditions -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 text-sm font-medium uppercase tracking-wider text-surface-400">Current Conditions</h2>
			<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
				<div>
					<p class="text-xs text-surface-500">Temperature</p>
					<p class="mt-1 text-2xl font-semibold text-surface-100">{weather.current.temperature_2m}&deg;C</p>
				</div>
				<div>
					<p class="text-xs text-surface-500">Wind Speed</p>
					<p class="mt-1 text-2xl font-semibold text-surface-100">{weather.current.wind_speed_10m} km/h</p>
				</div>
				<div>
					<p class="text-xs text-surface-500">Humidity</p>
					<p class="mt-1 text-2xl font-semibold text-surface-100">{weather.current.relative_humidity_2m}%</p>
				</div>
				<div>
					<p class="text-xs text-surface-500">Conditions</p>
					<p class="mt-1 text-lg font-medium text-surface-200">{weatherDesc(weather.current.weather_code)}</p>
				</div>
			</div>
		</div>

		<!-- 16-day forecast -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 text-sm font-medium uppercase tracking-wider text-surface-400">16-Day Forecast</h2>
			<div class="overflow-x-auto">
				<table class="w-full text-left text-sm">
					<thead class="border-b border-surface-800">
						<tr>
							<th class="px-3 py-2 font-medium text-surface-300">Date</th>
							<th class="px-3 py-2 font-medium text-surface-300">Conditions</th>
							<th class="px-3 py-2 font-medium text-surface-300 text-right">High</th>
							<th class="px-3 py-2 font-medium text-surface-300 text-right">Low</th>
							<th class="px-3 py-2 font-medium text-surface-300 text-right">Precip</th>
						</tr>
					</thead>
					<tbody class="divide-y divide-surface-800">
						{#each weather.daily.time as date, i}
							<tr class="hover:bg-surface-800/50">
								<td class="whitespace-nowrap px-3 py-2 text-surface-200">{formatDate(date)}</td>
								<td class="px-3 py-2 text-surface-400">{weatherDesc(weather.daily.weather_code[i])}</td>
								<td class="px-3 py-2 text-right text-surface-200">{weather.daily.temperature_2m_max[i]}&deg;C</td>
								<td class="px-3 py-2 text-right text-surface-400">{weather.daily.temperature_2m_min[i]}&deg;C</td>
								<td class="px-3 py-2 text-right text-surface-400">{weather.daily.precipitation_sum[i]} mm</td>
							</tr>
						{/each}
					</tbody>
				</table>
			</div>
		</div>
	{/if}
</div>
