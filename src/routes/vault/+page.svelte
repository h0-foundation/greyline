<script lang="ts">
	let unlocked = $state(false);
	let passphrase = $state('');
	let confirmPassphrase = $state('');
	let docs = $state<any[]>([]);
	let uploading = $state(false);
	let error = $state('');
	let dragOver = $state(false);
	let verifying = $state(false);
	let isNew = $state<boolean | null>(null);
	let selectedCategory = $state('other');

	// Check if vault is initialized on mount
	$effect(() => {
		fetch('/api/vault/unlock')
			.then((r) => r.json())
			.then((data) => {
				isNew = !data.initialized;
			})
			.catch(() => {
				isNew = true;
			});
	});

	async function unlock() {
		if (!passphrase) return;
		error = '';
		verifying = true;

		// First-time setup: require confirmation
		if (isNew) {
			if (passphrase !== confirmPassphrase) {
				error = 'Passphrases do not match';
				verifying = false;
				return;
			}
			if (passphrase.length < 8) {
				error = 'Passphrase must be at least 8 characters';
				verifying = false;
				return;
			}
		}

		try {
			const res = await fetch('/api/vault/unlock', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ passphrase })
			});
			const data = await res.json();
			if (data.ok) {
				unlocked = true;
				isNew = false;
				await loadDocs();
			} else {
				error = 'Invalid passphrase';
				passphrase = '';
			}
		} catch {
			error = 'Connection failed';
		}
		verifying = false;
	}

	async function loadDocs() {
		const res = await fetch('/api/vault');
		docs = await res.json();
	}

	async function uploadFile(file: File) {
		uploading = true;
		error = '';
		const form = new FormData();
		form.append('file', file);
		form.append('passphrase', passphrase);
		form.append('name', file.name);
		form.append('category', selectedCategory);

		try {
			const res = await fetch('/api/vault', { method: 'POST', body: form });
			if (!res.ok) {
				const data = await res.json();
				error = data.error || 'Upload failed';
			} else {
				await loadDocs();
				selectedCategory = 'other';
			}
		} catch {
			error = 'Upload failed';
		}
		uploading = false;
	}

	async function downloadDoc(doc: any) {
		error = '';
		try {
			const res = await fetch(`/api/vault/${doc.id}`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ passphrase })
			});
			if (!res.ok) {
				error = 'Decryption failed — wrong passphrase?';
				return;
			}
			const blob = await res.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = doc.filename || doc.name;
			a.click();
			URL.revokeObjectURL(url);
		} catch {
			error = 'Download failed';
		}
	}

	async function deleteDoc(doc: any) {
		if (!confirm(`Delete "${doc.name}"? This cannot be undone.`)) return;
		await fetch('/api/vault', {
			method: 'DELETE',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ id: doc.id })
		});
		await loadDocs();
	}

	function handleDrop(e: DragEvent) {
		e.preventDefault();
		dragOver = false;
		const files = e.dataTransfer?.files;
		if (files?.[0]) uploadFile(files[0]);
	}

	function handleFileInput(e: Event) {
		const input = e.target as HTMLInputElement;
		if (input.files?.[0]) uploadFile(input.files[0]);
	}

	function lock() {
		unlocked = false;
		passphrase = '';
		confirmPassphrase = '';
		docs = [];
		error = '';
	}

	const categories: Record<string, string> = {
		passport: 'Passport',
		visa: 'Visa',
		insurance: 'Insurance',
		medical: 'Medical',
		financial: 'Financial',
		other: 'Other'
	};

	function formatSize(bytes: number): string {
		if (bytes < 1024) return `${bytes} B`;
		if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
		return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
	}

	const categoryIcons: Record<string, string> = {
		passport:
			'M4 19.5A2.5 2.5 0 0 1 6.5 17H20 M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z',
		visa: 'M1 6v16l7-4 7 4 7-4V2l-7 4-7-4-7 4z',
		insurance: 'M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z',
		medical: 'M12 2v20 M2 12h20',
		financial: 'M12 1v22 M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6',
		other: 'M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z'
	};
</script>

