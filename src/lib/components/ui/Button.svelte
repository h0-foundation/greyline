<script lang="ts">
	import type { Snippet } from 'svelte';
	import type { HTMLButtonAttributes } from 'svelte/elements';

	interface Props extends HTMLButtonAttributes {
		variant?: 'primary' | 'secondary' | 'ghost' | 'danger';
		size?: 'sm' | 'md' | 'lg';
		children: Snippet;
	}

	let { variant = 'primary', size = 'md', children, class: className = '', ...rest }: Props = $props();

	const variants = {
		primary: 'bg-accent-300 text-black hover:bg-accent-200 font-semibold',
		secondary: 'border border-surface-700 text-surface-300 hover:bg-surface-800 hover:border-surface-600',
		ghost: 'text-surface-400 hover:bg-surface-800 hover:text-surface-200',
		danger: 'bg-red-600 text-white hover:bg-red-500'
	};

	const sizes = {
		sm: 'px-3 py-1.5 text-xs',
		md: 'px-4 py-2 text-sm',
		lg: 'px-5 py-2.5 text-base'
	};
</script>

<button
	class="inline-flex items-center justify-center rounded-lg font-medium transition-colors disabled:opacity-50 {variants[variant]} {sizes[size]} {className}"
	{...rest}
>
	{@render children()}
</button>
