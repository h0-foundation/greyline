<script lang="ts">
  interface FileResult {
    file: File;
    filename: string;
    size: number;
    analyzing: boolean;
    stripping: boolean;
    metadata: {
      hasGps: boolean;
      hasDevice: boolean;
      hasThumbnail: boolean;
      markerCount: number;
      totalExifBytes: number;
    } | null;
    stripped: boolean;
    removedBytes: number;
    error: string;
  }

  let files = $state<FileResult[]>([]);
  let dragOver = $state(false);

  function addFiles(fileList: FileList) {
    const newFiles = [...fileList]
      .filter((f) => f.type.startsWith('image/'))
      .map((f): FileResult => ({
        file: f,
        filename: f.name,
        size: f.size,
        analyzing: false,
        stripping: false,
        metadata: null,
        stripped: false,
        removedBytes: 0,
        error: ''
      }));
    files = [...files, ...newFiles];
  }

  function handleDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    if (e.dataTransfer?.files) {
      addFiles(e.dataTransfer.files);
    }
  }

  function handleFileInput(e: Event) {
    const input = e.target as HTMLInputElement;
    if (input.files) {
      addFiles(input.files);
      input.value = '';
    }
  }

  async function analyzeFile(entry: FileResult) {
    entry.analyzing = true;
    entry.error = '';
    try {
      const form = new FormData();
      form.append('file', entry.file);
      form.append('action', 'analyze');
      const res = await fetch('/api/tools/exif', { method: 'POST', body: form });
      if (!res.ok) {
        entry.error = 'Analysis failed';
        entry.analyzing = false;
        return;
      }
      const data = await res.json();
      entry.metadata = data.metadata;
    } catch {
      entry.error = 'Analysis failed';
    }
    entry.analyzing = false;
  }

  async function stripFile(entry: FileResult) {
    entry.stripping = true;
    entry.error = '';
    try {
      const form = new FormData();
      form.append('file', entry.file);
      form.append('action', 'strip');
      const res = await fetch('/api/tools/exif', { method: 'POST', body: form });
      if (!res.ok) {
        entry.error = 'Strip failed';
        entry.stripping = false;
        return;
      }
      entry.removedBytes = parseInt(res.headers.get('X-Removed-Bytes') || '0', 10);
      entry.stripped = true;

      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `clean_${entry.filename}`;
      a.click();
      URL.revokeObjectURL(url);
    } catch {
      entry.error = 'Strip failed';
    }
    entry.stripping = false;
  }

  async function analyzeAll() {
    for (const entry of files) {
      if (!entry.metadata && !entry.analyzing) {
        await analyzeFile(entry);
      }
    }
  }

  async function stripAll() {
    for (const entry of files) {
      if (!entry.stripped && !entry.stripping) {
        await stripFile(entry);
      }
    }
  }

  function removeFile(index: number) {
    files = files.filter((_, i) => i !== index);
  }

  function clearAll() {
    files = [];
  }

  function formatSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
  }
</script>

<svelte:head>
  <title>EXIF Stripper - Greyline</title>
</svelte:head>

