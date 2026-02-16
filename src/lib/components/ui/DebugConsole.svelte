<script lang="ts">
	interface LogEntry {
		id: number;
		timestamp: string;
		type: 'fetch' | 'error' | 'rejection';
		method?: string;
		url?: string;
		status?: number;
		duration?: number;
		size?: string;
		message?: string;
		pending: boolean;
	}

	const MAX_ENTRIES = 150;

	let isOpen = $state(false);
	let entries: LogEntry[] = $state([]);
	let filter = $state('');
	let nextId = $state(0);
	let scrollContainer: HTMLDivElement | undefined = $state();
	let copyFeedback = $state(false);

	function addEntry(entry: LogEntry) {
		entries = [...entries, entry].slice(-MAX_ENTRIES);
	}

	const filteredEntries = $derived(
		filter.length === 0
			? entries
			: entries.filter((entry) => {
					const text = formatEntryText(entry).toLowerCase();
					return text.includes(filter.toLowerCase());
				})
	);

	const entryCount = $derived(entries.length);

	function now(): string {
		const d = new Date();
		const h = String(d.getHours()).padStart(2, '0');
		const m = String(d.getMinutes()).padStart(2, '0');
		const s = String(d.getSeconds()).padStart(2, '0');
		const ms = String(d.getMilliseconds()).padStart(3, '0');
		return `${h}:${m}:${s}.${ms}`;
	}

	function formatBytes(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	function statusColor(entry: LogEntry): string {
		if (entry.type === 'error' || entry.type === 'rejection') return 'text-red-400';
		if (entry.pending) return 'text-surface-500';
		if (!entry.status) return 'text-surface-500';
		if (entry.status >= 200 && entry.status < 300) return 'text-emerald-400';
		if (entry.status >= 300 && entry.status < 400) return 'text-amber-400';
		return 'text-red-400';
	}

	function statusBg(entry: LogEntry): string {
		if (entry.type === 'error' || entry.type === 'rejection') return 'bg-red-900/10';
		if (entry.pending) return '';
		if (!entry.status) return '';
		if (entry.status >= 200 && entry.status < 300) return '';
		if (entry.status >= 300 && entry.status < 400) return 'bg-amber-900/10';
		return 'bg-red-900/10';
	}

	function formatEntryText(entry: LogEntry): string {
		if (entry.type === 'error') {
			return `${entry.timestamp} [ERROR] ${entry.message}`;
		}
		if (entry.type === 'rejection') {
			return `${entry.timestamp} [REJECTION] ${entry.message}`;
		}
		const status = entry.pending ? '...' : String(entry.status);
		const duration = entry.duration != null ? `${entry.duration}ms` : '...';
		const size = entry.size ?? '...';
		return `${entry.timestamp} ${entry.method} ${status} ${entry.url} ${duration} ${size}`;
	}

	function copyAll() {
		const text = entries.map(formatEntryText).join('\n');
		navigator.clipboard.writeText(text).then(() => {
			copyFeedback = true;
			setTimeout(() => (copyFeedback = false), 1500);
		});
	}

	function clearLog() {
		entries = [];
	}

	// Auto-scroll to bottom on new entries
	$effect(() => {
		// Access entries.length to create a dependency
		entries.length;
		if (scrollContainer) {
			// Use tick-like delay to let DOM update
			requestAnimationFrame(() => {
				if (scrollContainer) {
					scrollContainer.scrollTop = scrollContainer.scrollHeight;
				}
			});
		}
	});

	// Keyboard shortcut: Ctrl+`
	$effect(() => {
		function onKeydown(e: KeyboardEvent) {
			if (e.ctrlKey && e.key === '`') {
				e.preventDefault();
				isOpen = !isOpen;
			}
		}
		window.addEventListener('keydown', onKeydown);
		return () => window.removeEventListener('keydown', onKeydown);
	});

	// Monkey-patch fetch + capture errors
	$effect(() => {
		const originalFetch = window.fetch;

		window.fetch = async function patchedFetch(
			input: RequestInfo | URL,
			init?: RequestInit
		): Promise<Response> {
			const method = init?.method?.toUpperCase() ?? 'GET';
			const url =
				typeof input === 'string'
					? input
					: input instanceof URL
						? input.href
						: input.url;

			const id = nextId++;
			const entry: LogEntry = {
				id,
				timestamp: now(),
				type: 'fetch',
				method,
				url,
				pending: true
			};

			addEntry(entry);
			const startTime = performance.now();

			try {
				const response = await originalFetch.call(window, input, init);
				const elapsed = Math.round(performance.now() - startTime);

				// Clone to read body size without consuming
				const clone = response.clone();
				let sizeStr = '';
				try {
					const blob = await clone.blob();
					sizeStr = formatBytes(blob.size);
				} catch {
					sizeStr = '?';
				}

				entries = entries.map((e) =>
					e.id === id
						? { ...e, status: response.status, duration: elapsed, size: sizeStr, pending: false }
						: e
				);

				return response;
			} catch (err) {
				const elapsed = Math.round(performance.now() - startTime);
				entries = entries.map((e) =>
					e.id === id
						? {
								...e,
								status: 0,
								duration: elapsed,
								size: '-',
								pending: false,
								message: err instanceof Error ? err.message : String(err)
							}
						: e
				);
				throw err;
			}
		};

		// Capture window errors
		function onError(e: ErrorEvent) {
			const entry: LogEntry = {
				id: nextId++,
				timestamp: now(),
				type: 'error',
				message: `${e.message} at ${e.filename}:${e.lineno}:${e.colno}`,
				pending: false
			};
			addEntry(entry);
		}

		// Capture unhandled promise rejections
		function onRejection(e: PromiseRejectionEvent) {
			const reason = e.reason instanceof Error ? e.reason.message : String(e.reason);
			const entry: LogEntry = {
				id: nextId++,
				timestamp: now(),
				type: 'rejection',
				message: reason,
				pending: false
			};
			addEntry(entry);
		}

		window.addEventListener('error', onError);
		window.addEventListener('unhandledrejection', onRejection);

		return () => {
			window.fetch = originalFetch;
			window.removeEventListener('error', onError);
			window.removeEventListener('unhandledrejection', onRejection);
		};
	});
</script>

<!-- Toggle Button -->
<button
	onclick={() => (isOpen = !isOpen)}
	class="fixed bottom-4 right-4 z-[9999] flex items-center gap-2 rounded-lg border border-surface-700 bg-surface-900 px-3 py-1.5 text-xs font-medium text-surface-400 shadow-lg transition-colors hover:bg-surface-800 hover:text-surface-200"
	title="Toggle Debug Console (Ctrl+`)"
>
	<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
		<path
			stroke-linecap="round"
			stroke-linejoin="round"
			d="M8 9l3 3-3 3m5 0h3M5 20h14a2 2 0 002-2V6a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z"
		/>
	</svg>
	<span>Debug</span>
	{#if entryCount > 0}
		<span class="rounded bg-accent-700/30 px-1.5 py-0.5 text-accent-300">{entryCount}</span>
	{/if}
</button>

<!-- Panel -->
{#if isOpen}
	<div
		class="fixed bottom-14 right-4 z-[9999] flex w-[400px] flex-col overflow-hidden rounded-xl border border-surface-700 bg-surface-900 shadow-2xl"
		style="max-height: 50vh;"
	>
		<!-- Header -->
		<div class="flex items-center justify-between border-b border-surface-800 px-3 py-2">
			<span class="text-xs font-semibold text-surface-300">Debug Console</span>
			<div class="flex items-center gap-1">
				<button
					onclick={copyAll}
					class="rounded px-2 py-1 text-xs text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200"
				>
					{copyFeedback ? 'Copied!' : 'Copy All'}
				</button>
				<button
					onclick={clearLog}
					class="rounded px-2 py-1 text-xs text-surface-400 transition-colors hover:bg-surface-800 hover:text-surface-200"
				>
					Clear
				</button>
				<button
					onclick={() => (isOpen = false)}
					class="rounded px-1.5 py-1 text-xs text-surface-500 transition-colors hover:bg-surface-800 hover:text-surface-200"
				>
					<svg class="h-3.5 w-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor" stroke-width="2">
						<path stroke-linecap="round" stroke-linejoin="round" d="M6 18L18 6M6 6l12 12" />
					</svg>
				</button>
			</div>
		</div>

		<!-- Filter -->
		<div class="border-b border-surface-800 px-3 py-1.5">
			<input
				bind:value={filter}
				type="text"
				placeholder="Filter entries..."
				class="w-full bg-transparent text-xs text-surface-200 placeholder-surface-500 outline-none"
			/>
		</div>

		<!-- Log Entries -->
		<div
			bind:this={scrollContainer}
			class="flex-1 overflow-y-auto font-mono text-[11px] leading-relaxed"
		>
			{#if filteredEntries.length === 0}
				<p class="px-3 py-6 text-center text-xs text-surface-600">
					{entries.length === 0 ? 'No entries yet' : 'No matching entries'}
				</p>
			{:else}
				{#each filteredEntries as entry (entry.id)}
					<div class="border-b border-surface-800/50 px-3 py-1.5 {statusBg(entry)}">
						{#if entry.type === 'error' || entry.type === 'rejection'}
							<div class="flex items-start gap-2">
								<span class="shrink-0 text-surface-600">{entry.timestamp}</span>
								<span class="rounded bg-red-900/40 px-1 text-red-400">
									{entry.type === 'error' ? 'ERR' : 'REJ'}
								</span>
								<span class="min-w-0 break-all text-red-400">{entry.message}</span>
							</div>
						{:else}
							<div class="flex items-start gap-2">
								<span class="shrink-0 text-surface-600">{entry.timestamp}</span>
								<span class="shrink-0 font-semibold text-accent-400">{entry.method}</span>
								<span class="shrink-0 {statusColor(entry)}">
									{entry.pending ? '...' : entry.status}
								</span>
								<span class="min-w-0 truncate text-surface-300" title={entry.url}>
									{entry.url}
								</span>
							</div>
							<div class="mt-0.5 flex items-center gap-3 pl-[72px] text-surface-500">
								<span>{entry.pending ? '...' : `${entry.duration}ms`}</span>
								<span>{entry.size ?? '...'}</span>
							</div>
						{/if}
					</div>
				{/each}
			{/if}
		</div>
	</div>
{/if}
