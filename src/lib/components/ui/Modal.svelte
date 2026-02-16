<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		open: boolean;
		onclose: () => void;
		title?: string;
		children: Snippet;
	}

	let { open, onclose, title, children }: Props = $props();

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Escape') onclose();
	}
</script>

{#if open}
	<div class="fixed inset-0 z-50 flex items-center justify-center" role="dialog" aria-modal="true" aria-label={title}>
		<button class="absolute inset-0 bg-black/60 backdrop-blur-sm cursor-default" onclick={onclose} tabindex="-1">&nbsp;</button>
		<div
			class="relative z-10 w-full max-w-lg rounded-xl border border-surface-700 bg-surface-900 shadow-2xl"
			onkeydown={handleKeydown}
		>
			{#if title}
				<div class="flex items-center justify-between border-b border-surface-800 px-6 py-4">
					<h2 class="text-lg font-medium text-surface-200">{title}</h2>
					<button onclick={onclose} class="text-surface-400 hover:text-surface-200">&times;</button>
				</div>
			{/if}
			<div class="px-6 py-4">
				{@render children()}
			</div>
		</div>
	</div>
{/if}
