<script lang="ts">
	import { page } from '$app/stores';
	import { goto } from '$app/navigation';
	import { api } from '$lib/services/api-client.js';
	import type {
		Trip,
		TripStatus,
		Destination,
		Checklist,
		ChecklistItem,
		ChecklistType,
		CountryProfile,
		Advisory
	} from '$lib/types/index.js';
	import Button from '$lib/components/ui/Button.svelte';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';
	import Modal from '$lib/components/ui/Modal.svelte';

	interface TripWithDestinations extends Trip {
		destinations: Destination[];
	}

	// ---------------------------------------------------------------------------
	// Checklist helpers
	// ---------------------------------------------------------------------------

	/** Parse the items field which may be a JSON string or already an array. */
	function parseItems(raw: ChecklistItem[] | string): ChecklistItem[] {
		if (typeof raw === 'string') {
			try {
				return JSON.parse(raw) as ChecklistItem[];
			} catch {
				return [];
			}
		}
		return raw ?? [];
	}

	const checklistTypeConfig: Record<
		string,
		{ label: string; color: string; badgeVariant: 'default' | 'info' | 'success' | 'warning' | 'danger'; icon: string }
	> = {
		packing: { label: 'Packing', color: 'text-blue-400', badgeVariant: 'info', icon: 'M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4' },
		'hotel-security': { label: 'Hotel Security', color: 'text-amber-400', badgeVariant: 'warning', icon: 'M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6' },
		'border-crossing': { label: 'Border Crossing', color: 'text-red-400', badgeVariant: 'danger', icon: 'M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z' },
		'digital-hygiene': { label: 'Digital Hygiene', color: 'text-emerald-400', badgeVariant: 'success', icon: 'M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z' },
		custom: { label: 'Custom', color: 'text-surface-400', badgeVariant: 'default', icon: 'M4 6h16M4 10h16M4 14h16M4 18h16' }
	};

	function getTypeConfig(type: string | null) {
		return checklistTypeConfig[type ?? 'custom'] ?? checklistTypeConfig.custom;
	}

	function advisoryBadgeVariant(level: number): 'default' | 'info' | 'success' | 'warning' | 'danger' {
		if (level === 1) return 'success';
		if (level === 2) return 'warning';
		if (level === 3) return 'danger';
		if (level === 4) return 'danger';
		return 'default';
	}

	function advisoryLabel(level: number): string {
		if (level === 1) return 'Level 1 - Exercise Normal Caution';
		if (level === 2) return 'Level 2 - Exercise Increased Caution';
		if (level === 3) return 'Level 3 - Reconsider Travel';
		if (level === 4) return 'Level 4 - Do Not Travel';
		return 'Unknown';
	}

	// ---------------------------------------------------------------------------
	// State
	// ---------------------------------------------------------------------------

	let trip = $state<Trip | null>(null);
	let destinations = $state<Destination[]>([]);
	let checklists = $state<Checklist[]>([]);
	let advisories = $state<Map<string, Advisory>>(new Map());
	let loading = $state(true);
	let error = $state('');

	// Inline editing
	let editingName = $state(false);
	let editName = $state('');
	let editingNotes = $state(false);
	let editNotes = $state('');
	let editingDates = $state(false);
	let editStartDate = $state('');
	let editEndDate = $state('');

	// Destination form
	let showDestModal = $state(false);
	let destCity = $state('');
	let destCountryCode = $state('');
	let destArrival = $state('');
	let destDeparture = $state('');
	let destNotes = $state('');
	let destSubmitting = $state(false);

	// Delete confirmation
	let deleteDestId = $state<string | null>(null);

	// Checklist UI state
	let expandedDestinations = $state<Set<string>>(new Set());
	let expandedChecklists = $state<Set<string>>(new Set());
	let savingChecklist = $state<Set<string>>(new Set());
	let regeneratingDest = $state<Set<string>>(new Set());
	let generatingDest = $state<Set<string>>(new Set());
	let confirmRegenerateDestId = $state<string | null>(null);

	// ---------------------------------------------------------------------------
	// Derived
	// ---------------------------------------------------------------------------

	const tripId = $derived($page.params.id);

	const statusVariant = $derived(
		trip?.status === 'planning'
			? 'info'
			: trip?.status === 'active'
				? 'success'
				: 'default'
	);

	const statusLabel = $derived(
		trip ? trip.status.charAt(0).toUpperCase() + trip.status.slice(1) : ''
	);

	const statusFlow: TripStatus[] = ['planning', 'active', 'completed', 'archived'];

	const nextStatus = $derived(() => {
		if (!trip) return null;
		const idx = statusFlow.indexOf(trip.status);
		return idx < statusFlow.length - 1 ? statusFlow[idx + 1] : null;
	});

	const prevStatus = $derived(() => {
		if (!trip) return null;
		const idx = statusFlow.indexOf(trip.status);
		return idx > 0 ? statusFlow[idx - 1] : null;
	});

	/** Map of destination_id -> Checklist[] */
	const checklistsByDest = $derived(() => {
		const map = new Map<string, Checklist[]>();
		for (const cl of checklists) {
			const destId = cl.destination_id ?? '';
			if (!map.has(destId)) map.set(destId, []);
			map.get(destId)!.push(cl);
		}
		return map;
	});

	/** Aggregate stats across all checklists. */
	const overallStats = $derived(() => {
		let totalChecklists = checklists.length;
		let totalItems = 0;
		let totalChecked = 0;
		const byType: Record<string, { total: number; checked: number }> = {};

		for (const cl of checklists) {
			const items = parseItems(cl.items);
			const checked = items.filter((i) => i.checked).length;
			totalItems += items.length;
			totalChecked += checked;

			const type = cl.type ?? 'custom';
			if (!byType[type]) byType[type] = { total: 0, checked: 0 };
			byType[type].total += items.length;
			byType[type].checked += checked;
		}

		const percent = totalItems > 0 ? Math.round((totalChecked / totalItems) * 100) : 0;
		return { totalChecklists, totalItems, totalChecked, percent, byType };
	});

	/** Stats for a single destination's checklists. */
	function destStats(destId: string) {
		const cls = checklistsByDest().get(destId) ?? [];
		let totalItems = 0;
		let totalChecked = 0;
		for (const cl of cls) {
			const items = parseItems(cl.items);
			totalChecked += items.filter((i) => i.checked).length;
			totalItems += items.length;
		}
		return { count: cls.length, totalItems, totalChecked };
	}

	// ---------------------------------------------------------------------------
	// Data loading
	// ---------------------------------------------------------------------------

	async function loadTrip() {
		loading = true;
		error = '';
		try {
			const data = await api.get<TripWithDestinations>(`/api/trip/${tripId}`);
			trip = {
				id: data.id,
				name: data.name,
				status: data.status,
				start_date: data.start_date,
				end_date: data.end_date,
				notes: data.notes,
				created_at: data.created_at,
				updated_at: data.updated_at
			};
			destinations = data.destinations ?? [];
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load trip';
		} finally {
			loading = false;
		}
	}

	async function loadChecklists() {
		try {
			const data = await api.get<Checklist[]>(`/api/trip/${tripId}/checklists`);
			checklists = data;
		} catch {
			// checklists may not exist yet -- not a fatal error
			checklists = [];
		}
	}

	async function loadAdvisories() {
		try {
			const countryCodes = new Set(
				destinations.filter((d) => d.country_code).map((d) => d.country_code!.toUpperCase())
			);
			if (countryCodes.size === 0) return;

			const profiles = await api.get<CountryProfile[]>('/api/advisories');
			const map = new Map<string, Advisory>();
			for (const p of profiles) {
				if (p.advisory && countryCodes.has(p.country_code.toUpperCase())) {
					map.set(p.country_code.toUpperCase(), p.advisory);
				}
			}
			advisories = map;
		} catch {
			// advisory data may not be available
		}
	}

	$effect(() => {
		// Re-run when tripId changes
		tripId;
		loadTrip().then(() => {
			loadChecklists();
			loadAdvisories();
		});
	});

	// ---------------------------------------------------------------------------
	// Trip updates
	// ---------------------------------------------------------------------------

	async function updateField(fields: Record<string, unknown>) {
		if (!trip) return;
		try {
			const updated = await api.put<Trip>(`/api/trip/${trip.id}`, fields);
			trip = updated;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to update trip';
		}
	}

	function startEditName() {
		if (!trip) return;
		editName = trip.name;
		editingName = true;
	}

	async function saveName() {
		if (!editName.trim()) return;
		await updateField({ name: editName.trim() });
		editingName = false;
	}

	function cancelEditName() {
		editingName = false;
	}

	function startEditNotes() {
		editNotes = trip?.notes ?? '';
		editingNotes = true;
	}

	async function saveNotes() {
		await updateField({ notes: editNotes.trim() || null });
		editingNotes = false;
	}

	function cancelEditNotes() {
		editingNotes = false;
	}

	function startEditDates() {
		editStartDate = trip?.start_date ?? '';
		editEndDate = trip?.end_date ?? '';
		editingDates = true;
	}

	async function saveDates() {
		await updateField({
			start_date: editStartDate || null,
			end_date: editEndDate || null
		});
		editingDates = false;
	}

	function cancelEditDates() {
		editingDates = false;
	}

	async function changeStatus(newStatus: TripStatus) {
		await updateField({ status: newStatus });
	}

	// ---------------------------------------------------------------------------
	// Destination management
	// ---------------------------------------------------------------------------

	function resetDestForm() {
		destCity = '';
		destCountryCode = '';
		destArrival = '';
		destDeparture = '';
		destNotes = '';
		destSubmitting = false;
	}

	async function handleAddDestination(e: SubmitEvent) {
		e.preventDefault();
		if (!destCity.trim() && !destCountryCode.trim()) return;
		destSubmitting = true;
		try {
			const dest = await api.post<Destination>(`/api/trip/${tripId}/destinations`, {
				city: destCity.trim() || null,
				country_code: destCountryCode.trim().toUpperCase() || null,
				arrival_date: destArrival || null,
				departure_date: destDeparture || null,
				notes: destNotes.trim() || null,
				sort_order: destinations.length
			});
			destinations = [...destinations, dest];
			showDestModal = false;
			resetDestForm();
			// Reload checklists -- server may have auto-generated them for the new destination
			await loadChecklists();
			await loadAdvisories();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to add destination';
			destSubmitting = false;
		}
	}

	async function handleDeleteDestination(id: string) {
		try {
			await api.delete(`/api/trip/${tripId}/destinations`, { id });
			destinations = destinations.filter((d) => d.id !== id);
			// Remove checklists that belonged to this destination
			checklists = checklists.filter((c) => c.destination_id !== id);
			deleteDestId = null;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete destination';
		}
	}

	async function moveDestination(index: number, direction: 'up' | 'down') {
		const swapIndex = direction === 'up' ? index - 1 : index + 1;
		if (swapIndex < 0 || swapIndex >= destinations.length) return;

		const updated = [...destinations];
		[updated[index], updated[swapIndex]] = [updated[swapIndex], updated[index]];

		updated[index].sort_order = index;
		updated[swapIndex].sort_order = swapIndex;
		destinations = updated;

		try {
			await api.put(`/api/trip/${tripId}/destinations`, {
				id: updated[index].id,
				sort_order: index
			});
			await api.put(`/api/trip/${tripId}/destinations`, {
				id: updated[swapIndex].id,
				sort_order: swapIndex
			});
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to reorder';
			await loadTrip();
		}
	}

	// ---------------------------------------------------------------------------
	// Checklist operations
	// ---------------------------------------------------------------------------

	function toggleDestExpanded(destId: string) {
		const next = new Set(expandedDestinations);
		if (next.has(destId)) {
			next.delete(destId);
		} else {
			next.add(destId);
		}
		expandedDestinations = next;
	}

	function toggleChecklistExpanded(clId: string) {
		const next = new Set(expandedChecklists);
		if (next.has(clId)) {
			next.delete(clId);
		} else {
			next.add(clId);
		}
		expandedChecklists = next;
	}

	async function toggleItem(checklist: Checklist, itemId: string) {
		const items = parseItems(checklist.items);
		const updatedItems = items.map((item) =>
			item.id === itemId ? { ...item, checked: !item.checked } : item
		);

		// Optimistic update
		checklists = checklists.map((cl) =>
			cl.id === checklist.id ? { ...cl, items: updatedItems } : cl
		);

		const saving = new Set(savingChecklist);
		saving.add(checklist.id);
		savingChecklist = saving;

		try {
			await api.put(`/api/trip/${tripId}/checklists`, {
				id: checklist.id,
				items: updatedItems
			});
		} catch (e) {
			// Revert on failure
			checklists = checklists.map((cl) =>
				cl.id === checklist.id ? { ...cl, items } : cl
			);
			error = e instanceof Error ? e.message : 'Failed to update checklist';
		} finally {
			const done = new Set(savingChecklist);
			done.delete(checklist.id);
			savingChecklist = done;
		}
	}

	async function regenerateChecklists(destId: string) {
		confirmRegenerateDestId = null;
		const regen = new Set(regeneratingDest);
		regen.add(destId);
		regeneratingDest = regen;

		try {
			await api.post(`/api/trip/${tripId}/checklists`, {
				action: 'regenerate',
				destination_id: destId
			});
			await loadChecklists();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to regenerate checklists';
		} finally {
			const done = new Set(regeneratingDest);
			done.delete(destId);
			regeneratingDest = done;
		}
	}

	async function generateChecklists(destId: string) {
		const gen = new Set(generatingDest);
		gen.add(destId);
		generatingDest = gen;

		try {
			await api.post(`/api/trip/${tripId}/checklists`, {
				action: 'regenerate',
				destination_id: destId
			});
			await loadChecklists();
			// Auto-expand the destination after generation
			const next = new Set(expandedDestinations);
			next.add(destId);
			expandedDestinations = next;
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to generate checklists';
		} finally {
			const done = new Set(generatingDest);
			done.delete(destId);
			generatingDest = done;
		}
	}

	// ---------------------------------------------------------------------------
	// Utilities
	// ---------------------------------------------------------------------------

	function formatDate(d: string | null): string {
		if (!d) return '--';
		return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	function handleKeydown(e: KeyboardEvent, saveFn: () => void, cancelFn: () => void) {
		if (e.key === 'Enter' && !e.shiftKey) {
			e.preventDefault();
			saveFn();
		}
		if (e.key === 'Escape') {
			cancelFn();
		}
	}
</script>

<svelte:head>
	<title>{trip?.name ?? 'Trip Details'} - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<!-- Back link -->
	<a href="/trip" class="inline-flex items-center gap-1 text-sm text-accent-400 hover:text-accent-300">
		&larr; Back to trips
	</a>

	{#if error}
		<div class="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
			{error}
			<button class="ml-2 underline hover:no-underline" onclick={() => (error = '')}>Dismiss</button>
		</div>
	{/if}

	{#if loading}
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-12 text-center">
			<p class="text-surface-400">Loading trip...</p>
		</div>
	{:else if trip}
		<!-- Trip Header -->
		<Card>
			<div class="space-y-4">
				<!-- Name -->
				<div class="flex items-start justify-between gap-4">
					{#if editingName}
						<div class="flex flex-1 items-center gap-2">
							<input
								type="text"
								bind:value={editName}
								onkeydown={(e) => handleKeydown(e, saveName, cancelEditName)}
								class="flex-1 rounded-lg border border-surface-600 bg-surface-800 px-3 py-1.5 text-xl font-semibold text-surface-100 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
							/>
							<Button size="sm" variant="primary" onclick={saveName}>Save</Button>
							<Button size="sm" variant="ghost" onclick={cancelEditName}>Cancel</Button>
						</div>
					{:else}
						<button
							class="text-left text-xl font-semibold text-surface-100 hover:text-accent-300 transition-colors"
							onclick={startEditName}
							title="Click to edit"
						>
							{trip.name}
						</button>
					{/if}
					<Badge variant={statusVariant}>{statusLabel}</Badge>
				</div>

				<!-- Status Controls -->
				<div class="flex items-center gap-2">
					<span class="text-xs text-surface-500">Status:</span>
					{#each statusFlow as s}
						<button
							class="rounded-md px-2.5 py-1 text-xs font-medium transition-colors {trip.status === s
								? 'bg-accent-700 text-white'
								: 'bg-surface-800 text-surface-400 hover:bg-surface-700 hover:text-surface-200'}"
							onclick={() => changeStatus(s)}
						>
							{s.charAt(0).toUpperCase() + s.slice(1)}
						</button>
					{/each}
				</div>

				<!-- Dates -->
				<div>
					{#if editingDates}
						<div class="flex items-end gap-3">
							<div>
								<label class="block text-xs text-surface-500">Start</label>
								<input
									type="date"
									bind:value={editStartDate}
									class="mt-1 rounded-lg border border-surface-600 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
								/>
							</div>
							<div>
								<label class="block text-xs text-surface-500">End</label>
								<input
									type="date"
									bind:value={editEndDate}
									class="mt-1 rounded-lg border border-surface-600 bg-surface-800 px-3 py-1.5 text-sm text-surface-100 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
								/>
							</div>
							<Button size="sm" variant="primary" onclick={saveDates}>Save</Button>
							<Button size="sm" variant="ghost" onclick={cancelEditDates}>Cancel</Button>
						</div>
					{:else}
						<button
							class="text-sm text-surface-400 hover:text-accent-300 transition-colors"
							onclick={startEditDates}
							title="Click to edit dates"
						>
							{formatDate(trip.start_date)} - {formatDate(trip.end_date)}
						</button>
					{/if}
				</div>

				<!-- Notes -->
				<div>
					<span class="block text-xs font-medium text-surface-500 mb-1">Notes</span>
					{#if editingNotes}
						<div class="space-y-2">
							<textarea
								bind:value={editNotes}
								rows={3}
								onkeydown={(e) => {
									if (e.key === 'Escape') cancelEditNotes();
								}}
								class="block w-full rounded-lg border border-surface-600 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600 resize-none"
								placeholder="Trip notes..."
							></textarea>
							<div class="flex gap-2">
								<Button size="sm" variant="primary" onclick={saveNotes}>Save</Button>
								<Button size="sm" variant="ghost" onclick={cancelEditNotes}>Cancel</Button>
							</div>
						</div>
					{:else}
						<button
							class="block w-full text-left text-sm text-surface-300 hover:text-accent-300 transition-colors min-h-[1.5rem]"
							onclick={startEditNotes}
							title="Click to edit notes"
						>
							{trip.notes || 'No notes -- click to add'}
						</button>
					{/if}
				</div>

				<!-- Meta -->
				<div class="flex gap-4 text-xs text-surface-600 pt-2 border-t border-surface-800">
					<span>Created: {formatDate(trip.created_at?.split('T')[0] ?? trip.created_at)}</span>
					<span>Updated: {formatDate(trip.updated_at?.split('T')[0] ?? trip.updated_at)}</span>
				</div>
			</div>
		</Card>

		<!-- Trip Overview Stats -->
		{#if overallStats().totalChecklists > 0}
			<Card>
				<div class="space-y-3">
					<h2 class="text-sm font-medium text-surface-300 uppercase tracking-wide">Checklist Overview</h2>
					<div class="grid grid-cols-2 gap-4 sm:grid-cols-4">
						<div class="space-y-1">
							<p class="text-xl font-semibold text-surface-100">{overallStats().totalChecklists}</p>
							<p class="text-xs text-surface-500">Total Checklists</p>
						</div>
						<div class="space-y-1">
							<p class="text-xl font-semibold text-surface-100">{overallStats().percent}%</p>
							<p class="text-xs text-surface-500">Overall Progress</p>
						</div>
						<div class="space-y-1">
							<p class="text-xl font-semibold text-surface-100">{overallStats().totalChecked}</p>
							<p class="text-xs text-surface-500">Items Done</p>
						</div>
						<div class="space-y-1">
							<p class="text-xl font-semibold text-surface-100">{overallStats().totalItems - overallStats().totalChecked}</p>
							<p class="text-xs text-surface-500">Items Remaining</p>
						</div>
					</div>

					<!-- Overall progress bar -->
					<div class="space-y-1">
						<div class="h-2 w-full rounded-full bg-surface-800 overflow-hidden">
							<div
								class="h-full rounded-full transition-all duration-300 {overallStats().percent === 100
									? 'bg-emerald-500'
									: overallStats().percent > 50
										? 'bg-accent-500'
										: 'bg-accent-700'}"
								style="width: {overallStats().percent}%"
							></div>
						</div>
						<p class="text-xs text-surface-500">{overallStats().totalChecked}/{overallStats().totalItems} items completed</p>
					</div>

					<!-- By type breakdown -->
					{#if Object.keys(overallStats().byType).length > 0}
						<div class="flex flex-wrap gap-3 pt-1">
							{#each Object.entries(overallStats().byType) as [type, counts]}
								{@const cfg = getTypeConfig(type)}
								{@const pct = counts.total > 0 ? Math.round((counts.checked / counts.total) * 100) : 0}
								<div class="flex items-center gap-2 rounded-lg bg-surface-800/60 px-3 py-1.5">
									<svg class="h-3.5 w-3.5 {cfg.color}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
										<path stroke-linecap="round" stroke-linejoin="round" d={cfg.icon} />
									</svg>
									<span class="text-xs text-surface-300">{cfg.label}</span>
									<span class="text-xs text-surface-500">{counts.checked}/{counts.total}</span>
									<div class="h-1 w-12 rounded-full bg-surface-700 overflow-hidden">
										<div
											class="h-full rounded-full bg-accent-600 transition-all duration-300"
											style="width: {pct}%"
										></div>
									</div>
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</Card>
		{/if}

		<!-- Destinations -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<h2 class="text-lg font-medium text-surface-200">
					Destinations
					<span class="text-sm text-surface-500">({destinations.length})</span>
				</h2>
				<Button size="sm" variant="primary" onclick={() => (showDestModal = true)}>
					Add Destination
				</Button>
			</div>

			{#if destinations.length === 0}
				<Card class="text-center">
					<p class="text-surface-400">No destinations yet</p>
					<p class="mt-1 text-sm text-surface-500">Add your first destination to start planning</p>
				</Card>
			{:else}
				<div class="space-y-3">
					{#each destinations as dest, i (dest.id)}
						{@const stats = destStats(dest.id)}
						{@const isExpanded = expandedDestinations.has(dest.id)}
						{@const destChecklists = checklistsByDest().get(dest.id) ?? []}
						{@const advisory = dest.country_code ? advisories.get(dest.country_code.toUpperCase()) : null}
						<Card>
							<div class="space-y-0">
								<!-- Destination header row -->
								<div class="flex items-start justify-between gap-3">
									<div class="min-w-0 flex-1">
										<div class="flex items-center gap-2 flex-wrap">
											<span class="inline-flex h-5 w-5 items-center justify-center rounded bg-surface-800 text-xs text-surface-400">
												{i + 1}
											</span>
											<h3 class="font-medium text-surface-100">
												{dest.city || 'Unknown City'}
												{#if dest.country_code}
													<span class="ml-1 text-sm text-surface-400">{dest.country_code}</span>
												{/if}
											</h3>
											{#if advisory}
												<Badge variant={advisoryBadgeVariant(advisory.level)}>
													{advisoryLabel(advisory.level)}
												</Badge>
											{/if}
										</div>
										{#if dest.arrival_date || dest.departure_date}
											<p class="mt-1 text-sm text-surface-400 ml-7">
												{formatDate(dest.arrival_date)} - {formatDate(dest.departure_date)}
											</p>
										{/if}
										{#if dest.notes}
											<p class="mt-1 text-sm text-surface-500 ml-7">{dest.notes}</p>
										{/if}

										<!-- Checklist summary line -->
										<div class="mt-2 ml-7 flex items-center gap-3 flex-wrap">
											{#if stats.count > 0}
												<span class="text-xs text-surface-400">
													{stats.count} checklist{stats.count !== 1 ? 's' : ''},
													{stats.totalChecked}/{stats.totalItems} items done
												</span>
												{@const pct = stats.totalItems > 0 ? Math.round((stats.totalChecked / stats.totalItems) * 100) : 0}
												<div class="h-1.5 w-20 rounded-full bg-surface-800 overflow-hidden">
													<div
														class="h-full rounded-full transition-all duration-300 {pct === 100
															? 'bg-emerald-500'
															: 'bg-accent-600'}"
														style="width: {pct}%"
													></div>
												</div>
												<button
													class="text-xs text-accent-400 hover:text-accent-300 transition-colors"
													onclick={() => toggleDestExpanded(dest.id)}
												>
													{isExpanded ? 'Hide Checklists' : 'View Checklists'}
												</button>
												<button
													class="text-xs text-surface-500 hover:text-amber-400 transition-colors"
													onclick={() => (confirmRegenerateDestId = dest.id)}
													disabled={regeneratingDest.has(dest.id)}
												>
													{regeneratingDest.has(dest.id) ? 'Regenerating...' : 'Regenerate'}
												</button>
											{:else}
												<span class="text-xs text-surface-500">No checklists</span>
												<button
													class="text-xs text-accent-400 hover:text-accent-300 transition-colors"
													onclick={() => generateChecklists(dest.id)}
													disabled={generatingDest.has(dest.id)}
												>
													{generatingDest.has(dest.id) ? 'Generating...' : 'Generate Checklists'}
												</button>
											{/if}
										</div>
									</div>
									<div class="flex items-center gap-1">
										<button
											class="rounded p-1 text-surface-500 hover:bg-surface-800 hover:text-surface-300 disabled:opacity-30"
											onclick={() => moveDestination(i, 'up')}
											disabled={i === 0}
											title="Move up"
										>
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
												<path d="M5 15l7-7 7 7" />
											</svg>
										</button>
										<button
											class="rounded p-1 text-surface-500 hover:bg-surface-800 hover:text-surface-300 disabled:opacity-30"
											onclick={() => moveDestination(i, 'down')}
											disabled={i === destinations.length - 1}
											title="Move down"
										>
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
												<path d="M19 9l-7 7-7-7" />
											</svg>
										</button>
										<button
											class="rounded p-1 text-surface-500 hover:text-red-400"
											onclick={() => (deleteDestId = dest.id)}
											title="Delete destination"
										>
											<svg class="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
												<path d="M6 18L18 6M6 6l12 12" />
											</svg>
										</button>
									</div>
								</div>

								<!-- Expanded checklists section -->
								{#if isExpanded && destChecklists.length > 0}
									<div class="mt-4 ml-7 space-y-2 border-t border-surface-800 pt-4">
										{#each destChecklists as cl (cl.id)}
											{@const items = parseItems(cl.items)}
											{@const checkedCount = items.filter((it) => it.checked).length}
											{@const clExpanded = expandedChecklists.has(cl.id)}
											{@const cfg = getTypeConfig(cl.type)}
											{@const pct = items.length > 0 ? Math.round((checkedCount / items.length) * 100) : 0}

											<div class="rounded-lg border border-surface-800 bg-surface-800/30 overflow-hidden">
												<!-- Checklist accordion header -->
												<button
													class="flex w-full items-center justify-between gap-3 px-4 py-3 text-left hover:bg-surface-800/50 transition-colors"
													onclick={() => toggleChecklistExpanded(cl.id)}
												>
													<div class="flex items-center gap-3 min-w-0">
														<svg class="h-4 w-4 shrink-0 {cfg.color}" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
															<path stroke-linecap="round" stroke-linejoin="round" d={cfg.icon} />
														</svg>
														<span class="text-sm font-medium text-surface-200 truncate">{cl.name}</span>
														<Badge variant={cfg.badgeVariant}>{cfg.label}</Badge>
													</div>
													<div class="flex items-center gap-3 shrink-0">
														{#if savingChecklist.has(cl.id)}
															<span class="text-xs text-accent-400">Saving...</span>
														{/if}
														<span class="text-xs text-surface-400">{checkedCount}/{items.length}</span>
														<div class="h-1.5 w-16 rounded-full bg-surface-700 overflow-hidden">
															<div
																class="h-full rounded-full transition-all duration-300 {pct === 100
																	? 'bg-emerald-500'
																	: 'bg-accent-600'}"
																style="width: {pct}%"
															></div>
														</div>
														<svg
															class="h-4 w-4 text-surface-500 transition-transform duration-200 {clExpanded ? 'rotate-180' : ''}"
															fill="none"
															viewBox="0 0 24 24"
															stroke="currentColor"
															stroke-width="2"
														>
															<path d="M19 9l-7 7-7-7" />
														</svg>
													</div>
												</button>

												<!-- Checklist items -->
												{#if clExpanded}
													<div class="border-t border-surface-800 px-4 py-2 space-y-0.5">
														{#if items.length === 0}
															<p class="py-2 text-xs text-surface-500">No items in this checklist.</p>
														{:else}
															{#each items as item (item.id)}
																<label
																	class="flex items-start gap-3 rounded-md px-2 py-2 hover:bg-surface-800/40 transition-colors cursor-pointer group"
																>
																	<input
																		type="checkbox"
																		checked={item.checked}
																		onchange={() => toggleItem(cl, item.id)}
																		class="mt-0.5 h-4 w-4 rounded border-surface-600 bg-surface-800 text-accent-600 focus:ring-accent-600 focus:ring-offset-0 shrink-0"
																	/>
																	<div class="min-w-0 flex-1">
																		<span
																			class="text-sm transition-colors {item.checked
																				? 'text-surface-500 line-through'
																				: 'text-surface-200'}"
																		>
																			{item.label}
																		</span>
																		{#if item.notes}
																			<p class="mt-0.5 text-xs text-surface-500 group-hover:text-surface-400">
																				{item.notes}
																			</p>
																		{/if}
																	</div>
																</label>
															{/each}
														{/if}
													</div>
												{/if}
											</div>
										{/each}
									</div>
								{/if}
							</div>
						</Card>
					{/each}
				</div>
			{/if}
		</div>

		<!-- Delete trip -->
		<div class="pt-4 border-t border-surface-800">
			<Button variant="danger" size="sm" onclick={() => {
				if (confirm('Delete this entire trip? This cannot be undone.')) {
					api.delete(`/api/trip/${trip?.id}`).then(() => goto('/trip'));
				}
			}}>
				Delete Trip
			</Button>
		</div>
	{:else}
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-12 text-center">
			<p class="text-surface-400">Trip not found</p>
			<a href="/trip" class="mt-2 inline-block text-sm text-accent-400 hover:text-accent-300">Back to trips</a>
		</div>
	{/if}
</div>

<!-- Add Destination Modal -->
<Modal open={showDestModal} onclose={() => { showDestModal = false; resetDestForm(); }} title="Add Destination">
	<form onsubmit={handleAddDestination} class="space-y-4">
		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="dest-city" class="block text-sm font-medium text-surface-300">City</label>
				<input
					id="dest-city"
					type="text"
					bind:value={destCity}
					placeholder="e.g. Bangkok"
					class="mt-1 block w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
				/>
			</div>
			<div>
				<label for="dest-country" class="block text-sm font-medium text-surface-300">Country Code</label>
				<input
					id="dest-country"
					type="text"
					bind:value={destCountryCode}
					placeholder="e.g. TH"
					maxlength={3}
					class="mt-1 block w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600 uppercase"
				/>
			</div>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="dest-arrival" class="block text-sm font-medium text-surface-300">Arrival</label>
				<input
					id="dest-arrival"
					type="date"
					bind:value={destArrival}
					class="mt-1 block w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
				/>
			</div>
			<div>
				<label for="dest-departure" class="block text-sm font-medium text-surface-300">Departure</label>
				<input
					id="dest-departure"
					type="date"
					bind:value={destDeparture}
					class="mt-1 block w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
				/>
			</div>
		</div>

		<div>
			<label for="dest-notes" class="block text-sm font-medium text-surface-300">Notes</label>
			<textarea
				id="dest-notes"
				bind:value={destNotes}
				rows={2}
				placeholder="Any notes..."
				class="mt-1 block w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600 resize-none"
			></textarea>
		</div>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" type="button" onclick={() => { showDestModal = false; resetDestForm(); }}>Cancel</Button>
			<Button variant="primary" type="submit" disabled={(!destCity.trim() && !destCountryCode.trim()) || destSubmitting}>
				{destSubmitting ? 'Adding...' : 'Add Destination'}
			</Button>
		</div>
	</form>
</Modal>

<!-- Delete Destination Confirmation -->
{#if deleteDestId}
	{@const destName = destinations.find((d) => d.id === deleteDestId)?.city ?? 'this destination'}
	<div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Confirm delete destination">
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
			onclick={() => (deleteDestId = null)}
			tabindex="-1">&nbsp;</button>
		<div class="relative z-10 w-full max-w-sm rounded-xl border border-surface-700 bg-surface-900 p-6 shadow-2xl">
			<h3 class="text-lg font-medium text-surface-200">Delete Destination</h3>
			<p class="mt-2 text-sm text-surface-400">
				Remove <strong class="text-surface-200">{destName}</strong> from this trip?
			</p>
			<div class="mt-5 flex justify-end gap-3">
				<Button variant="secondary" onclick={() => (deleteDestId = null)}>Cancel</Button>
				<Button variant="danger" onclick={() => deleteDestId && handleDeleteDestination(deleteDestId)}>Delete</Button>
			</div>
		</div>
	</div>
{/if}

<!-- Regenerate Checklists Confirmation -->
{#if confirmRegenerateDestId}
	{@const destName = destinations.find((d) => d.id === confirmRegenerateDestId)?.city ?? 'this destination'}
	<div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Confirm regenerate checklists">
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
			onclick={() => (confirmRegenerateDestId = null)}
			tabindex="-1">&nbsp;</button>
		<div class="relative z-10 w-full max-w-sm rounded-xl border border-surface-700 bg-surface-900 p-6 shadow-2xl">
			<h3 class="text-lg font-medium text-surface-200">Regenerate Checklists</h3>
			<p class="mt-2 text-sm text-surface-400">
				This will replace all existing checklists for <strong class="text-surface-200">{destName}</strong> with freshly generated ones. Any manual edits and check progress will be lost.
			</p>
			<div class="mt-5 flex justify-end gap-3">
				<Button variant="secondary" onclick={() => (confirmRegenerateDestId = null)}>Cancel</Button>
				<Button variant="danger" onclick={() => confirmRegenerateDestId && regenerateChecklists(confirmRegenerateDestId)}>Regenerate</Button>
			</div>
		</div>
	</div>
{/if}
