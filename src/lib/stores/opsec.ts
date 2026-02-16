import { writable } from 'svelte/store';

export interface OpsecStatus {
	score: number;
	maxScore: number;
	checkedItems: number;
	totalItems: number;
}

export const opsecStatus = writable<OpsecStatus>({
	score: 0,
	maxScore: 100,
	checkedItems: 0,
	totalItems: 0
});
