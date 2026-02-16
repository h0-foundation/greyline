<script lang="ts">
	interface CheckSection {
		name: string;
		items: { id: string; label: string; detail: string; checked: boolean }[];
	}

	let sections = $state<CheckSection[]>([
		{
			name: 'Room Selection',
			items: [
				{ id: 'rs-1', label: 'Floor 2-6 preferred', detail: 'Above ground-floor access, below fire ladder reach', checked: false },
				{ id: 'rs-2', label: 'Room not at end of hallway', detail: 'Avoid dead-end corridors with single exit', checked: false },
				{ id: 'rs-3', label: 'Near stairwell (not elevator)', detail: 'Stairs are faster and work during power outages', checked: false },
				{ id: 'rs-4', label: 'Away from construction or renovation', detail: 'Reduces unauthorized access via scaffolding', checked: false }
			]
		},
		{
			name: 'Door Security',
			items: [
				{ id: 'ds-1', label: 'Deadbolt functional', detail: 'Test the deadbolt engages fully', checked: false },
				{ id: 'ds-2', label: 'Door chain or swing bar present', detail: 'Secondary locking mechanism for when occupied', checked: false },
				{ id: 'ds-3', label: 'Peephole clear and unobstructed', detail: 'Check from both sides — ensure it is not covered externally', checked: false },
				{ id: 'ds-4', label: 'Door frame solid (no gaps)', detail: 'Check for pry marks or looseness', checked: false },
				{ id: 'ds-5', label: 'Portable door lock or wedge deployed', detail: 'Carry a portable door security device', checked: false },
				{ id: 'ds-6', label: 'Connecting door locked and blocked', detail: 'If adjoining room exists, verify it is secured from your side', checked: false }
			]
		},
		{
			name: 'Window Security',
			items: [
				{ id: 'ws-1', label: 'Windows lock from inside', detail: 'Test all window locks', checked: false },
				{ id: 'ws-2', label: 'No external access (balcony, ledge, tree)', detail: 'Check if windows can be reached from outside', checked: false },
				{ id: 'ws-3', label: 'Curtains fully close (no gaps)', detail: 'Prevent observation from outside', checked: false }
			]
		},
		{
			name: 'Room Inspection',
			items: [
				{ id: 'ri-1', label: 'Safe present and functional', detail: 'Test the in-room safe with your own code', checked: false },
				{ id: 'ri-2', label: 'Smoke detector present', detail: 'Verify it exists and has not been disabled', checked: false },
				{ id: 'ri-3', label: 'Fire extinguisher on floor', detail: 'Note its location relative to your room', checked: false },
				{ id: 'ri-4', label: 'No signs of tampering', detail: 'Check vents, smoke detectors, clocks, mirrors for anomalies', checked: false },
				{ id: 'ri-5', label: 'Phone works (call front desk)', detail: 'Verify room phone connects to reception', checked: false }
			]
		},
		{
			name: 'Emergency Preparedness',
			items: [
				{ id: 'ep-1', label: 'Two exit routes identified', detail: 'Walk both routes — do not rely on signs alone', checked: false },
				{ id: 'ep-2', label: 'Stairwell doors open from inside', detail: 'Verify stairwell re-entry doors are not locked', checked: false },
				{ id: 'ep-3', label: 'Go-bag packed and positioned near door', detail: 'Passport, cash, phone, key items ready to grab', checked: false },
				{ id: 'ep-4', label: 'Shoes and light source by bed', detail: 'For nighttime evacuation over broken glass', checked: false },
				{ id: 'ep-5', label: 'Local emergency number noted', detail: 'May differ from home country (not always 911)', checked: false }
			]
		}
	]);

	let checkedCount = $derived(
		sections.reduce((sum, s) => sum + s.items.filter((i) => i.checked).length, 0)
	);
	let totalCount = $derived(sections.reduce((sum, s) => sum + s.items.length, 0));
	let complete = $derived(checkedCount === totalCount);

	// Persist to localStorage
	$effect(() => {
		const saved = localStorage.getItem('hotel-security');
		if (saved) {
			try {
				const ids = JSON.parse(saved) as string[];
				for (const s of sections) {
					for (const item of s.items) {
						item.checked = ids.includes(item.id);
					}
				}
			} catch { /* ignore */ }
		}
	});

	function save() {
		const ids = sections.flatMap((s) => s.items).filter((i) => i.checked).map((i) => i.id);
		localStorage.setItem('hotel-security', JSON.stringify(ids));
	}

	function resetAll() {
		for (const s of sections) {
			for (const item of s.items) {
				item.checked = false;
			}
		}
		localStorage.removeItem('hotel-security');
	}
</script>

<svelte:head>
	<title>Hotel Security - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<a href="/tools" class="text-sm text-accent-400 hover:text-accent-300">&larr; Tools</a>
			<h1 class="mt-2 text-xl font-semibold text-surface-100">Hotel Security Checklist</h1>
			<p class="mt-1 text-sm text-surface-400">Room security verification protocol</p>
		</div>
		<div class="flex items-center gap-3">
			<span class="text-sm {complete ? 'text-emerald-400' : 'text-surface-400'}">
				{checkedCount}/{totalCount}
			</span>
			<button
				onclick={resetAll}
				class="rounded-lg border border-surface-700 px-3 py-1.5 text-sm text-surface-400 hover:bg-surface-800"
			>
				Reset
			</button>
		</div>
	</div>

	{#if complete}
		<div class="rounded-lg border border-emerald-700/50 bg-emerald-900/10 px-4 py-3 text-sm text-emerald-300">
			Room security check complete. All items verified.
		</div>
	{/if}

	{#each sections as section}
		{@const sChecked = section.items.filter((i) => i.checked).length}
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<div class="mb-3 flex items-center justify-between">
				<h3 class="text-sm font-medium uppercase tracking-wider text-surface-400">
					{section.name}
				</h3>
				<span class="text-xs {sChecked === section.items.length ? 'text-emerald-400' : 'text-surface-500'}">
					{sChecked}/{section.items.length}
				</span>
			</div>
			<div class="space-y-1">
				{#each section.items as item}
					<label
						class="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-surface-800"
					>
						<input
							type="checkbox"
							bind:checked={item.checked}
							onchange={save}
							class="mt-0.5 h-4 w-4 rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500"
						/>
						<div>
							<span class="text-sm {item.checked ? 'text-surface-500 line-through' : 'text-surface-200'}">
								{item.label}
							</span>
							<p class="text-xs text-surface-500">{item.detail}</p>
						</div>
					</label>
				{/each}
			</div>
		</div>
	{/each}
</div>
