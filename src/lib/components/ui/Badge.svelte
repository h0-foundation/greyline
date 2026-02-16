<script lang="ts">
	import type { Snippet } from 'svelte';

	interface Props {
		variant?: 'default' | 'success' | 'warning' | 'danger' | 'info' | 'neon';
		children: Snippet;
	}

	let { variant = 'default', children }: Props = $props();

	const variants = {
		default: 'bg-surface-700 text-surface-300',
		success: 'bg-emerald-900/40 text-emerald-300 border border-emerald-700/30',
		warning: 'bg-amber-900/40 text-amber-300 border border-amber-700/30',
		danger: 'bg-red-900/40 text-red-300 border border-red-700/30',
		info: 'bg-blue-900/40 text-blue-300 border border-blue-700/30',
		neon: 'bg-accent-300/10 text-accent-300 border border-accent-300/20'
	};
</script>

<span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium {variants[variant]}">
	{@render children()}
</span>
