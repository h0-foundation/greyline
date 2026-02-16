<script lang="ts">
	interface CountryData {
		name: { common: string; official?: string };
		currencies?: Record<string, { name: string; symbol: string }>;
		languages?: Record<string, string>;
		region?: string;
		subregion?: string;
		borders?: string[];
		car?: { side: string };
		idd?: { root: string; suffixes: string[] };
	}

	interface CheckSection {
		name: string;
		items: { id: string; label: string; detail: string; checked: boolean }[];
	}

	let countryInput = $state('');
	let countryCode = $state('');
	let countryData = $state<CountryData | null>(null);
	let loading = $state(false);
	let errorMsg = $state('');
	let hasSearched = $state(false);

	const COUNTRY_MAP: Record<string, string> = {
		'united states': 'US', 'usa': 'US', 'us': 'US',
		'united kingdom': 'GB', 'uk': 'GB', 'gb': 'GB', 'england': 'GB',
		'thailand': 'TH', 'th': 'TH',
		'japan': 'JP', 'jp': 'JP',
		'germany': 'DE', 'de': 'DE',
		'france': 'FR', 'fr': 'FR',
		'spain': 'ES', 'es': 'ES',
		'italy': 'IT', 'it': 'IT',
		'canada': 'CA', 'ca': 'CA',
		'australia': 'AU', 'au': 'AU',
		'mexico': 'MX', 'mx': 'MX',
		'brazil': 'BR', 'br': 'BR',
		'china': 'CN', 'cn': 'CN',
		'india': 'IN', 'in': 'IN',
		'south korea': 'KR', 'korea': 'KR', 'kr': 'KR',
		'singapore': 'SG', 'sg': 'SG',
		'indonesia': 'ID', 'id': 'ID',
		'vietnam': 'VN', 'vn': 'VN',
		'philippines': 'PH', 'ph': 'PH',
		'malaysia': 'MY', 'my': 'MY',
		'turkey': 'TR', 'tr': 'TR', 'turkiye': 'TR',
		'egypt': 'EG', 'eg': 'EG',
		'south africa': 'ZA', 'za': 'ZA',
		'argentina': 'AR', 'ar': 'AR',
		'colombia': 'CO', 'co': 'CO',
		'peru': 'PE', 'pe': 'PE',
		'chile': 'CL', 'cl': 'CL',
		'poland': 'PL', 'pl': 'PL',
		'netherlands': 'NL', 'nl': 'NL',
		'sweden': 'SE', 'se': 'SE',
		'norway': 'NO', 'no': 'NO',
		'denmark': 'DK', 'dk': 'DK',
		'portugal': 'PT', 'pt': 'PT',
		'greece': 'GR', 'gr': 'GR',
		'switzerland': 'CH', 'ch': 'CH',
		'austria': 'AT', 'at': 'AT',
		'czech republic': 'CZ', 'czechia': 'CZ', 'cz': 'CZ',
		'hungary': 'HU', 'hu': 'HU',
		'romania': 'RO', 'ro': 'RO',
		'ireland': 'IE', 'ie': 'IE',
		'new zealand': 'NZ', 'nz': 'NZ',
		'israel': 'IL', 'il': 'IL',
		'uae': 'AE', 'united arab emirates': 'AE', 'ae': 'AE',
		'saudi arabia': 'SA', 'sa': 'SA',
		'russia': 'RU', 'ru': 'RU',
		'ukraine': 'UA', 'ua': 'UA',
		'morocco': 'MA', 'ma': 'MA',
		'kenya': 'KE', 'ke': 'KE',
		'nigeria': 'NG', 'ng': 'NG',
		'taiwan': 'TW', 'tw': 'TW',
		'hong kong': 'HK', 'hk': 'HK',
		'cambodia': 'KH', 'kh': 'KH',
		'laos': 'LA', 'la': 'LA',
		'myanmar': 'MM', 'mm': 'MM', 'burma': 'MM',
		'nepal': 'NP', 'np': 'NP',
		'sri lanka': 'LK', 'lk': 'LK',
		'bangladesh': 'BD', 'bd': 'BD',
		'pakistan': 'PK', 'pk': 'PK',
		'costa rica': 'CR', 'cr': 'CR',
		'panama': 'PA', 'pa': 'PA',
		'ecuador': 'EC', 'ec': 'EC',
		'bolivia': 'BO', 'bo': 'BO',
		'uruguay': 'UY', 'uy': 'UY',
		'paraguay': 'PY', 'py': 'PY',
		'finland': 'FI', 'fi': 'FI',
		'belgium': 'BE', 'be': 'BE',
		'croatia': 'HR', 'hr': 'HR',
		'iceland': 'IS', 'is': 'IS',
		'cuba': 'CU', 'cu': 'CU',
		'jamaica': 'JM', 'jm': 'JM',
		'dominican republic': 'DO', 'do': 'DO',
		'guatemala': 'GT', 'gt': 'GT',
		'ethiopia': 'ET', 'et': 'ET',
		'tanzania': 'TZ', 'tz': 'TZ',
		'ghana': 'GH', 'gh': 'GH',
		'senegal': 'SN', 'sn': 'SN',
		'jordan': 'JO', 'jo': 'JO',
		'lebanon': 'LB', 'lb': 'LB',
		'qatar': 'QA', 'qa': 'QA',
		'oman': 'OM', 'om': 'OM',
		'bahrain': 'BH', 'bh': 'BH',
		'kuwait': 'KW', 'kw': 'KW'
	};

	function resolveCode(input: string): string {
		const trimmed = input.trim();
		if (trimmed.length === 2) return trimmed.toUpperCase();
		const lookup = COUNTRY_MAP[trimmed.toLowerCase()];
		if (lookup) return lookup;
		return trimmed.toUpperCase().slice(0, 2);
	}

	async function fetchCountry() {
		const code = resolveCode(countryInput);
		if (!code || code.length < 2) return;

		countryCode = code;
		loading = true;
		errorMsg = '';
		countryData = null;
		hasSearched = true;

		try {
			const res = await fetch(`/api/knowledge?code=${encodeURIComponent(code)}`);
			if (res.ok) {
				const profile = await res.json();
				if (profile.rest_countries) {
					countryData = typeof profile.rest_countries === 'string'
						? JSON.parse(profile.rest_countries)
						: profile.rest_countries;
				}
			}
		} catch {
			// Country not found — use generic tips
		} finally {
			loading = false;
		}
	}

	function handleKeydown(e: KeyboardEvent) {
		if (e.key === 'Enter') fetchCountry();
	}

	// Derived helpers
	let countryName = $derived(countryData?.name?.common ?? countryCode);
	let region = $derived(countryData?.region ?? 'Unknown');
	let subregion = $derived(countryData?.subregion ?? '');
	let currencies = $derived(countryData?.currencies ? Object.entries(countryData.currencies) : []);
	let languages = $derived(countryData?.languages ? Object.values(countryData.languages) : []);
	let borderCountries = $derived(countryData?.borders ?? []);
	let driveSide = $derived(countryData?.car?.side ?? 'unknown');

	// Region-based content helpers
	let isAsia = $derived(region === 'Asia');
	let isMiddleEast = $derived(subregion?.includes('Western Asia') || subregion?.includes('Northern Africa'));
	let isEurope = $derived(region === 'Europe');
	let isAmericas = $derived(region === 'Americas');
	let isAfrica = $derived(region === 'Africa');
	let isOceania = $derived(region === 'Oceania');

	// Passport validity guidance based on region
	let passportValidity = $derived.by(() => {
		if (isEurope) return '3-6 months beyond planned stay (Schengen requires 3 months beyond departure)';
		if (isAsia) return '6 months beyond entry date (standard across most Asian countries)';
		if (isMiddleEast) return '6 months beyond entry date (strictly enforced)';
		if (isAfrica) return '6 months beyond entry date (many countries require this)';
		if (isAmericas) return '6 months recommended, though some countries accept validity through your stay';
		if (isOceania) return '6 months beyond intended stay (Australia and NZ enforce this)';
		return '6 months beyond planned travel dates (international standard)';
	});

	// Cash declaration threshold by region
	let declarationThreshold = $derived.by(() => {
		if (isEurope) return 'EUR 10,000 or equivalent (EU-wide regulation)';
		if (countryCode === 'US') return 'USD 10,000 or equivalent (CBP requirement, includes monetary instruments)';
		if (countryCode === 'AU') return 'AUD 10,000 or equivalent';
		if (countryCode === 'JP') return 'JPY 1,000,000 or equivalent (approximately USD 7,000)';
		if (countryCode === 'TH') return 'THB 450,000 or equivalent (approximately USD 12,500)';
		if (countryCode === 'CN') return 'CNY 20,000 or USD 5,000 equivalent';
		if (countryCode === 'IN') return 'INR 25,000 in Indian currency; no limit on foreign currency if declared';
		if (countryCode === 'SG') return 'SGD 20,000 or equivalent';
		if (isAsia) return 'Typically USD 5,000-10,000 equivalent — check specific country rules';
		if (isMiddleEast) return 'Varies widely — UAE requires declaration above AED 60,000 (~USD 16,000)';
		if (isAmericas) return 'Generally USD 10,000 equivalent — check specific country regulations';
		if (isAfrica) return 'Varies significantly — research specific country requirements before travel';
		return 'Most countries require declaration above USD 10,000 equivalent — verify before travel';
	});

	// Prohibited items by region
	let prohibitedItems = $derived.by((): string[] => {
		const universal = [
			'Narcotics and controlled substances',
			'Counterfeit goods and currency',
			'Weapons and ammunition without permits',
			'Endangered species products (CITES-regulated)',
			'Pirated media and copyrighted materials'
		];
		if (isAsia) return [...universal,
			'Chewing gum (Singapore), vaping products (Thailand, India)',
			'Religious items that may be considered disrespectful',
			'Pork products (in some Muslim-majority areas)',
			'Satellite phones without registration'
		];
		if (isMiddleEast) return [...universal,
			'Alcohol (varies — completely banned in Saudi Arabia, Kuwait)',
			'Pork products',
			'Religious materials other than Islam (Saudi Arabia)',
			'Revealing clothing or materials considered obscene',
			'Israeli passport stamps (some countries)'
		];
		if (isOceania) return [...universal,
			'Fresh food, fruit, vegetables, meat, eggs, dairy',
			'Plant materials, seeds, soil, biological specimens',
			'Wooden items that may harbor pests',
			'Australia and NZ have extremely strict biosecurity'
		];
		if (isAmericas) return [...universal,
			'Cuban cigars (entering US from Cuba)',
			'Fresh agricultural products across most borders',
			'Unlabeled prescription medications',
			'Large quantities of alcohol beyond duty-free limits'
		];
		if (isEurope) return [...universal,
			'Meat and dairy from non-EU countries (into EU)',
			'Products exceeding duty-free allowances',
			'Cultural artifacts without export documentation',
			'Certain dog breeds (UK and some EU nations)'
		];
		if (isAfrica) return [...universal,
			'Drone equipment without permits',
			'Camouflage clothing (illegal in several African countries)',
			'Plastic bags (banned in Kenya, Rwanda, Tanzania)',
			'Cultural artifacts and ivory products'
		];
		return universal;
	});

	// Border procedure tips
	let procedureTips = $derived.by((): string[] => {
		if (isEurope) return [
			'Schengen zone has no internal border checks between member states',
			'Non-Schengen entry requires passport control and may include questioning',
			'E-gates available for EU/EEA nationals and some visa-exempt travelers',
			'Customs declaration usually on exit from baggage hall — green (nothing to declare) or red channel',
			'Random bag checks at customs are common even in the green channel'
		];
		if (isAsia) return [
			'Immigration cards often required — fill out before reaching the desk',
			'Expect fingerprint and photo capture at many Asian borders',
			'Queue times can exceed 1-2 hours at major airports (Bangkok, Manila, Delhi)',
			'Have accommodation address ready — often required on immigration forms',
			'Keep your departure card stapled in your passport — do not lose it'
		];
		if (isMiddleEast) return [
			'Dress conservatively — long pants and covered shoulders',
			'Immigration officers may ask about purpose of visit in detail',
			'Some countries stamp on a separate paper (Israel offers this option)',
			'Alcohol limits are strictly enforced at Gulf state borders',
			'Expect thorough baggage screening at most Middle Eastern airports'
		];
		if (isAmericas) return [
			'US CBP officers may ask detailed questions about your itinerary and finances',
			'ESTA or visa must be arranged before travel to the US',
			'Latin American borders may require proof of onward travel',
			'Some land borders require patience — expect long waits during peak hours',
			'Agricultural declarations are taken very seriously — declare all food items'
		];
		if (isAfrica) return [
			'Yellow fever vaccination certificate often required',
			'Visa on arrival available in many countries but confirm beforehand',
			'Bribery attempts at some borders — know the official process and fees',
			'Keep small USD bills for visa fees (clean, recent bills preferred)',
			'Photo permits may be needed near border areas'
		];
		if (isOceania) return [
			'Australia and NZ have the strictest biosecurity in the world',
			'Declare ALL food, plant material, and animal products — fines for non-declaration are severe',
			'SmartGates available for eligible passport holders',
			'Expect your bags to be X-rayed and potentially searched',
			'Hiking boots may be inspected for soil contamination'
		];
		return [
			'Have your passport open to the photo page before reaching the desk',
			'Know your accommodation address and have it ready',
			'Be prepared to state your purpose and duration of visit',
			'Keep your boarding pass accessible until fully through customs',
			'Follow signage — do not use your phone while in the immigration line in some countries'
		];
	});

	// Demeanor tips
	let demeanorTips = $derived.by((): string[] => {
		const universal = [
			'Be polite, calm, and direct — do not joke with border officers',
			'Answer questions honestly but briefly — do not volunteer extra information',
			'Make eye contact without staring — appear confident but relaxed',
			'Have documents organized and ready before you reach the desk',
			'Do not argue or become confrontational if questioned further'
		];
		if (countryCode === 'US') return [...universal,
			'US CBP officers are trained to detect nervousness — stay composed',
			'Say "vacation" or "tourism" rather than lengthy explanations',
			'Do not use your phone while talking to the officer'
		];
		if (isMiddleEast) return [...universal,
			'Sir/Ma\'am or formal address is expected',
			'Be patient — processing may take longer than Western countries',
			'Do not display frustration even if you are kept waiting'
		];
		return universal;
	});

	// Checklist sections
	let sections = $state<CheckSection[]>([
		{
			name: 'Documents',
			items: [
				{ id: 'bc-d-1', label: 'Passport valid for 6+ months', detail: 'Verify expiry date against destination requirements', checked: false },
				{ id: 'bc-d-2', label: 'Visa obtained or confirmed visa-free', detail: 'Check e-visa, visa on arrival, or exemption status', checked: false },
				{ id: 'bc-d-3', label: 'Passport photo pages copied', detail: 'Digital copy in secure cloud + physical copy in separate bag', checked: false },
				{ id: 'bc-d-4', label: 'Travel insurance documented', detail: 'Some countries require proof of coverage at entry', checked: false },
				{ id: 'bc-d-5', label: 'Accommodation address noted', detail: 'First night hotel name and address for immigration forms', checked: false },
				{ id: 'bc-d-6', label: 'Return or onward ticket available', detail: 'Many countries require proof of departure plans', checked: false },
				{ id: 'bc-d-7', label: 'Immigration card pre-filled', detail: 'Download or obtain arrival cards in advance if possible', checked: false }
			]
		},
		{
			name: 'Financial Preparation',
			items: [
				{ id: 'bc-f-1', label: 'Cash below declaration threshold', detail: 'Know the limit and carry under or be prepared to declare', checked: false },
				{ id: 'bc-f-2', label: 'Local currency obtained', detail: 'Small amount for immediate needs (taxi, tips, transit)', checked: false },
				{ id: 'bc-f-3', label: 'Proof of funds if required', detail: 'Some countries ask for bank statements or credit card proof', checked: false },
				{ id: 'bc-f-4', label: 'Duty-free limits researched', detail: 'Alcohol, tobacco, and gift value limits vary by country', checked: false }
			]
		},
		{
			name: 'Digital Security',
			items: [
				{ id: 'bc-ds-1', label: 'Device screens cleaned of sensitive data', detail: 'Remove or archive sensitive messages, photos, and files', checked: false },
				{ id: 'bc-ds-2', label: 'Travel device prepared', detail: 'Consider using a clean device for border crossings', checked: false },
				{ id: 'bc-ds-3', label: 'Cloud accounts signed out', detail: 'Sign out of accounts you do not need at the border', checked: false },
				{ id: 'bc-ds-4', label: 'Biometric unlock disabled', detail: 'Switch to PIN/password — biometrics can be compelled', checked: false },
				{ id: 'bc-ds-5', label: 'VPN configured but not active', detail: 'VPN use while crossing may draw attention in some countries', checked: false },
				{ id: 'bc-ds-6', label: 'Browser history and tabs cleaned', detail: 'Clear browsing data and close sensitive tabs', checked: false }
			]
		},
		{
			name: 'Appearance & Behavior',
			items: [
				{ id: 'bc-a-1', label: 'Dressed appropriately for destination', detail: 'Conservative dress reduces scrutiny at most borders', checked: false },
				{ id: 'bc-a-2', label: 'Luggage looks like a regular tourist', detail: 'Avoid tactical/military gear bags that draw attention', checked: false },
				{ id: 'bc-a-3', label: 'Cover story is simple and consistent', detail: 'Tourism or visiting friends — nothing complicated', checked: false },
				{ id: 'bc-a-4', label: 'No prohibited items in luggage', detail: 'Double-check all bags for forgotten items from previous trips', checked: false },
				{ id: 'bc-a-5', label: 'Know the name of your hotel and area', detail: 'Officers may ask where you are staying — have a real answer', checked: false }
			]
		},
		{
			name: 'Health & Safety',
			items: [
				{ id: 'bc-h-1', label: 'Required vaccinations completed', detail: 'Yellow fever, COVID, or other country-specific requirements', checked: false },
				{ id: 'bc-h-2', label: 'Vaccination certificate carried', detail: 'Physical and digital copies of vaccination records', checked: false },
				{ id: 'bc-h-3', label: 'Prescription medications in original packaging', detail: 'With doctor\'s letter if carrying controlled substances', checked: false },
				{ id: 'bc-h-4', label: 'Emergency contacts noted', detail: 'Embassy phone number and local emergency number for destination', checked: false }
			]
		}
	]);

	let checkedCount = $derived(
		sections.reduce((sum, s) => sum + s.items.filter((i) => i.checked).length, 0)
	);
	let totalCount = $derived(sections.reduce((sum, s) => sum + s.items.length, 0));
	let complete = $derived(checkedCount === totalCount);

	// Load from localStorage
	$effect(() => {
		const saved = localStorage.getItem('border-crossing-checklist');
		if (saved) {
			try {
				const ids = JSON.parse(saved) as string[];
				for (const s of sections) {
					for (const item of s.items) {
						item.checked = ids.includes(item.id);
					}
				}
			} catch { /* ignore */ }
		}

		const savedCountry = localStorage.getItem('border-crossing-country');
		if (savedCountry) {
			countryInput = savedCountry;
			fetchCountry();
		}
	});

	function save() {
		const ids = sections.flatMap((s) => s.items).filter((i) => i.checked).map((i) => i.id);
		localStorage.setItem('border-crossing-checklist', JSON.stringify(ids));
	}

	function resetAll() {
		for (const s of sections) {
			for (const item of s.items) {
				item.checked = false;
			}
		}
		localStorage.removeItem('border-crossing-checklist');
	}

	function saveCountry() {
		if (countryInput.trim()) {
			localStorage.setItem('border-crossing-country', countryInput.trim());
		}
	}
