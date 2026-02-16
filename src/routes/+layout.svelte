<script lang="ts">
	import '../app.css';
	import Sidebar from '$lib/components/ui/Sidebar.svelte';
	import CommandPalette from '$lib/components/ui/CommandPalette.svelte';
	import { sidebarCollapsed } from '$lib/stores/app.js';

	let { children } = $props();
</script>

<div class="flex min-h-screen">
	<Sidebar />

	<main
		class="flex-1 transition-all duration-200 {$sidebarCollapsed ? 'ml-16' : 'ml-60'}"
	>
		<div class="mx-auto max-w-7xl px-6 py-6">
			{@render children()}
		</div>
	</main>
</div>

<CommandPalette />
