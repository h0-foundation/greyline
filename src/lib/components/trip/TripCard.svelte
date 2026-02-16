<script lang="ts">
	import type { Trip } from '$lib/types/trip.js';
	import Badge from '$lib/components/ui/Badge.svelte';
	import Card from '$lib/components/ui/Card.svelte';

	interface Props {
		trip: Trip;
		destinationCount?: number;
		onclick: () => void;
		ondelete: (e: MouseEvent) => void;
	}

	let { trip, destinationCount = 0, onclick, ondelete }: Props = $props();

	const statusVariant = $derived(
		trip.status === 'planning'
			? 'info'
			: trip.status === 'active'
				? 'success'
				: trip.status === 'completed'
					? 'default'
					: 'default'
	);

	const statusLabel = $derived(trip.status.charAt(0).toUpperCase() + trip.status.slice(1));

	function formatDate(d: string | null): string {
		if (!d) return '--';
		return new Date(d + 'T00:00:00').toLocaleDateString('en-US', {
			month: 'short',
			day: 'numeric',
			year: 'numeric'
		});
	}

	const dateRange = $derived(
		trip.start_date || trip.end_date
			? `${formatDate(trip.start_date)} - ${formatDate(trip.end_date)}`
			: 'No dates set'
	);
</script>

<Card class="group cursor-pointer transition-colors hover:border-surface-600">
	<button class="w-full text-left" onclick={onclick}>
		<div class="flex items-start justify-between gap-3">
			<div class="min-w-0 flex-1">
				<div class="flex items-center gap-2">
					<h3 class="truncate text-base font-medium text-surface-100">{trip.name}</h3>
					<Badge variant={statusVariant}>{statusLabel}</Badge>
				</div>
				<p class="mt-1 text-sm text-surface-400">{dateRange}</p>
				<div class="mt-2 flex items-center gap-4 text-xs text-surface-500">
					<span>{destinationCount} destination{destinationCount !== 1 ? 's' : ''}</span>
					{#if trip.notes}
						<span class="truncate max-w-[200px]">{trip.notes}</span>
					{/if}
				</div>
			</div>
		</div>
	</button>
	<div class="mt-3 flex justify-end border-t border-surface-800 pt-3">
		<button
			class="text-xs text-surface-500 hover:text-red-400 transition-colors"
			onclick={ondelete}
		>
			Delete
		</button>
	</div>
</Card>