<div class="space-y-6">
  <div>
    <a href="/tools" class="text-sm text-accent-400 hover:text-accent-300">&larr; Tools</a>
    <h1 class="mt-2 text-xl font-semibold text-surface-100">EXIF Stripper</h1>
    <p class="mt-1 text-sm text-surface-400">Remove GPS, device info, and timestamps from photos</p>
  </div>

  <!-- Drop zone -->
  <div
    class="flex min-h-48 items-center justify-center rounded-lg border-2 border-dashed transition-colors {dragOver
      ? 'border-accent-500 bg-accent-500/5'
      : 'border-surface-700 bg-surface-900'}"
    ondrop={handleDrop}
    ondragover={(e) => { e.preventDefault(); dragOver = true; }}
    ondragleave={() => (dragOver = false)}
    role="region"
    aria-label="Drop zone for images"
  >
    <div class="text-center py-8">
      <p class="text-surface-400">Drag and drop images here</p>
      <p class="mt-1 text-sm text-surface-500">JPEG images supported</p>
      <label class="mt-3 inline-block cursor-pointer rounded-lg border border-surface-700 px-4 py-2 text-sm text-surface-300 hover:bg-surface-800">
        Browse files
        <input type="file" accept="image/*" multiple class="hidden" onchange={handleFileInput} />
      </label>
    </div>
  </div>

  {#if files.length > 0}
    <!-- Action buttons -->
    <div class="flex items-center justify-between">
      <p class="text-sm text-surface-400">{files.length} file(s) selected</p>
      <div class="flex gap-2">
        <button
          onclick={analyzeAll}
          class="rounded-lg border border-surface-700 px-4 py-2 text-sm text-surface-300 hover:bg-surface-800"
        >
          Analyze All
        </button>
        <button
          onclick={stripAll}
          class="rounded-lg bg-accent-700 px-4 py-2 text-sm font-medium text-white hover:bg-accent-600"
        >
          Strip All
        </button>
        <button
          onclick={clearAll}
          class="rounded-lg border border-surface-700 px-4 py-2 text-sm text-surface-300 hover:bg-surface-800"
        >
          Clear
        </button>
      </div>
    </div>

    <!-- Results table -->
    <div class="overflow-x-auto rounded-lg border border-surface-800">
      <table class="w-full text-left text-sm">
        <thead class="border-b border-surface-700/50 bg-surface-800">
          <tr>
            <th class="px-4 py-3 font-medium text-surface-300">Filename</th>
            <th class="px-4 py-3 font-medium text-surface-300">Original Size</th>
            <th class="px-4 py-3 font-medium text-surface-300">GPS</th>
            <th class="px-4 py-3 font-medium text-surface-300">Device</th>
            <th class="px-4 py-3 font-medium text-surface-300">Thumbnail</th>
            <th class="px-4 py-3 font-medium text-surface-300">EXIF Bytes</th>
            <th class="px-4 py-3 font-medium text-surface-300">Removed</th>
            <th class="px-4 py-3 font-medium text-surface-300">Actions</th>
          </tr>
        </thead>
        <tbody class="divide-y divide-surface-800">
          {#each files as entry, i}
            <tr class="bg-surface-950 hover:bg-surface-900">
              <td class="px-4 py-3 text-surface-200">
                <span class="block max-w-48 truncate" title={entry.filename}>{entry.filename}</span>
              </td>
              <td class="px-4 py-3 text-surface-400">{formatSize(entry.size)}</td>
              {#if entry.metadata}
                <td class="px-4 py-3">
                  <span class={entry.metadata.hasGps ? 'text-red-400' : 'text-green-400'}>
                    {entry.metadata.hasGps ? 'Yes' : 'No'}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class={entry.metadata.hasDevice ? 'text-amber-400' : 'text-green-400'}>
                    {entry.metadata.hasDevice ? 'Yes' : 'No'}
                  </span>
                </td>
                <td class="px-4 py-3">
                  <span class={entry.metadata.hasThumbnail ? 'text-amber-400' : 'text-green-400'}>
                    {entry.metadata.hasThumbnail ? 'Yes' : 'No'}
                  </span>
                </td>
                <td class="px-4 py-3 text-surface-400">
                  {formatSize(entry.metadata.totalExifBytes)}
                </td>
              {:else if entry.analyzing}
                <td class="px-4 py-3 text-surface-500" colspan="4">Analyzing...</td>
              {:else}
                <td class="px-4 py-3 text-surface-600" colspan="4">--</td>
              {/if}
              <td class="px-4 py-3">
                {#if entry.stripped}
                  <span class="text-green-400">{formatSize(entry.removedBytes)}</span>
                {:else if entry.stripping}
                  <span class="text-surface-500">Stripping...</span>
                {:else}
                  <span class="text-surface-600">--</span>
                {/if}
              </td>
              <td class="px-4 py-3">
                <div class="flex gap-1">
                  {#if !entry.metadata && !entry.analyzing}
                    <button
                      onclick={() => analyzeFile(entry)}
                      class="rounded px-2 py-1 text-xs text-accent-400 hover:bg-surface-800"
                    >
                      Analyze
                    </button>
                  {/if}
                  {#if !entry.stripped && !entry.stripping}
                    <button
                      onclick={() => stripFile(entry)}
                      class="rounded px-2 py-1 text-xs text-accent-400 hover:bg-surface-800"
                    >
                      Strip
                    </button>
                  {/if}
                  {#if entry.stripped}
                    <span class="rounded bg-green-900/30 px-2 py-1 text-xs text-green-400">Done</span>
                  {/if}
                  <button
                    onclick={() => removeFile(i)}
                    class="rounded px-2 py-1 text-xs text-red-400 hover:bg-surface-800"
                  >
                    Remove
                  </button>
                </div>
                {#if entry.error}
                  <p class="mt-1 text-xs text-red-400">{entry.error}</p>
                {/if}
              </td>
            </tr>
          {/each}
        </tbody>
      </table>
    </div>
  {/if}
</div>
