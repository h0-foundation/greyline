<script lang="ts">
	import { goto } from '$app/navigation';
	import { api } from '$lib/services/api-client.js';
	import type { Trip } from '$lib/types/trip.js';
	import Button from '$lib/components/ui/Button.svelte';
	import TripCard from '$lib/components/trip/TripCard.svelte';
	import CreateTripModal from '$lib/components/trip/CreateTripModal.svelte';

	interface TripWithDestinations extends Trip {
		destinations?: unknown[];
	}

	let trips = $state<TripWithDestinations[]>([]);
	let loading = $state(true);
	let error = $state('');
	let showCreateModal = $state(false);
	let deleteConfirmId = $state<string | null>(null);

	async function loadTrips() {
		loading = true;
		error = '';
		try {
			trips = await api.get<TripWithDestinations[]>('/api/trip');
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to load trips';
		} finally {
			loading = false;
		}
	}

	$effect(() => {
		loadTrips();
	});

	async function handleCreate(data: { name: string; start_date: string; end_date: string; notes: string }) {
		try {
			await api.post('/api/trip', data);
			showCreateModal = false;
			await loadTrips();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to create trip';
		}
	}

	async function handleDelete(id: string) {
		try {
			await api.delete(`/api/trip/${id}`);
			deleteConfirmId = null;
			await loadTrips();
		} catch (e) {
			error = e instanceof Error ? e.message : 'Failed to delete trip';
		}
	}

	function handleDeleteClick(e: MouseEvent, tripId: string) {
		e.stopPropagation();
		deleteConfirmId = tripId;
	}
</script>

<svelte:head>
	<title>Trips - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-surface-100">Trips</h1>
			<p class="mt-1 text-sm text-surface-400">Plan and manage your travels</p>
		</div>
		<Button variant="primary" onclick={() => (showCreateModal = true)}>New Trip</Button>
	</div>

	{#if error}
		<div class="rounded-lg border border-red-800 bg-red-900/20 px-4 py-3 text-sm text-red-300">
			{error}
			<button class="ml-2 underline hover:no-underline" onclick={() => (error = '')}>Dismiss</button>
		</div>
	{/if}

	{#if loading}
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-12 text-center">
			<p class="text-surface-400">Loading trips...</p>
		</div>
	{:else if trips.length === 0}
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-12 text-center">
			<p class="text-surface-400">No trips yet</p>
			<p class="mt-1 text-sm text-surface-500">Create your first trip to get started</p>
			<div class="mt-4">
				<Button variant="primary" onclick={() => (showCreateModal = true)}>Create Trip</Button>
			</div>
		</div>
	{:else}
		<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
			{#each trips as trip (trip.id)}
				<TripCard
					{trip}
					destinationCount={trip.destinations?.length ?? 0}
					onclick={() => goto(`/trip/${trip.id}`)}
					ondelete={(e) => handleDeleteClick(e, trip.id)}
				/>
			{/each}
		</div>
	{/if}
</div>

<CreateTripModal
	open={showCreateModal}
	onclose={() => (showCreateModal = false)}
	oncreate={handleCreate}
/>

{#if deleteConfirmId}
	{@const tripName = trips.find((t) => t.id === deleteConfirmId)?.name ?? 'this trip'}
	<div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label="Confirm delete">
		<button
			class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default"
			onclick={() => (deleteConfirmId = null)}
			tabindex="-1">&nbsp;</button>
		<div class="relative z-10 w-full max-w-sm rounded-xl border border-surface-700 bg-surface-900 p-6 shadow-2xl">
			<h3 class="text-lg font-medium text-surface-200">Delete Trip</h3>
			<p class="mt-2 text-sm text-surface-400">
				Are you sure you want to delete <strong class="text-surface-200">{tripName}</strong>? This action cannot be undone.
			</p>
			<div class="mt-5 flex justify-end gap-3">
				<Button variant="secondary" onclick={() => (deleteConfirmId = null)}>Cancel</Button>
				<Button variant="danger" onclick={() => deleteConfirmId && handleDelete(deleteConfirmId)}>Delete</Button>
			</div>
		</div>
	</div>
{/if}
