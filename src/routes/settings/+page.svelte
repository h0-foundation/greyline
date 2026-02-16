<script lang="ts">
	import { theme, toggleTheme } from '$lib/stores/app.js';

	let units = $state<'metric' | 'imperial'>('metric');
	let saving = $state(false);

	$effect(() => {
		fetch('/api/settings')
			.then((r) => r.json())
			.then((data) => {
				if (data.settings?.units) {
					try {
						units = JSON.parse(data.settings.units);
					} catch {
						units = data.settings.units;
					}
				}
			});
	});

	async function saveSetting(key: string, value: string) {
		saving = true;
		await fetch('/api/settings', {
			method: 'PUT',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ key, value })
		});
		saving = false;
	}

	function handleThemeToggle() {
		toggleTheme();
		saveSetting('theme', $theme === 'dark' ? '"light"' : '"dark"');
	}

	function handleUnitsChange() {
		units = units === 'metric' ? 'imperial' : 'metric';
		saveSetting('units', JSON.stringify(units));
	}
</script>

<svelte:head>
	<title>Settings - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div>
		<h1 class="text-xl font-semibold text-surface-100">Settings</h1>
		<p class="mt-1 text-sm text-surface-400">Application preferences</p>
	</div>

	<div class="space-y-4">
		<!-- Theme -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="font-medium text-surface-200">Theme</h3>
					<p class="text-sm text-surface-400">Switch between dark and light mode</p>
				</div>
				<button
					onclick={handleThemeToggle}
					class="rounded-lg border border-surface-700 px-4 py-2 text-sm text-surface-300 hover:bg-surface-800"
				>
					{$theme === 'dark' ? 'Light Mode' : 'Dark Mode'}
				</button>
			</div>
		</div>

		<!-- Units -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<div class="flex items-center justify-between">
				<div>
					<h3 class="font-medium text-surface-200">Units</h3>
					<p class="text-sm text-surface-400">Distance and temperature units</p>
				</div>
				<button
					onclick={handleUnitsChange}
					class="rounded-lg border border-surface-700 px-4 py-2 text-sm text-surface-300 hover:bg-surface-800"
				>
					{units === 'metric' ? 'Metric (km, °C)' : 'Imperial (mi, °F)'}
				</button>
			</div>
		</div>

		<!-- Navigation links -->
		<a
			href="/settings/api"
			class="block rounded-lg border border-surface-700/50 bg-surface-800 p-5 hover:border-surface-700"
		>
			<h3 class="font-medium text-surface-200">API Toggles</h3>
			<p class="text-sm text-surface-400">Enable or disable external API connections</p>
		</a>

		<a
			href="/settings/data"
			class="block rounded-lg border border-surface-700/50 bg-surface-800 p-5 hover:border-surface-700"
		>
			<h3 class="font-medium text-surface-200">Data Management</h3>
			<p class="text-sm text-surface-400">Manage offline data bundles and storage</p>
		</a>
	</div>

	{#if saving}
		<p class="text-xs text-surface-500">Saving...</p>
	{/if}
</div>
