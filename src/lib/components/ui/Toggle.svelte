<script lang="ts">
	interface Props {
		checked: boolean;
		onchange?: (checked: boolean) => void;
		label?: string;
		description?: string;
		disabled?: boolean;
	}

	let { checked = $bindable(), onchange, label, description, disabled = false }: Props = $props();
</script>

<label class="flex items-center justify-between gap-4 {disabled ? 'opacity-50' : 'cursor-pointer'}">
	{#if label}
		<div>
			<span class="text-sm font-medium text-surface-200">{label}</span>
			{#if description}
				<p class="text-xs text-surface-500">{description}</p>
			{/if}
		</div>
	{/if}
	<button
		type="button"
		role="switch"
		aria-checked={checked}
		{disabled}
		class="relative inline-flex h-6 w-11 shrink-0 rounded-full transition-colors {checked ? 'bg-accent-600' : 'bg-surface-700'}"
		onclick={() => {
			if (!disabled) {
				checked = !checked;
				onchange?.(checked);
			}
		}}
	>
		<span
			class="pointer-events-none inline-block h-5 w-5 translate-y-0.5 rounded-full bg-white shadow transition-transform {checked ? 'translate-x-[22px]' : 'translate-x-0.5'}"
		></span>
	</button>
</label>
