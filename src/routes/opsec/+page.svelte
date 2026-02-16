<script lang="ts">
	interface CheckItem {
		id: string;
		label: string;
		checked: boolean;
	}

	interface Category {
		name: string;
		icon: string;
		items: CheckItem[];
	}

	let categories = $state<Category[]>([
		{
			name: 'Digital Hygiene',
			icon: '&#x2261;',
			items: [
				{ id: 'dh-1', label: 'VPN active and verified', checked: false },
				{ id: 'dh-2', label: 'Location services disabled', checked: false },
				{ id: 'dh-3', label: 'Social media logged out on all devices', checked: false },
				{ id: 'dh-4', label: 'Bluetooth off', checked: false },
				{ id: 'dh-5', label: 'WiFi auto-connect disabled', checked: false },
				{ id: 'dh-6', label: 'Browser history cleared', checked: false },
				{ id: 'dh-7', label: 'Sensitive files encrypted or removed', checked: false },
				{ id: 'dh-8', label: 'Device lock screen enabled with strong PIN', checked: false }
			]
		},
		{
			name: 'Physical Security',
			icon: '&#x229E;',
			items: [
				{ id: 'ps-1', label: 'Room sweep completed (visual inspection)', checked: false },
				{ id: 'ps-2', label: 'Door lock verified (deadbolt engaged)', checked: false },
				{ id: 'ps-3', label: 'Window locks checked', checked: false },
				{ id: 'ps-4', label: 'Valuables secured (safe or concealed)', checked: false },
				{ id: 'ps-5', label: 'Emergency exits identified (2 routes minimum)', checked: false },
				{ id: 'ps-6', label: 'Door wedge or portable lock deployed', checked: false },
				{ id: 'ps-7', label: 'Peephole checked (not obscured from outside)', checked: false }
			]
		},
		{
			name: 'Travel Documents',
			icon: '&#x25A3;',
			items: [
				{ id: 'td-1', label: 'Passport stored securely', checked: false },
				{ id: 'td-2', label: 'Document copies encrypted in vault', checked: false },
				{ id: 'td-3', label: 'Emergency contacts memorized or secured', checked: false },
				{ id: 'td-4', label: 'Nearest embassy/consulate address noted', checked: false },
				{ id: 'td-5', label: 'Travel insurance details accessible', checked: false }
			]
		},
		{
			name: 'Situational Awareness',
			icon: '&#x25CE;',
			items: [
				{ id: 'sa-1', label: 'Local emergency number known', checked: false },
				{ id: 'sa-2', label: 'Nearest hospital/clinic identified', checked: false },
				{ id: 'sa-3', label: 'Primary and alternate routes planned', checked: false },
				{ id: 'sa-4', label: 'Check-in schedule established', checked: false },
				{ id: 'sa-5', label: 'Local customs and laws reviewed', checked: false },
				{ id: 'sa-6', label: 'Cash reserve secured separately from wallet', checked: false }
			]
		}
	]);

	let checkedCount = $derived(
		categories.reduce((sum, c) => sum + c.items.filter((i) => i.checked).length, 0)
	);
	let totalCount = $derived(categories.reduce((sum, c) => sum + c.items.length, 0));
	let score = $derived(totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0);

	let scoreColor = $derived(
		score >= 80 ? 'emerald' : score >= 50 ? 'amber' : 'red'
	);
	let scoreLabel = $derived(
		score >= 80 ? 'Strong' : score >= 50 ? 'Moderate' : 'Weak'
	);

	// Persist checklist state to localStorage
	$effect(() => {
		const saved = localStorage.getItem('opsec-checklist');
		if (saved) {
			try {
				const checked = JSON.parse(saved) as string[];
				for (const cat of categories) {
					for (const item of cat.items) {
						item.checked = checked.includes(item.id);
					}
				}
			} catch { /* ignore */ }
		}
	});

	function saveState() {
		const checked = categories
			.flatMap((c) => c.items)
			.filter((i) => i.checked)
			.map((i) => i.id);
		localStorage.setItem('opsec-checklist', JSON.stringify(checked));
	}

	function resetAll() {
		for (const cat of categories) {
			for (const item of cat.items) {
				item.checked = false;
			}
		}
		localStorage.removeItem('opsec-checklist');
	}
</script>

<svelte:head>
	<title>OPSEC - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-surface-100">OPSEC Dashboard</h1>
			<p class="mt-1 text-sm text-surface-400">Security posture overview</p>
		</div>
		<button
			onclick={resetAll}
			class="rounded-lg border border-surface-700 px-4 py-2 text-sm text-surface-400 hover:bg-surface-800 hover:text-surface-200"
		>
			Reset All
		</button>
	</div>

	<!-- Score Card -->
	<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-6">
		<div class="flex items-center gap-6">
			<div
				class="flex h-20 w-20 items-center justify-center rounded-full border-3 border-{scoreColor}-500"
			>
				<div class="text-center">
					<span class="text-2xl font-bold text-{scoreColor}-400">{score}</span>
					<span class="text-xs text-{scoreColor}-400">%</span>
				</div>
			</div>
			<div>
				<p class="text-lg font-medium text-surface-200">
					Security Score: <span class="text-{scoreColor}-400">{scoreLabel}</span>
				</p>
				<p class="text-sm text-surface-400">{checkedCount} of {totalCount} items verified</p>
				<div class="mt-2 h-2 w-48 overflow-hidden rounded-full bg-surface-800">
					<div
						class="h-full rounded-full bg-{scoreColor}-500 transition-all duration-300"
						style="width: {score}%"
					></div>
				</div>
			</div>
		</div>
	</div>

	<!-- Category Checklists -->
	<div class="grid grid-cols-1 gap-4 lg:grid-cols-2">
		{#each categories as category}
			{@const catChecked = category.items.filter((i) => i.checked).length}
			{@const catTotal = category.items.length}
			{@const catComplete = catChecked === catTotal}
			<div
				class="rounded-lg border bg-surface-900 p-5 {catComplete
					? 'border-emerald-700/50'
					: 'border-surface-800'}"
			>
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-sm font-medium uppercase tracking-wider text-surface-400">
						<span>{@html category.icon}</span>
						{category.name}
					</h3>
					<span class="text-xs {catComplete ? 'text-emerald-400' : 'text-surface-500'}">
						{catChecked}/{catTotal}
					</span>
				</div>
				<div class="space-y-1">
					{#each category.items as item}
						<label
							class="flex cursor-pointer items-center gap-3 rounded-md px-2 py-1.5 hover:bg-surface-800"
						>
							<input
								type="checkbox"
								bind:checked={item.checked}
								onchange={saveState}
								class="h-4 w-4 rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500"
							/>
							<span
								class="text-sm {item.checked
									? 'text-surface-500 line-through'
									: 'text-surface-300'}"
							>
								{item.label}
							</span>
						</label>
					{/each}
				</div>
			</div>
		{/each}
	</div>
</div>