</script>

<svelte:head>
	<title>Border Crossing - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<a href="/tools" class="text-sm text-accent-400 hover:text-accent-300">&larr; Tools</a>
		<h1 class="mt-2 text-xl font-semibold text-surface-100">Border Crossing Preparation</h1>
		<p class="mt-1 text-sm text-surface-400">Country-aware customs prep, document requirements, and crossing protocol</p>
	</div>

	<!-- Country Selector -->
	<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
		<label for="country-input" class="mb-2 block text-sm font-medium text-surface-300">Destination Country</label>
		<div class="flex gap-3">
			<input
				id="country-input"
				type="text"
				bind:value={countryInput}
				onkeydown={handleKeydown}
				placeholder='Country code or name (e.g. "TH", "Thailand", "JP")'
				class="flex-1 rounded-lg border border-surface-700 bg-surface-950 px-4 py-2.5 text-sm text-surface-100 placeholder-surface-600 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
			/>
			<button
				onclick={() => { fetchCountry(); saveCountry(); }}
				disabled={loading || !countryInput.trim()}
				class="rounded-lg bg-accent-700 px-5 py-2.5 text-sm font-medium text-surface-100 transition-colors hover:bg-accent-600 disabled:opacity-50 disabled:cursor-not-allowed"
			>
				{loading ? 'Loading...' : 'Lookup'}
			</button>
		</div>
		{#if hasSearched && !loading}
			<p class="mt-2 text-xs text-surface-500">
				{#if countryData}
					Showing profile for <span class="text-accent-400">{countryName}</span> ({countryCode}) &middot; {region}{subregion ? ` / ${subregion}` : ''}
				{:else}
					No country profile found for "{countryCode}" — showing universal border crossing tips
				{/if}
			</p>
		{/if}
	</div>

	{#if hasSearched && !loading}
		<!-- Document Requirements -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-medium text-surface-100">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"/><polyline points="14 2 14 8 20 8"/><line x1="16" y1="13" x2="8" y2="13"/><line x1="16" y1="17" x2="8" y2="17"/><polyline points="10 9 9 9 8 9"/></svg>
				Document Requirements
			</h2>
			<div class="space-y-3">
				<div class="rounded-md bg-surface-950 px-4 py-3">
					<h4 class="text-sm font-medium text-surface-200">Passport Validity</h4>
					<p class="mt-1 text-sm text-surface-400">{passportValidity}</p>
				</div>
				<div class="rounded-md bg-surface-950 px-4 py-3">
					<h4 class="text-sm font-medium text-surface-200">Visa Considerations</h4>
					<p class="mt-1 text-sm text-surface-400">
						{#if countryData}
							Research visa requirements for {countryName} well in advance. Many countries offer visa-on-arrival or e-visa options, but requirements vary by your passport nationality. Check your embassy or the destination country's immigration website for current rules.
						{:else}
							Always check visa requirements specific to your passport nationality. Requirements change frequently — verify through official embassy websites or services like iVisa/Timatic no more than 2 weeks before departure.
						{/if}
					</p>
				</div>
				<div class="rounded-md bg-surface-950 px-4 py-3">
					<h4 class="text-sm font-medium text-surface-200">Customs Declarations</h4>
					<p class="mt-1 text-sm text-surface-400">
						Declare all required items honestly. Under-declaring carries far greater risk than over-declaring. When in doubt, declare it and let officers clear it.
					</p>
				</div>
				{#if countryData && languages.length > 0}
					<div class="rounded-md bg-surface-950 px-4 py-3">
						<h4 class="text-sm font-medium text-surface-200">Local Languages</h4>
						<p class="mt-1 text-sm text-surface-400">{languages.join(', ')} — Learn "hello," "thank you," and "excuse me" in the local language. It helps at borders.</p>
					</div>
				{/if}
				{#if borderCountries.length > 0}
					<div class="rounded-md bg-surface-950 px-4 py-3">
						<h4 class="text-sm font-medium text-surface-200">Land Borders</h4>
						<p class="mt-1 text-sm text-surface-400">
							{countryName} shares borders with: {borderCountries.join(', ')}. Land border crossings often have different requirements and hours than air entry — research the specific crossing point you plan to use.
						</p>
					</div>
				{/if}
			</div>
		</div>

		<!-- What to Expect -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-medium text-surface-100">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="12" y1="16" x2="12" y2="12"/><line x1="12" y1="8" x2="12.01" y2="8"/></svg>
				What to Expect
			</h2>
			<div class="space-y-2">
				{#each procedureTips as tip}
					<div class="flex items-start gap-2 rounded-md bg-surface-950 px-4 py-3">
						<span class="mt-0.5 text-accent-500">&#8226;</span>
						<p class="text-sm text-surface-300">{tip}</p>
					</div>
				{/each}
			</div>
			<div class="mt-4 space-y-2">
				<h3 class="text-sm font-medium uppercase tracking-wider text-surface-400">Demeanor & Communication</h3>
				{#each demeanorTips as tip}
					<div class="flex items-start gap-2 px-4 py-1">
						<span class="mt-0.5 text-surface-600">&#8226;</span>
						<p class="text-sm text-surface-400">{tip}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Currency & Declarations -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-medium text-surface-100">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>
				Currency & Declarations
			</h2>
			<div class="space-y-3">
				{#if currencies.length > 0}
					<div class="rounded-md bg-surface-950 px-4 py-3">
						<h4 class="text-sm font-medium text-surface-200">Local Currency</h4>
						<div class="mt-2 space-y-1">
							{#each currencies as [code, info]}
								<p class="text-sm text-surface-300">
									<span class="font-mono text-accent-400">{code}</span> — {info.name}
									{#if info.symbol}
										<span class="ml-1 text-surface-500">({info.symbol})</span>
									{/if}
								</p>
							{/each}
						</div>
					</div>
				{/if}
				<div class="rounded-md bg-surface-950 px-4 py-3">
					<h4 class="text-sm font-medium text-surface-200">Cash Declaration Threshold</h4>
					<p class="mt-1 text-sm text-surface-400">{declarationThreshold}</p>
				</div>
				<div class="rounded-md bg-surface-950 px-4 py-3">
					<h4 class="text-sm font-medium text-surface-200">Declaration Tips</h4>
					<ul class="mt-1 space-y-1 text-sm text-surface-400">
						<li>&#8226; Carry cash in the local currency or widely accepted currencies (USD, EUR)</li>
						<li>&#8226; Declare amounts over the threshold — penalties for non-declaration are severe</li>
						<li>&#8226; Keep cash amounts reasonable for your stated trip length</li>
						<li>&#8226; Cash equivalents (traveler's checks, money orders) often count toward thresholds</li>
						<li>&#8226; Some countries also track outbound cash — declare on departure too</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- Prohibited Items -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-medium text-surface-100">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-red-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><line x1="4.93" y1="4.93" x2="19.07" y2="19.07"/></svg>
				Prohibited Items
				{#if countryData}
					<span class="text-sm font-normal text-surface-500">({region})</span>
				{/if}
			</h2>
			<div class="space-y-2">
				{#each prohibitedItems as item}
					<div class="flex items-start gap-2 rounded-md bg-surface-950 px-4 py-3">
						<span class="mt-0.5 text-red-500">&#10005;</span>
						<p class="text-sm text-surface-300">{item}</p>
					</div>
				{/each}
			</div>
			<p class="mt-3 text-xs text-surface-500">
				This is not exhaustive. Always check destination-specific customs regulations. Items legal in your home country may be strictly prohibited at your destination.
			</p>
		</div>

		<!-- Digital Security at Borders -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-medium text-surface-100">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="11" width="18" height="11" rx="2" ry="2"/><path d="M7 11V7a5 5 0 0 1 10 0v4"/></svg>
				Digital Security at Borders
			</h2>
			<div class="space-y-3">
				<div class="rounded-md bg-surface-950 px-4 py-3">
					<h4 class="text-sm font-medium text-surface-200">Device Inspection Rights</h4>
					<ul class="mt-2 space-y-1 text-sm text-surface-400">
						<li>&#8226; In many countries, border agents can legally compel you to unlock devices</li>
						<li>&#8226; The US, Canada, UK, Australia, and NZ all allow border device searches</li>
						<li>&#8226; Refusing to unlock may result in device seizure and/or denied entry</li>
						<li>&#8226; Constitutional protections are weaker at borders than within a country</li>
						<li>&#8226; Know your rights for your specific nationality and destination</li>
					</ul>
				</div>
				<div class="rounded-md bg-surface-950 px-4 py-3">
					<h4 class="text-sm font-medium text-surface-200">Device Preparation</h4>
					<ul class="mt-2 space-y-1 text-sm text-surface-400">
						<li>&#8226; <strong class="text-surface-300">Travel device:</strong> Consider a clean phone/laptop specifically for border crossings</li>
						<li>&#8226; <strong class="text-surface-300">Cloud accounts:</strong> Sign out of accounts containing sensitive data — they cannot search what is not on the device</li>
						<li>&#8226; <strong class="text-surface-300">Biometrics:</strong> Switch to PIN/password only — you can be compelled to use your fingerprint or face, but a password is harder to compel</li>
						<li>&#8226; <strong class="text-surface-300">Messaging apps:</strong> Use disappearing messages before travel; clear chat histories</li>
						<li>&#8226; <strong class="text-surface-300">Photos:</strong> Move sensitive photos to encrypted cloud storage and remove from device</li>
						<li>&#8226; <strong class="text-surface-300">Browser:</strong> Clear history, cookies, saved passwords; close all tabs</li>
						<li>&#8226; <strong class="text-surface-300">Power off:</strong> Shut down devices before reaching the border — full disk encryption is strongest before first unlock</li>
					</ul>
				</div>
				<div class="rounded-md border border-amber-900/30 bg-amber-950/20 px-4 py-3">
					<p class="text-sm text-amber-300/80">
						<strong>Important:</strong> Having a completely empty device can itself raise suspicion. A travel device should look like a normal device with some photos, apps, and messages — just nothing sensitive.
					</p>
				</div>
			</div>
		</div>

		<!-- Gray Man Tips -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 flex items-center gap-2 text-lg font-medium text-surface-100">
				<svg xmlns="http://www.w3.org/2000/svg" class="h-5 w-5 text-accent-400" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>
				Gray Man Tips
			</h2>
			<div class="space-y-3">
				<div class="rounded-md bg-surface-950 px-4 py-3">
					<h4 class="text-sm font-medium text-surface-200">Look Like a Regular Tourist</h4>
					<ul class="mt-2 space-y-1 text-sm text-surface-400">
						<li>&#8226; Carry a regular-looking suitcase or backpack — avoid tactical or military-style gear</li>
						<li>&#8226; Dress in neutral, unremarkable clothing appropriate for a tourist at your destination</li>
						<li>&#8226; Remove or cover any controversial patches, pins, or branding on your luggage</li>
						<li>&#8226; Have a guidebook, phrasebook, or tourist map visible — it reinforces the "tourist" narrative</li>
						{#if driveSide !== 'unknown'}
							<li>&#8226; Driving is on the <strong class="text-surface-300">{driveSide}</strong> side in {countryName} — knowing this shows you have researched your destination</li>
						{/if}
					</ul>
				</div>
				<div class="rounded-md bg-surface-950 px-4 py-3">
					<h4 class="text-sm font-medium text-surface-200">Keep Answers Brief</h4>
					<ul class="mt-2 space-y-1 text-sm text-surface-400">
						<li>&#8226; "Tourism" or "Vacation" is the ideal purpose-of-visit answer</li>
						<li>&#8226; "Two weeks" is better than "I am not really sure, it depends on how things go"</li>
						<li>&#8226; Name a specific hotel rather than "I will figure it out when I get there"</li>
						<li>&#8226; If asked about work, "I work in [vague industry]" is better than detailed explanations</li>
					</ul>
				</div>
				<div class="rounded-md bg-surface-950 px-4 py-3">
					<h4 class="text-sm font-medium text-surface-200">Do Not Volunteer Information</h4>
					<ul class="mt-2 space-y-1 text-sm text-surface-400">
						<li>&#8226; Answer only what is asked — extra details create more questions</li>
						<li>&#8226; Never mention security, privacy, or surveillance topics at the border</li>
						<li>&#8226; Do not explain your travel philosophy or reasons for visiting multiple countries</li>
						<li>&#8226; If asked about other countries visited, list only what is stamped in your passport</li>
						<li>&#8226; Idle chat with border officers is not small talk — every answer is being evaluated</li>
					</ul>
				</div>
				<div class="rounded-md bg-surface-950 px-4 py-3">
					<h4 class="text-sm font-medium text-surface-200">Red Flags to Avoid</h4>
					<ul class="mt-2 space-y-1 text-sm text-surface-400">
						<li>&#8226; Excessive stamps from "interesting" countries in a short period</li>
						<li>&#8226; One-way ticket with no clear return plan</li>
						<li>&#8226; Large amounts of cash without reasonable explanation</li>
						<li>&#8226; Multiple phones or SIM cards (carry only what you can explain)</li>
						<li>&#8226; Encryption-heavy device setup visible during inspection</li>
						<li>&#8226; Nervousness, excessive friendliness, or rehearsed-sounding answers</li>
					</ul>
				</div>
			</div>
		</div>

		<!-- Preparation Checklist -->
		<div class="space-y-4">
			<div class="flex items-center justify-between">
				<div>
					<h2 class="text-lg font-medium text-surface-100">Preparation Checklist</h2>
					<p class="text-sm text-surface-400">Track your border crossing preparation</p>
				</div>
				<div class="flex items-center gap-3">
					<span class="text-sm {complete ? 'text-emerald-400' : 'text-surface-400'}">
						{checkedCount}/{totalCount}
					</span>
					<button
						onclick={resetAll}
						class="rounded-lg border border-surface-700 px-3 py-1.5 text-sm text-surface-400 hover:bg-surface-800"
					>
						Reset
					</button>
				</div>
			</div>

			{#if complete}
				<div class="rounded-lg border border-emerald-700/50 bg-emerald-900/10 px-4 py-3 text-sm text-emerald-300">
					Border crossing preparation complete. All items verified.
				</div>
			{/if}

			{#each sections as section}
				{@const sChecked = section.items.filter((i) => i.checked).length}
				<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
					<div class="mb-3 flex items-center justify-between">
						<h3 class="text-sm font-medium uppercase tracking-wider text-surface-400">
							{section.name}
						</h3>
						<span class="text-xs {sChecked === section.items.length ? 'text-emerald-400' : 'text-surface-500'}">
							{sChecked}/{section.items.length}
						</span>
					</div>
					<div class="space-y-1">
						{#each section.items as item}
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
		</div>
	{/if}
</div>
