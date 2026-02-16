<script lang="ts">
	import { page } from '$app/stores';
	import { sidebarCollapsed, toggleSidebar, toggleTheme, theme, openCommandPalette } from '$lib/stores/app.js';

	interface NavItem {
		label: string;
		href: string;
		icon: string;
	}

	interface NavSection {
		label: string;
		items: NavItem[];
	}

	const sections: NavSection[] = [
		{
			label: 'Operations',
			items: [
				{ label: 'Dashboard', href: '/', icon: 'M3 3h7v7H3zM14 3h7v7h-7zM14 14h7v7h-7zM3 14h7v7H3z' },
				{ label: 'Trips', href: '/trip', icon: 'M1 6v16l7-4 7 4 7-4V2l-7 4-7-4-7 4z' },
				{ label: 'Map', href: '/map', icon: 'M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
				{ label: 'Surveillance', href: '/surveillance', icon: 'M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z' },
			]
		},
		{
			label: 'Preparation',
			items: [
				{ label: 'OPSEC', href: '/opsec', icon: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z' },
				{ label: 'Knowledge', href: '/knowledge', icon: 'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z' },
				{ label: 'Tools', href: '/tools', icon: 'M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z' },
				{ label: 'Training', href: '/training', icon: 'M22 12h-4l-3 9L9 3l-3 9H2' },
			]
		},
		{
			label: 'Security',
			items: [
				{ label: 'Vault', href: '/vault', icon: 'M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z M7 11V7a5 5 0 0 1 10 0v4' },
				{ label: 'Settings', href: '/settings', icon: 'M12.22 2h-.44a2 2 0 0 0-2 2v.18a2 2 0 0 1-1 1.73l-.43.25a2 2 0 0 1-2 0l-.15-.08a2 2 0 0 0-2.73.73l-.22.38a2 2 0 0 0 .73 2.73l.15.1a2 2 0 0 1 1 1.72v.51a2 2 0 0 1-1 1.74l-.15.09a2 2 0 0 0-.73 2.73l.22.38a2 2 0 0 0 2.73.73l.15-.08a2 2 0 0 1 2 0l.43.25a2 2 0 0 1 1 1.73V20a2 2 0 0 0 2 2h.44a2 2 0 0 0 2-2v-.18a2 2 0 0 1 1-1.73l.43-.25a2 2 0 0 1 2 0l.15.08a2 2 0 0 0 2.73-.73l.22-.39a2 2 0 0 0-.73-2.73l-.15-.08a2 2 0 0 1-1-1.74v-.5a2 2 0 0 1 1-1.74l.15-.09a2 2 0 0 0 .73-2.73l-.22-.38a2 2 0 0 0-2.73-.73l-.15.08a2 2 0 0 1-2 0l-.43-.25a2 2 0 0 1-1-1.73V4a2 2 0 0 0-2-2z M12 8a4 4 0 1 0 0 8 4 4 0 0 0 0-8z' },
			]
		}
	];

	function isActive(href: string, pathname: string): boolean {
		if (href === '/') return pathname === '/';
		return pathname.startsWith(href);
	}
</script>

<aside
	class="fixed left-0 top-0 z-40 flex h-full flex-col border-r border-surface-700/50 bg-surface-900/85 backdrop-blur-xl transition-all duration-200 {$sidebarCollapsed ? 'w-16' : 'w-60'}"
>
	<!-- Logo -->
	<div class="flex h-14 items-center border-b border-surface-700/50 px-4 gap-3">
		{#if !$sidebarCollapsed}
			<div class="flex gap-2">
				<div class="h-3 w-3 rounded-full bg-[#FF5F57]"></div>
				<div class="h-3 w-3 rounded-full bg-[#FEBC2E]"></div>
				<div class="h-3 w-3 rounded-full bg-[#28C840]"></div>
			</div>
			<span class="ml-2 text-sm font-semibold tracking-wide text-surface-200">Greyline</span>
		{:else}
			<span class="mx-auto text-sm font-bold text-accent-300">G</span>
		{/if}
	</div>

	<!-- Navigation -->
	<nav class="flex-1 overflow-y-auto px-3 py-4 space-y-5">
		{#each sections as section}
			<div>
				{#if !$sidebarCollapsed}
					<div class="mb-2 px-3 font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500">
						{section.label}
					</div>
				{/if}
				<ul class="space-y-0.5">
					{#each section.items as item}
						<li>
							<a
								href={item.href}
								class="flex items-center gap-3 rounded-lg px-3 py-2 text-[13px] font-medium transition-all duration-200 {isActive(item.href, $page.url.pathname)
									? 'bg-accent-300/15 text-accent-300'
									: 'text-surface-400 hover:bg-surface-700/50 hover:text-surface-200'}"
								title={$sidebarCollapsed ? item.label : undefined}
							>
								<svg class="h-4 w-4 shrink-0 {isActive(item.href, $page.url.pathname) ? 'opacity-100' : 'opacity-60'}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
									{#each item.icon.split(' M') as segment, i}
										<path d="{i === 0 ? segment : 'M' + segment}" />
									{/each}
								</svg>
								{#if !$sidebarCollapsed}
									<span>{item.label}</span>
								{/if}
							</a>
						</li>
					{/each}
				</ul>
			</div>
		{/each}
	</nav>

	<!-- Bottom controls -->
	<div class="border-t border-surface-700/50 px-3 py-3 space-y-1">
		{#if !$sidebarCollapsed}
			<button
				onclick={openCommandPalette}
				class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-surface-400 hover:bg-surface-700/50 hover:text-surface-200 transition-colors"
			>
				<svg class="h-4 w-4 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="11" cy="11" r="8" /><path d="m21 21-4.3-4.3" /></svg>
				<span>Search</span>
				<kbd class="ml-auto rounded border border-surface-700 bg-surface-800 px-1.5 py-0.5 font-mono text-[10px] text-surface-500">&#8984;K</kbd>
			</button>
		{/if}

		<button
			onclick={toggleTheme}
			class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-surface-400 hover:bg-surface-700/50 hover:text-surface-200 transition-colors"
			title={$sidebarCollapsed ? ($theme === 'dark' ? 'Light mode' : 'Dark mode') : undefined}
		>
			{#if $theme === 'dark'}
				<svg class="h-4 w-4 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="5" /><path d="M12 1v2M12 21v2M4.22 4.22l1.42 1.42M18.36 18.36l1.42 1.42M1 12h2M21 12h2M4.22 19.78l1.42-1.42M18.36 5.64l1.42-1.42" /></svg>
			{:else}
				<svg class="h-4 w-4 opacity-60" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" /></svg>
			{/if}
			{#if !$sidebarCollapsed}
				<span>{$theme === 'dark' ? 'Light mode' : 'Dark mode'}</span>
			{/if}
		</button>

		<button
			onclick={toggleSidebar}
			class="flex w-full items-center gap-3 rounded-lg px-3 py-2 text-[13px] text-surface-400 hover:bg-surface-700/50 hover:text-surface-200 transition-colors"
			title={$sidebarCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}
		>
			<svg class="h-4 w-4 opacity-60 transition-transform {$sidebarCollapsed ? 'rotate-180' : ''}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M15 18l-6-6 6-6" /></svg>
			{#if !$sidebarCollapsed}
				<span>Collapse</span>
			{/if}
		</button>
	</div>
</aside>
