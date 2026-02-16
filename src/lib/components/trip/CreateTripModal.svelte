<script lang="ts">
	import Modal from '$lib/components/ui/Modal.svelte';
	import Button from '$lib/components/ui/Button.svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		oncreate: (data: { name: string; start_date: string; end_date: string; notes: string }) => void;
	}

	let { open, onclose, oncreate }: Props = $props();

	let name = $state('');
	let start_date = $state('');
	let end_date = $state('');
	let notes = $state('');
	let submitting = $state(false);

	function resetForm() {
		name = '';
		start_date = '';
		end_date = '';
		notes = '';
		submitting = false;
	}

	function handleClose() {
		resetForm();
		onclose();
	}

	async function handleSubmit(e: SubmitEvent) {
		e.preventDefault();
		if (!name.trim()) return;
		submitting = true;
		oncreate({
			name: name.trim(),
			start_date,
			end_date,
			notes: notes.trim()
		});
		resetForm();
	}
</script>

<Modal {open} onclose={handleClose} title="New Trip">
	<form onsubmit={handleSubmit} class="space-y-4">
		<div>
			<label for="trip-name" class="block text-sm font-medium text-surface-300">
				Name <span class="text-red-400">*</span>
			</label>
			<input
				id="trip-name"
				type="text"
				bind:value={name}
				required
				placeholder="e.g. Southeast Asia 2026"
				class="mt-1 block w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
			/>
		</div>

		<div class="grid grid-cols-2 gap-3">
			<div>
				<label for="trip-start" class="block text-sm font-medium text-surface-300">Start Date</label>
				<input
					id="trip-start"
					type="date"
					bind:value={start_date}
					class="mt-1 block w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
				/>
			</div>
			<div>
				<label for="trip-end" class="block text-sm font-medium text-surface-300">End Date</label>
				<input
					id="trip-end"
					type="date"
					bind:value={end_date}
					class="mt-1 block w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
				/>
			</div>
		</div>

		<div>
			<label for="trip-notes" class="block text-sm font-medium text-surface-300">Notes</label>
			<textarea
				id="trip-notes"
				bind:value={notes}
				rows={3}
				placeholder="Any notes about this trip..."
				class="mt-1 block w-full rounded-lg border border-surface-700 bg-surface-800 px-3 py-2 text-sm text-surface-100 placeholder-surface-500 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600 resize-none"
			></textarea>
		</div>

		<div class="flex justify-end gap-3 pt-2">
			<Button variant="secondary" type="button" onclick={handleClose}>Cancel</Button>
			<Button variant="primary" type="submit" disabled={!name.trim() || submitting}>
				{submitting ? 'Creating...' : 'Create Trip'}
			</Button>
		</div>
	</form>
</Modal>
