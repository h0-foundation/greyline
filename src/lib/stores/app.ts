import { writable } from 'svelte/store';

export type Theme = 'dark' | 'light';

export const theme = writable<Theme>('dark');
export const sidebarCollapsed = writable(false);
export const commandPaletteOpen = writable(false);

export function toggleTheme() {
	theme.update((t) => {
		const next = t === 'dark' ? 'light' : 'dark';
		if (typeof document !== 'undefined') {
			document.documentElement.setAttribute('data-theme', next);
			if (next === 'light') {
				document.documentElement.classList.add('light');
			} else {
				document.documentElement.classList.remove('light');
			}
		}
		return next;
	});
}

export function toggleSidebar() {
	sidebarCollapsed.update((c) => !c);
}

export function openCommandPalette() {
	commandPaletteOpen.set(true);
}

export function closeCommandPalette() {
	commandPaletteOpen.set(false);
}
