<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		children: Snippet;
		class?: string;
		accent?: boolean;
	}

	let { children, class: className = '', accent = false }: Props = $props();
</script>

<div class="relative rounded-lg border border-surface-700/50 bg-surface-800 p-5 {className}">
	{@render children()}
	{#if accent}
		<div class="pointer-events-none absolute bottom-0 right-0 h-8 w-8 rounded-br-lg border-b-2 border-r-2 border-accent-300 opacity-30"></div>
	{/if}
</div>
