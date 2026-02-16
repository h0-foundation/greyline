<script lang="ts">
	// ── Types ──────────────────────────────────────────────────────────
	type Climate = 'tropical' | 'temperate' | 'cold' | 'desert' | 'variable';
	type Duration = '1-3' | '4-7' | '7-14' | '14+';
	type TravelType = 'urban' | 'rural' | 'mixed';
	type RiskLevel = 'low' | 'medium' | 'high';

	interface PackingItem {
		id: string;
		label: string;
		detail: string;
		checked: boolean;
		conditions?: {
			climates?: Climate[];
			durations?: Duration[];
			travelTypes?: TravelType[];
			riskLevels?: RiskLevel[];
		};
	}

	interface PackingCategory {
		name: string;
		icon: string;
		items: PackingItem[];
	}

	// ── Config state ──────────────────────────────────────────────────
	let climates = $state<Climate[]>(['temperate']);
	let duration = $state<Duration>('4-7');
	let travelType = $state<TravelType>('mixed');
	let riskLevel = $state<RiskLevel>('medium');
	let copyFeedback = $state(false);
	let listGenerated = $state(true);

	// ── Duration helpers ──────────────────────────────────────────────
	const durationLabels: Record<Duration, string> = {
		'1-3': '1-3 days',
		'4-7': '4-7 days',
		'7-14': '1-2 weeks',
		'14+': '2+ weeks'
	};

	const riskLabels: Record<RiskLevel, string> = {
		low: 'Low — tourist',
		medium: 'Medium — aware traveler',
		high: 'High — gray man operational'
	};

	const travelTypeLabels: Record<TravelType, string> = {
		urban: 'Urban',
		rural: 'Rural',
		mixed: 'Mixed'
	};

	const climateLabels: Record<Climate, string> = {
		tropical: 'Tropical',
		temperate: 'Temperate',
		cold: 'Cold',
		desert: 'Desert',
		variable: 'Variable'
	};

	// ── Longer durations helper ───────────────────────────────────────
	const longerDurations: Duration[] = ['7-14', '14+'];
	const extendedDuration: Duration[] = ['14+'];

	// ── Master item database ──────────────────────────────────────────
	function buildMasterList(): PackingCategory[] {
		return [
			{
				name: 'Documents & Money',
				icon: 'passport',
				items: [
					{ id: 'dm-1', label: 'Passport / travel ID', detail: 'Verify validity — at least 6 months from return date', checked: false },
					{ id: 'dm-2', label: 'Passport color copies (2x)', detail: 'Store separately from original — one in luggage, one on person', checked: false },
					{ id: 'dm-3', label: 'Digital passport scan', detail: 'Encrypted offline copy on phone and cloud', checked: false },
					{ id: 'dm-4', label: 'Emergency contact card', detail: 'Laminated card with embassy, local emergency number, and personal contacts', checked: false },
					{ id: 'dm-5', label: 'Local currency cash', detail: 'Small denominations for taxis and tips — avoid large bills', checked: false },
					{ id: 'dm-6', label: 'USD/EUR backup cash', detail: 'Hard currency reserve hidden separately from wallet', checked: false },
					{ id: 'dm-7', label: 'Primary debit/credit card', detail: 'Notify bank of travel dates and destinations', checked: false },
					{ id: 'dm-8', label: 'Backup card (different network)', detail: 'Visa if primary is Mastercard or vice versa — different bank preferred', checked: false },
					{ id: 'dm-9', label: 'Travel insurance documentation', detail: 'Policy number, emergency hotline, and coverage summary', checked: false },
					{ id: 'dm-10', label: 'Visa / entry permits', detail: 'Physical and digital copies of all required visas', checked: false },
					{ id: 'dm-11', label: 'Document concealment pouch', detail: 'Hidden body pouch or belt for passport and cash reserve', checked: false, conditions: { riskLevels: ['medium', 'high'] } },
				]
			},
			{
				name: 'Gray Man Clothing',
				icon: 'clothing',
				items: [
					{ id: 'cl-1', label: 'Neutral-color t-shirts (3x)', detail: 'Gray, black, navy, olive — no logos, text, or patterns', checked: false },
					{ id: 'cl-2', label: 'Neutral-color t-shirts (+2 extra)', detail: 'Additional shirts for extended travel', checked: false, conditions: { durations: longerDurations } },
					{ id: 'cl-3', label: 'Long-sleeve button shirt', detail: 'Versatile layer — blends in at restaurants and offices', checked: false },
					{ id: 'cl-4', label: 'Pants — dark, quick-dry (2x)', detail: 'No cargo pants or tactical-look — choose plain chinos or travel pants', checked: false },
					{ id: 'cl-5', label: 'Shorts — neutral color', detail: 'Blend-in shorts for warm climates', checked: false, conditions: { climates: ['tropical', 'desert', 'temperate', 'variable'] } },
					{ id: 'cl-6', label: 'Lightweight rain jacket', detail: 'Packable, non-branded, neutral color', checked: false, conditions: { climates: ['tropical', 'temperate', 'variable'] } },
					{ id: 'cl-7', label: 'Thermal base layer top', detail: 'Merino or synthetic — worn under outer layers', checked: false, conditions: { climates: ['cold', 'variable'] } },
					{ id: 'cl-8', label: 'Thermal base layer bottoms', detail: 'Lightweight thermal leggings for cold environments', checked: false, conditions: { climates: ['cold'] } },
					{ id: 'cl-9', label: 'Insulated jacket', detail: 'Packable down or synthetic — neutral color, no branding', checked: false, conditions: { climates: ['cold', 'variable'] } },
					{ id: 'cl-10', label: 'Warm hat and gloves', detail: 'Knit beanie and thin gloves — dark neutral colors', checked: false, conditions: { climates: ['cold'] } },
					{ id: 'cl-11', label: 'Lightweight breathable clothing', detail: 'Linen or moisture-wicking fabrics for heat management', checked: false, conditions: { climates: ['tropical', 'desert'] } },
					{ id: 'cl-12', label: 'Walking shoes — plain, broken-in', detail: 'Comfortable, non-tactical appearance — dark color', checked: false },
					{ id: 'cl-13', label: 'Sturdy hiking boots', detail: 'Ankle support for uneven terrain — already broken in', checked: false, conditions: { travelTypes: ['rural'] } },
					{ id: 'cl-14', label: 'Underwear (4x)', detail: 'Quick-dry, moisture-wicking — dark colors', checked: false },
					{ id: 'cl-15', label: 'Socks (4x)', detail: 'Merino blend — dark colors, quick-dry', checked: false },
					{ id: 'cl-16', label: 'Reversible or packable hat', detail: 'Changes silhouette — useful for altering appearance', checked: false, conditions: { riskLevels: ['high'] } },
					{ id: 'cl-17', label: 'Laundry wash strips', detail: 'Compact detergent sheets for hand-washing clothes', checked: false, conditions: { durations: longerDurations } },
					{ id: 'cl-18', label: 'Travel clothesline', detail: 'Lightweight line for drying hand-washed items', checked: false, conditions: { durations: longerDurations } },
				]
			},
			{
				name: 'Electronics',
				icon: 'electronics',
				items: [
					{ id: 'el-1', label: 'Phone + charger cable', detail: 'Primary communication device — ensure unlocked for local SIM', checked: false },
					{ id: 'el-2', label: 'Universal power adapter', detail: 'All-in-one adapter for destination plug types', checked: false },
					{ id: 'el-3', label: 'Portable battery pack', detail: '10000+ mAh — keep charged for emergencies', checked: false },
					{ id: 'el-4', label: 'USB data blocker', detail: 'Prevents juice-jacking at public charging stations', checked: false },
					{ id: 'el-5', label: 'VPN configured and tested', detail: 'Installed and tested before departure — multiple server locations', checked: false },
					{ id: 'el-6', label: 'Offline maps downloaded', detail: 'Google Maps / OsmAnd offline areas for all destinations', checked: false },
					{ id: 'el-7', label: 'Second charger cable', detail: 'Backup cable — different length or type', checked: false, conditions: { durations: longerDurations } },
					{ id: 'el-8', label: 'Burner phone consideration', detail: 'Secondary device for high-risk areas — prepaid, no personal data', checked: false, conditions: { riskLevels: ['high'] } },
					{ id: 'el-9', label: 'Earbuds (wired preferred)', detail: 'Wired earbuds avoid Bluetooth tracking — also useful for calls', checked: false },
					{ id: 'el-10', label: 'Local SIM or eSIM plan', detail: 'Research and purchase in advance if possible — avoid airport markup', checked: false },
				]
			},
			{
				name: 'Security & OPSEC',
				icon: 'security',
				items: [
					{ id: 'sc-1', label: 'Portable door wedge alarm', detail: 'Wedge under hotel room door — audible alarm if forced', checked: false },
					{ id: 'sc-2', label: 'Faraday bag / RFID sleeve', detail: 'Blocks wireless signals — for passport, cards, and phone', checked: false },
					{ id: 'sc-3', label: 'Privacy screen protector', detail: 'Limits screen viewing angle — prevents shoulder surfing', checked: false },
					{ id: 'sc-4', label: 'Tamper-evident tape', detail: 'Place on luggage zippers and hotel safe to detect unauthorized access', checked: false },
					{ id: 'sc-5', label: 'Small flashlight', detail: 'Compact tactical light — useful for room sweeps and power outages', checked: false },
					{ id: 'sc-6', label: 'Luggage locks (TSA-approved)', detail: 'Non-TSA for non-US destinations to prevent easy access', checked: false },
					{ id: 'sc-7', label: 'Cable lock for bags', detail: 'Secure bags to fixed objects in hostels or transit', checked: false },
					{ id: 'sc-8', label: 'Counter-surveillance awareness card', detail: 'Pocket reference for identifying common surveillance indicators', checked: false, conditions: { riskLevels: ['high'] } },
					{ id: 'sc-9', label: 'Dummy wallet', detail: 'Decoy wallet with expired cards and small cash for muggers', checked: false, conditions: { riskLevels: ['medium', 'high'] } },
					{ id: 'sc-10', label: 'Anti-theft daypack', detail: 'Slash-proof, lockable zippers, hidden pockets', checked: false, conditions: { travelTypes: ['urban', 'mixed'] } },
					{ id: 'sc-11', label: 'Webcam covers (2x)', detail: 'Cover laptop and phone cameras when not in use', checked: false, conditions: { riskLevels: ['medium', 'high'] } },
				]
			},
			{
				name: 'Health & Hygiene',
				icon: 'health',
				items: [
					{ id: 'hh-1', label: 'Prescription medications + copies', detail: 'Full supply plus written prescriptions — keep in original packaging', checked: false },
					{ id: 'hh-2', label: 'Basic first aid kit', detail: 'Bandages, antiseptic wipes, pain relievers, anti-diarrheal', checked: false },
					{ id: 'hh-3', label: 'Hand sanitizer', detail: 'Small travel-size bottle for situations without water access', checked: false },
					{ id: 'hh-4', label: 'Sunscreen (SPF 50+)', detail: 'Broad spectrum — essential in tropical, desert, and high-altitude areas', checked: false },
					{ id: 'hh-5', label: 'DEET insect repellent', detail: 'High concentration for mosquito-borne disease areas', checked: false, conditions: { climates: ['tropical'] } },
					{ id: 'hh-6', label: 'Water purification tablets', detail: 'Backup purification for untreated water sources', checked: false, conditions: { climates: ['tropical'], travelTypes: ['rural', 'mixed'] } },
					{ id: 'hh-7', label: 'Electrolyte packets', detail: 'Rehydration salts for heat exposure or illness', checked: false, conditions: { climates: ['tropical', 'desert'] } },
					{ id: 'hh-8', label: 'Toiletries bag (TSA compliant)', detail: 'Toothbrush, toothpaste, deodorant, razor — all travel size', checked: false },
					{ id: 'hh-9', label: 'Lip balm with SPF', detail: 'Prevents cracking in cold, dry, or high-altitude environments', checked: false, conditions: { climates: ['cold', 'desert'] } },
					{ id: 'hh-10', label: 'Extended first aid supplies', detail: 'Blister care, elastic bandage, tweezers, moleskin for longer trips', checked: false, conditions: { travelTypes: ['rural'] } },
					{ id: 'hh-11', label: 'Personal hygiene wipes', detail: 'Biodegradable wipes for situations without shower access', checked: false, conditions: { travelTypes: ['rural'] } },
				]
			},
			{
				name: 'Emergency Go-Bag',
				icon: 'emergency',
				items: [
					{ id: 'gb-1', label: 'Passport (always accessible)', detail: 'Never store in checked luggage — keep on person or in hotel safe', checked: false },
					{ id: 'gb-2', label: 'Emergency cash reserve', detail: 'Separate from main wallet — enough for 48 hours of expenses', checked: false },
					{ id: 'gb-3', label: 'Charged phone + charger', detail: 'Always maintain minimum 50% battery — carry charger in go-bag', checked: false },
					{ id: 'gb-4', label: 'Water bottle (collapsible)', detail: 'Collapsible bottle — fill daily, always have water available', checked: false },
					{ id: 'gb-5', label: 'Energy bars (2-3)', detail: 'High-calorie, long shelf life — rotate stock', checked: false },
					{ id: 'gb-6', label: 'Embassy address and phone', detail: 'Written on paper — do not rely solely on phone', checked: false },
					{ id: 'gb-7', label: 'Local emergency numbers', detail: 'Police, ambulance, fire — may differ from home country', checked: false },
					{ id: 'gb-8', label: 'Hotel address in local language', detail: 'Written card to show taxi drivers — include map screenshot', checked: false },
					{ id: 'gb-9', label: 'Photocopy of return ticket', detail: 'Paper backup of flight confirmation and booking reference', checked: false },
				]
			},
			{
				name: 'Comfort & Utility',
				icon: 'comfort',
				items: [
					{ id: 'cu-1', label: 'Earplugs (foam, 2 pairs)', detail: 'Essential for sleep in noisy hotels and long flights', checked: false },
					{ id: 'cu-2', label: 'Eye mask', detail: 'Light-blocking mask for sleep — adjustable strap', checked: false },
					{ id: 'cu-3', label: 'Travel pillow', detail: 'Compressible neck pillow for long transit legs', checked: false, conditions: { durations: longerDurations } },
					{ id: 'cu-4', label: 'Pen (black ink)', detail: 'For customs forms, notes, and signing documents', checked: false },
					{ id: 'cu-5', label: 'Small notebook', detail: 'Analog notes — no battery, no hack, no cloud', checked: false },
					{ id: 'cu-6', label: 'Packing cubes', detail: 'Organize clothing and enable rapid repacking', checked: false },
					{ id: 'cu-7', label: 'Ziplock bags (assorted)', detail: 'Waterproofing for documents, electronics, and wet items', checked: false },
					{ id: 'cu-8', label: 'Metro / transit card', detail: 'Pre-loaded transit card — avoid buying tickets at machines', checked: false, conditions: { travelTypes: ['urban', 'mixed'] } },
					{ id: 'cu-9', label: 'City map (paper backup)', detail: 'Printed map of key areas — works without battery or signal', checked: false, conditions: { travelTypes: ['urban', 'mixed'] } },
					{ id: 'cu-10', label: 'Refillable water bottle', detail: 'Durable bottle for hydration in areas without reliable vendors', checked: false, conditions: { travelTypes: ['rural'] } },
					{ id: 'cu-11', label: 'Paracord or utility cord (3m)', detail: 'Multi-use cordage — clothesline, gear repair, improvised solutions', checked: false, conditions: { riskLevels: ['high'] } },
					{ id: 'cu-12', label: 'Sunglasses (non-branded)', detail: 'UV protection and reduced eye contact — plain frames', checked: false },
				]
			}
		];
	}

	// ── State ─────────────────────────────────────────────────────────
	let categories = $state<PackingCategory[]>(buildMasterList());

	// ── Filter items based on current config ──────────────────────────
	function itemMatchesConfig(item: PackingItem): boolean {
		if (!item.conditions) return true;
		const c = item.conditions;

		if (c.climates && c.climates.length > 0) {
			if (!c.climates.some((cl) => climates.includes(cl))) return false;
		}
		if (c.durations && c.durations.length > 0) {
			if (!c.durations.includes(duration)) return false;
		}
		if (c.travelTypes && c.travelTypes.length > 0) {
			if (!c.travelTypes.includes(travelType)) return false;
		}
		if (c.riskLevels && c.riskLevels.length > 0) {
			if (!c.riskLevels.includes(riskLevel)) return false;
		}
		return true;
	}

	// ── Filtered categories ───────────────────────────────────────────
	let filteredCategories = $derived(
		categories
			.map((cat) => ({
				...cat,
				items: cat.items.filter(itemMatchesConfig)
			}))
			.filter((cat) => cat.items.length > 0)
	);

	let checkedCount = $derived(
		filteredCategories.reduce((sum, c) => sum + c.items.filter((i) => i.checked).length, 0)
	);

	let totalCount = $derived(
		filteredCategories.reduce((sum, c) => sum + c.items.length, 0)
	);

	let progressPercent = $derived(totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0);
	let allPacked = $derived(checkedCount === totalCount && totalCount > 0);

	// ── Persistence ───────────────────────────────────────────────────
	const STORAGE_KEY = 'greyline-packing';

	interface SavedState {
		climates: Climate[];
		duration: Duration;
		travelType: TravelType;
		riskLevel: RiskLevel;
		checked: string[];
	}

	// Load on mount
	$effect(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const state = JSON.parse(saved) as SavedState;
				climates = state.climates;
				duration = state.duration;
				travelType = state.travelType;
				riskLevel = state.riskLevel;
				const checkedIds = new Set(state.checked);
				for (const cat of categories) {
					for (const item of cat.items) {
						item.checked = checkedIds.has(item.id);
					}
				}
			} catch { /* ignore corrupt data */ }
		}
	});

	function save() {
		const checkedIds = categories.flatMap((c) => c.items).filter((i) => i.checked).map((i) => i.id);
		const state: SavedState = {
			climates,
			duration,
			travelType,
			riskLevel,
			checked: checkedIds
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}

	// ── Actions ───────────────────────────────────────────────────────
	function toggleClimate(c: Climate) {
		if (climates.includes(c)) {
			if (climates.length > 1) {
				climates = climates.filter((v) => v !== c);
			}
		} else {
			climates = [...climates, c];
		}
	}

	function generateList() {
		listGenerated = true;
		save();
	}

	function resetChecks() {
		for (const cat of categories) {
			for (const item of cat.items) {
				item.checked = false;
			}
		}
		save();
	}

	function copyList() {
		const lines: string[] = [];
		for (const cat of filteredCategories) {
			lines.push(`## ${cat.name}`);
			for (const item of cat.items) {
				const mark = item.checked ? 'x' : ' ';
				lines.push(`- [${mark}] ${item.label}`);
			}
			lines.push('');
		}
		navigator.clipboard.writeText(lines.join('\n')).then(() => {
			copyFeedback = true;
			setTimeout(() => { copyFeedback = false; }, 2000);
		});
	}
</script>

<svelte:head>
	<title>Packing List - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<a href="/tools" class="text-sm text-accent-400 hover:text-accent-300">&larr; Tools</a>
		<h1 class="mt-2 text-xl font-semibold text-surface-100">Packing List Generator</h1>
		<p class="mt-1 text-sm text-surface-400">Gray man packing list — adjust for climate, duration, and risk level</p>
	</div>

	<!-- Configuration Panel -->
	<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5 space-y-5">
		<h2 class="text-sm font-medium uppercase tracking-wider text-surface-400">Configuration</h2>

		<!-- Climate (multi-select toggles) -->
		<div>
			<label class="mb-2 block text-sm text-surface-300">Climate</label>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(climateLabels) as [key, label]}
					{@const active = climates.includes(key as Climate)}
					<button
						onclick={() => toggleClimate(key as Climate)}
						class="rounded-lg border px-3 py-1.5 text-sm transition-colors {active
							? 'border-accent-600 bg-accent-700/20 text-accent-300'
							: 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600 hover:text-surface-300'}"
					>
						{label}
					</button>
				{/each}
			</div>
			<p class="mt-1 text-xs text-surface-500">Select one or more — items adjust based on climate needs</p>
		</div>

		<!-- Duration (radio) -->
		<div>
			<label class="mb-2 block text-sm text-surface-300">Duration</label>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(durationLabels) as [key, label]}
					{@const active = duration === key}
					<button
						onclick={() => { duration = key as Duration; }}
						class="rounded-lg border px-3 py-1.5 text-sm transition-colors {active
							? 'border-accent-600 bg-accent-700/20 text-accent-300'
							: 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600 hover:text-surface-300'}"
					>
						{label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Travel Type (radio) -->
		<div>
			<label class="mb-2 block text-sm text-surface-300">Travel Type</label>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(travelTypeLabels) as [key, label]}
					{@const active = travelType === key}
					<button
						onclick={() => { travelType = key as TravelType; }}
						class="rounded-lg border px-3 py-1.5 text-sm transition-colors {active
							? 'border-accent-600 bg-accent-700/20 text-accent-300'
							: 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600 hover:text-surface-300'}"
					>
						{label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Risk Level (radio) -->
		<div>
			<label class="mb-2 block text-sm text-surface-300">Risk Level</label>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(riskLabels) as [key, label]}
					{@const active = riskLevel === key}
					<button
						onclick={() => { riskLevel = key as RiskLevel; }}
						class="rounded-lg border px-3 py-1.5 text-sm transition-colors {active
							? 'border-accent-600 bg-accent-700/20 text-accent-300'
							: 'border-surface-700 bg-surface-800 text-surface-400 hover:border-surface-600 hover:text-surface-300'}"
					>
						{label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Generate Button -->
		<div>
			<button
				onclick={generateList}
				class="rounded-lg bg-accent-700 px-5 py-2 text-sm font-medium text-white hover:bg-accent-600 transition-colors"
			>
				Generate List
			</button>
		</div>
	</div>

	{#if listGenerated}
		<!-- Progress Bar & Actions -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<div class="flex items-center justify-between mb-3">
				<div class="flex items-center gap-3">
					<span class="text-sm font-medium {allPacked ? 'text-emerald-400' : 'text-surface-200'}">
						{checkedCount}/{totalCount} items packed
					</span>
					<span class="text-xs text-surface-500">({progressPercent}%)</span>
				</div>
				<div class="flex items-center gap-2">
					<button
						onclick={copyList}
						class="rounded-lg border border-surface-700 px-3 py-1.5 text-sm text-surface-400 hover:bg-surface-800 hover:text-surface-300 transition-colors"
					>
						{copyFeedback ? 'Copied!' : 'Copy List'}
					</button>
					<button
						onclick={resetChecks}
						class="rounded-lg border border-surface-700 px-3 py-1.5 text-sm text-surface-400 hover:bg-surface-800 hover:text-surface-300 transition-colors"
					>
						Reset
					</button>
				</div>
			</div>
			<!-- Progress bar -->
			<div class="h-2 w-full rounded-full bg-surface-800 overflow-hidden">
				<div
					class="h-full rounded-full transition-all duration-300 {allPacked ? 'bg-emerald-500' : 'bg-accent-600'}"
					style="width: {progressPercent}%"
				></div>
			</div>
		</div>

		{#if allPacked}
			<div class="rounded-lg border border-emerald-700/50 bg-emerald-900/10 px-4 py-3 text-sm text-emerald-300">
				All items packed. Verify go-bag is accessible and not in checked luggage.
			</div>
		{/if}

		<!-- Packing Categories -->
		{#each filteredCategories as category}
			{@const catChecked = category.items.filter((i) => i.checked).length}
			{@const catTotal = category.items.length}
			{@const catComplete = catChecked === catTotal}
			<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
				<div class="mb-3 flex items-center justify-between">
					<h3 class="text-sm font-medium uppercase tracking-wider text-surface-400">
						{category.name}
					</h3>
					<span class="text-xs {catComplete ? 'text-emerald-400' : 'text-surface-500'}">
						{catChecked}/{catTotal}
					</span>
				</div>
				<div class="space-y-1">
					{#each category.items as item}
						<label
							class="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2 hover:bg-surface-800"
						>
							<input
								type="checkbox"
								bind:checked={item.checked}
								onchange={save}
								class="mt-0.5 h-4 w-4 rounded border-surface-600 bg-surface-800 text-accent-500 focus:ring-accent-500"
							/>
							<div>
								<span class="text-sm {item.checked ? 'text-surface-500 line-through' : 'text-surface-200'}">
									{item.label}
								</span>
								<p class="text-xs text-surface-500">{item.detail}</p>
							</div>
						</label>
					{/each}
				</div>
			</div>
		{/each}
	{/if}
</div>