<svelte:head>
	<title>Vault - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-xl font-semibold text-surface-100">Document Vault</h1>
			<p class="mt-0.5 font-mono text-xs text-surface-500">AES-256-GCM ENCRYPTED STORAGE</p>
		</div>
		{#if unlocked}
			<button
				onclick={lock}
				class="flex items-center gap-2 rounded-lg border border-surface-700 px-4 py-2 text-sm text-surface-300 hover:bg-surface-800 transition-colors"
			>
				<svg
					class="h-4 w-4"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="2"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
					<path d="M7 11V7a5 5 0 0 1 10 0v4" />
				</svg>
				Lock Vault
			</button>
		{/if}
	</div>

	{#if error}
		<div class="rounded-lg border border-red-700/50 bg-red-900/10 px-4 py-3 text-sm text-red-300">
			{error}
		</div>
	{/if}

	{#if !unlocked}
		<div class="mx-auto max-w-md rounded-lg border border-surface-700/50 bg-surface-800 p-8">
			<div class="text-center">
				<svg
					class="mx-auto h-12 w-12 text-surface-500"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
					<path d="M7 11V7a5 5 0 0 1 10 0v4" />
				</svg>
				<h2 class="mt-4 text-lg font-medium text-surface-200">
					{isNew ? 'Initialize Vault' : 'Vault Locked'}
				</h2>
				<p class="mt-1 text-sm text-surface-400">
					{isNew
						? 'Create a passphrase to encrypt your documents'
						: 'Enter your passphrase to access documents'}
				</p>
			</div>
			<form
				class="mt-6 space-y-3"
				onsubmit={(e) => {
					e.preventDefault();
					unlock();
				}}
			>
				<div>
					<label
						for="vault-pass"
						class="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-surface-500"
					>
						{isNew ? 'Create Passphrase' : 'Passphrase'}
					</label>
					<input
						id="vault-pass"
						type="password"
						bind:value={passphrase}
						placeholder={isNew ? 'Minimum 8 characters' : 'Enter passphrase'}
						class="w-full rounded-lg border border-surface-700 bg-surface-900 px-4 py-2.5 text-sm text-surface-200 placeholder-surface-500 focus:border-accent-300/50 focus:outline-none"
					/>
				</div>
				{#if isNew}
					<div>
						<label
							for="vault-confirm"
							class="mb-1.5 block font-mono text-[10px] uppercase tracking-wider text-surface-500"
						>
							Confirm Passphrase
						</label>
						<input
							id="vault-confirm"
							type="password"
							bind:value={confirmPassphrase}
							placeholder="Re-enter passphrase"
							class="w-full rounded-lg border border-surface-700 bg-surface-900 px-4 py-2.5 text-sm text-surface-200 placeholder-surface-500 focus:border-accent-300/50 focus:outline-none"
						/>
					</div>
				{/if}
				<button
					type="submit"
					disabled={!passphrase || verifying || (isNew === true && !confirmPassphrase)}
					class="mt-1 w-full rounded-lg bg-accent-300 px-4 py-2.5 text-sm font-semibold text-black hover:bg-accent-200 disabled:opacity-50 transition-colors"
				>
					{#if verifying}
						<span class="inline-flex items-center gap-2">
							<svg class="h-4 w-4 animate-spin" viewBox="0 0 24 24" fill="none">
								<circle
									cx="12"
									cy="12"
									r="10"
									stroke="currentColor"
									stroke-width="3"
									opacity="0.3"
								/>
								<path
									d="M12 2a10 10 0 0 1 10 10"
									stroke="currentColor"
									stroke-width="3"
									stroke-linecap="round"
								/>
							</svg>
							Verifying...
						</span>
					{:else}
						{isNew ? 'Create Vault' : 'Unlock Vault'}
					{/if}
				</button>
				<p class="text-center text-xs text-surface-500">
					{isNew
						? 'This passphrase cannot be recovered. Store it securely.'
						: 'Your passphrase never leaves your machine.'}
				</p>
			</form>
		</div>

		{#if isNew}
			<div class="mx-auto max-w-md rounded-lg border border-amber-700/30 bg-amber-900/10 p-4">
				<div class="flex gap-3">
					<svg
						class="mt-0.5 h-5 w-5 shrink-0 text-amber-400"
						viewBox="0 0 24 24"
						fill="none"
						stroke="currentColor"
						stroke-width="2"
						stroke-linecap="round"
						stroke-linejoin="round"
					>
						<path
							d="M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z"
						/>
						<line x1="12" y1="9" x2="12" y2="13" />
						<line x1="12" y1="17" x2="12.01" y2="17" />
					</svg>
					<div class="text-sm text-amber-200/80">
						<p class="font-medium text-amber-200">No recovery mechanism</p>
						<p class="mt-1 text-xs">
							If you forget your passphrase, encrypted documents cannot be recovered. Files are
							encrypted with AES-256-GCM using an Argon2id-derived key.
						</p>
					</div>
				</div>
			</div>
		{/if}
	{:else}
		<!-- Upload zone -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2
				class="mb-3 font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500"
			>
				Upload Document
			</h2>
			<div class="mb-4 flex items-center gap-3">
				<label for="cat-select" class="text-xs text-surface-400">Category:</label>
				<select
					id="cat-select"
					bind:value={selectedCategory}
					class="rounded-md border border-surface-700 bg-surface-900 px-3 py-1.5 text-xs text-surface-200 focus:border-accent-300/50 focus:outline-none"
				>
					{#each Object.entries(categories) as [key, label]}
						<option value={key}>{label}</option>
					{/each}
				</select>
			</div>
			<div
				class="flex min-h-28 items-center justify-center rounded-lg border-2 border-dashed transition-colors {dragOver
					? 'border-accent-300/50 bg-accent-300/5'
					: 'border-surface-700 bg-surface-900'}"
				ondrop={handleDrop}
				ondragover={(e) => {
					e.preventDefault();
					dragOver = true;
				}}
				ondragleave={() => (dragOver = false)}
				role="region"
				aria-label="Drop zone for files"
			>
				<div class="py-6 text-center">
					{#if uploading}
						<svg
							class="mx-auto h-6 w-6 animate-spin text-accent-300"
							viewBox="0 0 24 24"
							fill="none"
						>
							<circle
								cx="12"
								cy="12"
								r="10"
								stroke="currentColor"
								stroke-width="3"
								opacity="0.3"
							/>
							<path
								d="M12 2a10 10 0 0 1 10 10"
								stroke="currentColor"
								stroke-width="3"
								stroke-linecap="round"
							/>
						</svg>
						<p class="mt-2 text-sm text-accent-300">Encrypting...</p>
					{:else}
						<svg
							class="mx-auto h-6 w-6 text-surface-500"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
							stroke-linecap="round"
							stroke-linejoin="round"
						>
							<path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
							<polyline points="17 8 12 3 7 8" />
							<line x1="12" y1="3" x2="12" y2="15" />
						</svg>
						<p class="mt-2 text-sm text-surface-400">Drop files to encrypt</p>
						<label
							class="mt-2 inline-block cursor-pointer rounded-lg border border-surface-700 px-4 py-1.5 text-xs text-surface-300 transition-colors hover:bg-surface-800"
						>
							Browse files
							<input type="file" class="hidden" onchange={handleFileInput} />
						</label>
					{/if}
				</div>
			</div>
		</div>

		<!-- Document list -->
		{#if docs.length === 0}
			<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-12 text-center">
				<svg
					class="mx-auto h-8 w-8 text-surface-600"
					viewBox="0 0 24 24"
					fill="none"
					stroke="currentColor"
					stroke-width="1.5"
					stroke-linecap="round"
					stroke-linejoin="round"
				>
					<path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
					<polyline points="14 2 14 8 20 8" />
				</svg>
				<p class="mt-3 text-sm text-surface-400">No encrypted documents</p>
				<p class="mt-1 text-xs text-surface-500">Upload files above to encrypt and store them</p>
			</div>
		{:else}
			<div>
				<h2
					class="mb-3 font-mono text-[10px] font-medium uppercase tracking-[1.5px] text-surface-500"
				>
					Encrypted Documents ({docs.length})
				</h2>
				<div class="space-y-2">
					{#each docs as doc}
						{@const icon = categoryIcons[doc.category] || categoryIcons.other}
						<div
							class="group relative flex items-center justify-between rounded-lg border border-surface-700/50 bg-surface-800 px-5 py-3.5 transition-all hover:border-surface-600"
						>
							<div class="flex min-w-0 flex-1 items-center gap-3">
								<svg
									class="h-4 w-4 shrink-0 text-surface-500"
									viewBox="0 0 24 24"
									fill="none"
									stroke="currentColor"
									stroke-width="2"
									stroke-linecap="round"
									stroke-linejoin="round"
								>
									{#each icon.split(' M') as segment, i}
										<path d={i === 0 ? segment : 'M' + segment} />
									{/each}
								</svg>
								<div class="min-w-0">
									<p class="truncate text-[13px] font-medium text-surface-200">{doc.name}</p>
									<p class="text-xs text-surface-500">
										{categories[doc.category] || doc.category} &middot; {formatSize(
											doc.file_size
										)} &middot; {doc.created_at?.split(/[ T]/)[0] || ''}
									</p>
								</div>
							</div>
							<div class="flex gap-2">
								<button
									onclick={() => downloadDoc(doc)}
									class="rounded-md px-3 py-1.5 text-xs font-medium text-accent-300 transition-colors hover:bg-surface-700"
								>
									Decrypt
								</button>
								<button
									onclick={() => deleteDoc(doc)}
									class="rounded-md px-3 py-1.5 text-xs text-red-400 transition-colors hover:bg-surface-700"
								>
									Delete
								</button>
							</div>
							<div
								class="pointer-events-none absolute bottom-0 right-0 h-5 w-5 rounded-br-lg border-b-2 border-r-2 border-accent-300 opacity-0 transition-opacity group-hover:opacity-20"
							></div>
						</div>
					{/each}
				</div>
			</div>
		{/if}
	{/if}

	<p class="text-xs text-surface-500">
		All documents encrypted locally with AES-256-GCM. Key derived via Argon2id (64MB, 3
		iterations). Files stored on your machine only.
	</p>
</div>
