<script lang="ts">
	// ─── Types ───────────────────────────────────────────────────────────

	type RegionType = 'urban' | 'rural' | 'resort';
	type Climate = 'tropical' | 'temperate' | 'arid' | 'cold' | 'mediterranean';
	type RiskLevel = 'low' | 'medium' | 'high' | 'critical';
	type Gender = 'male' | 'female' | 'neutral';
	type Occasion = 'casual' | 'business' | 'tourist' | 'low-profile';

	interface ClothingItem {
		name: string;
		quantity: number;
		colorGuidance: string;
		note: string;
	}

	interface ClothingCategory {
		title: string;
		icon: string;
		items: ClothingItem[];
	}

	interface CulturalNote {
		title: string;
		detail: string;
	}

	interface SavedState {
		destination: string;
		regionType: RegionType;
		climate: Climate;
		duration: number;
		riskLevel: RiskLevel;
		gender: Gender;
		occasion: Occasion;
	}

	// ─── State ───────────────────────────────────────────────────────────

	let destination = $state('');
	let regionType = $state<RegionType>('urban');
	let climate = $state<Climate>('temperate');
	let duration = $state(7);
	let riskLevel = $state<RiskLevel>('medium');
	let gender = $state<Gender>('neutral');
	let occasion = $state<Occasion>('casual');
	let listGenerated = $state(false);
	let principlesExpanded = $state(true);

	// ─── Labels ──────────────────────────────────────────────────────────

	const regionTypeLabels: Record<RegionType, string> = {
		urban: 'Urban',
		rural: 'Rural',
		resort: 'Resort'
	};

	const climateLabels: Record<Climate, string> = {
		tropical: 'Tropical',
		temperate: 'Temperate',
		arid: 'Arid',
		cold: 'Cold',
		mediterranean: 'Mediterranean'
	};

	const riskLabels: Record<RiskLevel, string> = {
		low: 'Low',
		medium: 'Medium',
		high: 'High',
		critical: 'Critical'
	};

	const riskDescriptions: Record<RiskLevel, string> = {
		low: 'Tourist areas, low crime',
		medium: 'Moderate awareness needed',
		high: 'Active threat environment',
		critical: 'Hostile or denied area'
	};

	const genderLabels: Record<Gender, string> = {
		male: 'Male',
		female: 'Female',
		neutral: 'Neutral'
	};

	const occasionLabels: Record<Occasion, string> = {
		casual: 'Casual',
		business: 'Business',
		tourist: 'Tourist',
		'low-profile': 'Low-Profile'
	};

	const occasionDescriptions: Record<Occasion, string> = {
		casual: 'Everyday travel',
		business: 'Meetings and offices',
		tourist: 'Sightseeing and leisure',
		'low-profile': 'Minimal attention, gray man'
	};

	// ─── Duration label ──────────────────────────────────────────────────

	let durationLabel = $derived(
		duration === 1 ? '1 day' : `${duration} days`
	);

	// ─── Quantity helpers ─────────────────────────────────────────────────

	function qtyForDuration(base: number, perWeek: number): number {
		const weeks = Math.ceil(duration / 7);
		return Math.min(base + (weeks - 1) * perWeek, base + 4 * perWeek);
	}

	function baseQty(min: number, divider: number): number {
		return Math.max(min, Math.min(Math.ceil(duration / divider), min + 5));
	}

	// ─── Clothing generator ──────────────────────────────────────────────

	let clothingList = $derived.by((): ClothingCategory[] => {
		if (!listGenerated) return [];

		const isLowProfile = occasion === 'low-profile' || riskLevel === 'high' || riskLevel === 'critical';
		const isBusiness = occasion === 'business';
		const isHot = climate === 'tropical' || climate === 'arid' || climate === 'mediterranean';
		const isCold = climate === 'cold';
		const isUrban = regionType === 'urban';
		const isResort = regionType === 'resort';
		const isRural = regionType === 'rural';
		const isMale = gender === 'male';
		const isFemale = gender === 'female';
		const isCritical = riskLevel === 'critical';
		const isHighRisk = riskLevel === 'high' || riskLevel === 'critical';

		const categories: ClothingCategory[] = [];

		// ── Upper Body ──────────────────────────────────────────
		const upperItems: ClothingItem[] = [];

		upperItems.push({
			name: 'Plain crew-neck t-shirts',
			quantity: qtyForDuration(3, 2),
			colorGuidance: isLowProfile
				? 'Gray, navy, olive, dark brown only. No white (stains visible).'
				: 'Neutral tones: gray, navy, olive, white, khaki.',
			note: 'No logos, no text, no graphics. These are your base layer and must be completely unremarkable.'
		});

		if (isBusiness || (isUrban && !isResort)) {
			upperItems.push({
				name: isMale ? 'Button-down collared shirts' : isFemale ? 'Blouses or collared shirts' : 'Collared shirts',
				quantity: isBusiness ? baseQty(2, 3) : baseQty(1, 5),
				colorGuidance: 'White, light blue, pale gray. No patterns larger than a pin-stripe.',
				note: isBusiness
					? 'Essential for business environments. Choose wrinkle-resistant fabric for travel. Oxford cloth or poplin.'
					: 'Elevates your look for restaurants, cultural sites, or unplanned formal situations. Versatile layering piece.'
			});
		}

		if (!isHot || isBusiness) {
			upperItems.push({
				name: 'Lightweight sweater or pullover',
				quantity: isCold ? 2 : 1,
				colorGuidance: 'Charcoal, navy, dark olive, or heather gray. Merino wool preferred.',
				note: 'Works as mid-layer in cold weather or standalone in air-conditioned spaces. Merino does not retain odor and dries quickly.'
			});
		}

		if (isHot) {
			upperItems.push({
				name: 'Breathable long-sleeve shirt',
				quantity: baseQty(1, 7),
				colorGuidance: 'Light khaki, pale gray, light olive. Linen or cotton-linen blend.',
				note: 'Sun protection that looks natural in hot climates. Locals in arid and Mediterranean regions wear long sleeves, not tank tops.'
			});
		}

		if (isCold) {
			upperItems.push({
				name: 'Thermal base layer top',
				quantity: baseQty(1, 5),
				colorGuidance: 'Black or dark gray. Worn under outer layers, not visible.',
				note: 'Merino wool or synthetic blend. Provides warmth without bulk, maintaining a natural local silhouette.'
			});
		}

		// Outerwear
		if (isCold) {
			upperItems.push({
				name: 'Insulated winter coat',
				quantity: 1,
				colorGuidance: 'Black, dark navy, or charcoal. No ski-resort neon, no bright colors.',
				note: 'The most visible piece in cold weather. Choose a style locals actually wear — pea coat, parka, or quilted jacket, not a technical mountaineering shell.'
			});
		} else if (climate === 'temperate' || climate === 'mediterranean') {
			upperItems.push({
				name: 'Lightweight jacket',
				quantity: 1,
				colorGuidance: 'Navy, olive, dark khaki, or charcoal. Harrington, field jacket, or minimalist rain shell.',
				note: isLowProfile
					? 'Non-tactical, non-branded. Avoid anything with MOLLE webbing, velcro panels, or tactical aesthetic. Should look like a commuter jacket.'
					: 'Versatile layer for temperature shifts. Packable styles save space.'
			});
		} else if (isHot) {
			upperItems.push({
				name: 'Packable rain jacket or windbreaker',
				quantity: 1,
				colorGuidance: 'Dark gray, navy, or olive. Avoid bright "safety" colors.',
				note: climate === 'tropical'
					? 'Tropical downpours are sudden and heavy. A packable shell prevents you from looking like a soaked, unprepared tourist.'
					: 'Even in arid climates, evenings can be cool. A light shell layer is practical insurance.'
			});
		}

		if (isFemale && (isHot || isBusiness || isLowProfile)) {
			upperItems.push({
				name: 'Lightweight scarf or shawl',
				quantity: 1,
				colorGuidance: 'Dark solid color or subtle local-appropriate pattern. No bright prints.',
				note: 'Essential modesty layer for religious sites, conservative neighborhoods, and sun protection. Doubles as emergency head covering.'
			});
		}

		categories.push({ title: 'Upper Body', icon: 'shirt', items: upperItems });

		// ── Lower Body ──────────────────────────────────────────
		const lowerItems: ClothingItem[] = [];

		lowerItems.push({
			name: isFemale ? 'Dark trousers or chinos' : 'Dark trousers or chinos',
			quantity: baseQty(2, 5),
			colorGuidance: 'Charcoal, dark navy, black, or olive. No cargo pockets, no tactical look.',
			note: isLowProfile
				? 'Flat-front, slim or regular fit. Absolutely no cargo pants — they signal "tactical" worldwide. No zip-off legs. No convertibles.'
				: 'Versatile pants that transition from daytime walking to evening dining. Quick-dry fabric is practical for travel.'
		});

		if (!isBusiness || isResort) {
			lowerItems.push({
				name: 'Dark-wash jeans',
				quantity: 1,
				colorGuidance: 'Dark indigo or black. No distressing, no rips, no fading.',
				note: 'The most universally accepted travel garment. Dark jeans pass as smart casual almost everywhere on earth.'
			});
		}

		if (isHot && !isBusiness) {
			lowerItems.push({
				name: isResort ? 'Shorts (mid-length)' : 'Knee-length shorts',
				quantity: baseQty(1, 7),
				colorGuidance: 'Khaki, navy, olive, or dark gray. No board shorts outside of beach areas.',
				note: isResort
					? 'Appropriate for resort environments. Mid-length, tailored appearance. Avoid athletic or basketball shorts.'
					: 'Only appropriate in casual settings. Many cultural sites and restaurants will deny entry to anyone in shorts.'
			});
		}

		if (isFemale && (isBusiness || isUrban)) {
			lowerItems.push({
				name: 'Knee-length skirt or midi dress',
				quantity: 1,
				colorGuidance: 'Dark solid color: navy, black, charcoal, or dark olive.',
				note: 'A conservative-length skirt or dress covers more formal situations and is culturally appropriate in most regions. Avoid anything above the knee.'
			});
		}

		if (isCold) {
			lowerItems.push({
				name: 'Thermal base layer bottoms',
				quantity: 1,
				colorGuidance: 'Black. Worn under trousers, not visible.',
				note: 'Adds warmth without changing your visible silhouette. Merino wool or synthetic blend.'
			});
		}

		lowerItems.push({
			name: 'Underwear (quick-dry)',
			quantity: qtyForDuration(4, 2),
			colorGuidance: 'Dark colors — avoids visibility when drying on a line.',
			note: 'Synthetic or merino blend that dries overnight. Sink-washing rotation reduces pack weight and laundry dependence.'
		});

		lowerItems.push({
			name: 'Socks (quick-dry)',
			quantity: qtyForDuration(4, 2),
			colorGuidance: 'Dark gray, black, or navy. Crew or ankle length matching local norms.',
			note: 'Merino wool blend for temperature regulation and odor resistance. Pack one extra pair in your daypack for emergencies.'
		});

		categories.push({ title: 'Lower Body', icon: 'pants', items: lowerItems });

		// ── Footwear ────────────────────────────────────────────
		const footwearItems: ClothingItem[] = [];

		footwearItems.push({
			name: isUrban ? 'Low-profile walking shoes' : isRural ? 'Sturdy walking shoes' : 'Versatile casual shoes',
			quantity: 1,
			colorGuidance: 'Black, dark brown, or dark gray. Clean, minimal design. No neon accents.',
			note: isLowProfile
				? 'The most critical blending item. No tactical boots, no Oakley boots, no chunky runners. Clean leather sneakers or plain derby shoes are invisible everywhere.'
				: 'Comfort for walking is essential but choose a style that matches local norms. Clean sneakers or casual leather shoes work in most settings.'
		});

		if (isBusiness) {
			footwearItems.push({
				name: 'Leather dress shoes',
				quantity: 1,
				colorGuidance: 'Black or dark brown. Polished. Oxford or derby style.',
				note: 'Noticed immediately in business settings. Well-maintained leather shoes signal competence. Clean and polish them regularly during your trip.'
			});
		}

		if (isResort || (isHot && !isBusiness)) {
			footwearItems.push({
				name: 'Sandals or slip-on shoes',
				quantity: 1,
				colorGuidance: 'Brown leather or dark neutral. No sport sandals with multiple straps.',
				note: isHot
					? 'Simple sandals are locally normal in tropical and Mediterranean climates. Also practical for temples and places requiring shoe removal.'
					: 'For beach and pool areas. Choose a style that works for casual dining too.'
			});
		}

		if (isCold) {
			footwearItems.push({
				name: 'Insulated waterproof boots',
				quantity: 1,
				colorGuidance: 'Black or dark brown. Urban style, not mountaineering.',
				note: 'Chelsea boots, chukka boots, or urban winter boots. Avoid anything that looks like military surplus or heavy hiking gear.'
			});
		}

		categories.push({ title: 'Footwear', icon: 'shoe', items: footwearItems });

		// ── Accessories ─────────────────────────────────────────
		const accessoryItems: ClothingItem[] = [];

		accessoryItems.push({
			name: 'Sunglasses',
			quantity: 1,
			colorGuidance: 'Classic aviator, wayfarer, or round frame. Brown, black, or tortoiseshell.',
			note: isLowProfile
				? 'No mirrored lenses, no wrap-around sport frames, no Oakley Gascans. These are the most recognized "operator" accessory in the world.'
				: 'UV protection and reduced eye contact. Choose a universally common style.'
		});

		if (isHot || isRural || climate === 'mediterranean') {
			accessoryItems.push({
				name: 'Sun hat or locally appropriate cap',
				quantity: 1,
				colorGuidance: 'Neutral: khaki, olive, navy, or straw. No tactical boonie hats.',
				note: isLowProfile
					? 'Match local headwear norms. Baseball caps work in the Americas, flat caps in Europe, straw hats in tropical areas. No tactical or military-style hats.'
					: 'Sun protection that fits the destination. Observe what locals wear on your first day and match.'
			});
		}

		if (isCold) {
			accessoryItems.push({
				name: 'Warm beanie or knit cap',
				quantity: 1,
				colorGuidance: 'Dark gray, navy, or black. Simple knit, no logos.',
				note: 'Standard cold-weather headwear worldwide. Avoid anything with patches, flags, or brand logos.'
			});
			accessoryItems.push({
				name: 'Gloves',
				quantity: 1,
				colorGuidance: 'Black or dark brown leather or knit.',
				note: 'Unlined leather gloves or knit gloves depending on temperature. Touchscreen-compatible if possible.'
			});
			accessoryItems.push({
				name: 'Dark scarf',
				quantity: 1,
				colorGuidance: 'Navy, charcoal, black, or dark olive. Wool or cashmere blend.',
				note: 'A simple dark scarf is common across all cold-weather cultures. Adds warmth without being conspicuous.'
			});
		}

		accessoryItems.push({
			name: 'Belt',
			quantity: 1,
			colorGuidance: 'Plain leather, brown or black to match shoes. Simple buckle.',
			note: isLowProfile
				? 'No tactical rigger belts, no webbing, no oversized buckles, no branded buckles. A plain leather belt is invisible. Everything else is not.'
				: 'Match belt color to shoe color. Simple and functional.'
		});

		accessoryItems.push({
			name: isLowProfile ? 'Plain commuter daypack' : 'Daypack or messenger bag',
			quantity: 1,
			colorGuidance: 'Black, dark gray, or dark olive. No external MOLLE, no carabiners, no patches.',
			note: isLowProfile
				? 'Must look like a normal commuter bag. No tactical brands (5.11, Maxpedition, Condor). No flag patches. No paracord pulls. A plain Herschel or Eastpak is invisible.'
				: 'For daily use carrying essentials. Choose a size and style common at your destination.'
		});

		if (isHighRisk) {
			accessoryItems.push({
				name: 'Reversible or crushable hat',
				quantity: 1,
				colorGuidance: 'Two-tone: dark outside, different color inside. Neutral tones.',
				note: 'Changes your silhouette and apparent headwear in seconds. Useful for altering appearance when needed.'
			});
		}

		if (isCritical) {
			accessoryItems.push({
				name: 'Appearance change layer',
				quantity: 1,
				colorGuidance: 'Contrasting color to your primary jacket. Lightweight, packable.',
				note: 'A packable vest or lightweight over-shirt in a different color than your main layer. Enables rapid appearance alteration if being followed.'
			});
		}

		categories.push({ title: 'Accessories', icon: 'accessory', items: accessoryItems });

		return categories;
	});

	// ─── Cultural Notes ──────────────────────────────────────────────────

	let culturalNotes = $derived.by((): CulturalNote[] => {
		if (!listGenerated) return [];

		const notes: CulturalNote[] = [];
		const isLowProfile = occasion === 'low-profile' || riskLevel === 'high' || riskLevel === 'critical';

		// Climate-specific cultural notes
		if (climate === 'tropical') {
			notes.push({
				title: 'Tropical modesty',
				detail: 'Despite the heat, many tropical cultures expect shoulders and knees covered at religious sites and government buildings. Carry a lightweight cover-up at all times.'
			});
			notes.push({
				title: 'White clothing warning',
				detail: 'In several Southeast Asian cultures, white is associated with mourning. Avoid all-white outfits. Mix white pieces with other neutral tones.'
			});
		}

		if (climate === 'arid') {
			notes.push({
				title: 'Modesty requirements',
				detail: 'Arid regions overlap heavily with conservative cultures. Both men and women should cover shoulders and knees. Women should carry a headscarf for mosque visits or conservative neighborhoods.'
			});
			notes.push({
				title: 'Long sleeves are normal',
				detail: 'Locals in hot, arid climates wear long sleeves and long pants for sun protection. Wearing shorts and tank tops marks you as a foreigner immediately.'
			});
		}

		if (climate === 'mediterranean') {
			notes.push({
				title: 'Smart casual standard',
				detail: 'Mediterranean cultures value appearance. Even casual settings expect clean, well-fitted clothing. Wrinkled or stained clothes draw judgment.'
			});
		}

		// Region-type notes
		if (regionType === 'rural') {
			notes.push({
				title: 'Conservative expectations',
				detail: 'Rural areas worldwide are more conservative than cities. Dress modestly, avoid attention-grabbing clothing, and match the local standard of formality.'
			});
			notes.push({
				title: 'Avoid looking too wealthy',
				detail: 'Expensive-looking clothing creates social distance in rural communities and may increase security risk. Dress practically, not fashionably.'
			});
		}

		if (regionType === 'resort') {
			notes.push({
				title: 'Beach vs. town',
				detail: 'Casual beachwear is acceptable at the resort but cover up when entering town. Walking through local areas in swimwear is disrespectful in most cultures.'
			});
		}

		// Risk-level notes
		if (isLowProfile) {
			notes.push({
				title: 'No nationality signals',
				detail: 'Remove all flag patches, country-branded items, and university gear. Your clothing should not reveal your country of origin to anyone observing you.'
			});
			notes.push({
				title: 'Avoid tactical aesthetic',
				detail: 'Cargo pants, tactical boots, MOLLE packs, paracord bracelets, and wrap-around sunglasses are universally recognized as "security contractor" signals. They attract exactly the attention gray man philosophy aims to avoid.'
			});
		}

		if (riskLevel === 'critical') {
			notes.push({
				title: 'Appearance alteration capability',
				detail: 'Carry items that allow rapid change of visual profile: reversible jacket, crushable hat, packable layer in contrasting color. Change your silhouette if you suspect surveillance.'
			});
		}

		// Gender-specific notes
		if (gender === 'female') {
			notes.push({
				title: 'Modesty layers',
				detail: 'Carry a scarf, shawl, or cardigan at all times. Many destinations require covered shoulders, knees, or hair at religious sites, and conservative neighborhoods may expect modest dress as a baseline.'
			});
		}

		// Occasion notes
		if (occasion === 'business') {
			notes.push({
				title: 'Business formality varies',
				detail: 'Research your specific destination. Asian and Middle Eastern business cultures are often more formal than Western ones. When in doubt, overdress — it is easier to remove a jacket than to produce one.'
			});
		}

		// Universal notes
		notes.push({
			title: 'Color preferences',
			detail: 'Stick to neutral earth tones: gray, navy, olive, khaki, brown, black. These colors exist in every culture\'s wardrobe and attract zero attention. Avoid neon, bright red, or all-white outfits.'
		});

		notes.push({
			title: 'Items to avoid everywhere',
			detail: 'Military camouflage (illegal in many countries), clothing with English text or slogans, visible brand logos, sports jerseys (signal nationality), religious symbols (unless locally appropriate), and any "tactical" or "operator" aesthetic.'
		});

		return notes;
	});

	// ─── Actions ─────────────────────────────────────────────────────────

	function generate() {
		listGenerated = true;
		save();
	}

	function reset() {
		destination = '';
		regionType = 'urban';
		climate = 'temperate';
		duration = 7;
		riskLevel = 'medium';
		gender = 'neutral';
		occasion = 'casual';
		listGenerated = false;
		localStorage.removeItem('greyline-wardrobe');
	}

	function copyList() {
		const lines: string[] = [];
		lines.push(`# Wardrobe Plan — ${destination || 'Destination'}`);
		lines.push(`${regionType} / ${climate} / ${durationLabel} / ${riskLevel} risk / ${gender} / ${occasion}`);
		lines.push('');

		for (const cat of clothingList) {
			lines.push(`## ${cat.title}`);
			for (const item of cat.items) {
				lines.push(`- ${item.name} (x${item.quantity})`);
				lines.push(`  Colors: ${item.colorGuidance}`);
				lines.push(`  Note: ${item.note}`);
			}
			lines.push('');
		}

		if (culturalNotes.length > 0) {
			lines.push('## Cultural Notes');
			for (const n of culturalNotes) {
				lines.push(`- **${n.title}**: ${n.detail}`);
			}
		}

		navigator.clipboard.writeText(lines.join('\n'));
		copyFeedback = true;
		setTimeout(() => { copyFeedback = false; }, 2000);
	}

	let copyFeedback = $state(false);

	// ─── Persistence ─────────────────────────────────────────────────────

	const STORAGE_KEY = 'greyline-wardrobe';

	$effect(() => {
		const saved = localStorage.getItem(STORAGE_KEY);
		if (saved) {
			try {
				const s = JSON.parse(saved) as SavedState;
				destination = s.destination ?? '';
				regionType = s.regionType ?? 'urban';
				climate = s.climate ?? 'temperate';
				duration = s.duration ?? 7;
				riskLevel = s.riskLevel ?? 'medium';
				gender = s.gender ?? 'neutral';
				occasion = s.occasion ?? 'casual';
				listGenerated = true;
			} catch { /* ignore corrupt data */ }
		}
	});

	function save() {
		const state: SavedState = {
			destination,
			regionType,
			climate,
			duration,
			riskLevel,
			gender,
			occasion
		};
		localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
	}

	// ─── Section collapse state ──────────────────────────────────────────

	let expandedSections = $state<Set<string>>(new Set(['upper-body', 'lower-body', 'footwear', 'accessories', 'cultural']));

	function toggleSection(id: string) {
		if (expandedSections.has(id)) {
			expandedSections.delete(id);
		} else {
			expandedSections.add(id);
		}
		expandedSections = new Set(expandedSections);
	}

	function expandAll() {
		expandedSections = new Set(['upper-body', 'lower-body', 'footwear', 'accessories', 'cultural']);
	}

	function collapseAll() {
		expandedSections = new Set();
	}

	// ─── Derived counts ──────────────────────────────────────────────────

	let totalItems = $derived(clothingList.reduce((sum, cat) => sum + cat.items.length, 0));
	let totalPieces = $derived(clothingList.reduce((sum, cat) => sum + cat.items.reduce((s, i) => s + i.quantity, 0), 0));
</script>

<svelte:head>
	<title>Wardrobe Planner - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<!-- ─── Header ──────────────────────────────────────────────────── -->
	<div>
		<a href="/tools" class="text-sm text-accent-400 hover:text-accent-300">&larr; Tools</a>
		<h1 class="mt-2 text-xl font-semibold text-surface-100">Wardrobe Planner</h1>
		<p class="mt-0.5 font-mono text-xs text-surface-500">BLEND-IN CLOTHING RECOMMENDATIONS</p>
	</div>

	<!-- ─── Gray Man Principles ────────────────────────────────────── -->
	<div class="rounded-lg border border-surface-700/50 bg-surface-800">
		<button
			onclick={() => { principlesExpanded = !principlesExpanded; }}
			class="flex w-full items-center justify-between px-5 py-4 text-left"
		>
			<div class="flex items-center gap-3">
				<span class="flex h-7 w-7 items-center justify-center rounded-md bg-accent-900/30">
					<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="text-accent-400"><circle cx="12" cy="12" r="10"/><path d="M12 16v-4"/><path d="M12 8h.01"/></svg>
				</span>
				<div>
					<p class="font-mono text-xs uppercase text-accent-400">Gray Man Principles</p>
					<p class="text-[13px] text-surface-400">Core clothing philosophy for blending in</p>
				</div>
			</div>
			<span class="text-surface-500 transition-transform duration-200 {principlesExpanded ? 'rotate-180' : ''}">
				<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
			</span>
		</button>
		{#if principlesExpanded}
			<div class="border-t border-surface-700/50 px-5 py-4 space-y-3">
				<div class="flex gap-3">
					<span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-700 text-xs font-medium text-surface-300">1</span>
					<div>
						<p class="text-[13px] font-medium text-surface-200">Neutral colors only</p>
						<p class="text-[13px] text-surface-400">Gray, navy, khaki, olive, black, brown. These exist in every culture's wardrobe and attract zero attention. They are the visual equivalent of silence.</p>
					</div>
				</div>
				<div class="flex gap-3">
					<span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-700 text-xs font-medium text-surface-300">2</span>
					<div>
						<p class="text-[13px] font-medium text-surface-200">No logos, no brands, no tactical gear</p>
						<p class="text-[13px] text-surface-400">Visible brand logos tell observers your income level and cultural background. Tactical gear (5.11, Blackhawk, Crye) screams "security contractor" in every language on earth.</p>
					</div>
				</div>
				<div class="flex gap-3">
					<span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-700 text-xs font-medium text-surface-300">3</span>
					<div>
						<p class="text-[13px] font-medium text-surface-200">Match the local population</p>
						<p class="text-[13px] text-surface-400">The best camouflage is whatever everyone else is wearing. Observe locals within your first hour and adjust. Dress one notch above the local average — not below, not far above.</p>
					</div>
				</div>
				<div class="flex gap-3">
					<span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-surface-700 text-xs font-medium text-surface-300">4</span>
					<div>
						<p class="text-[13px] font-medium text-surface-200">Nothing that signals wealth or tourist status</p>
						<p class="text-[13px] text-surface-400">Expensive watches, designer bags, flag patches, university gear, sports jerseys, and flashy accessories all broadcast information about you. Every visible item should be forgettable.</p>
					</div>
				</div>
			</div>
		{/if}
	</div>

	<!-- ─── Configuration Panel ────────────────────────────────────── -->
	<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5 space-y-5">
		<h2 class="font-mono text-xs uppercase tracking-wider text-surface-400">Configuration</h2>

		<!-- Destination input -->
		<div>
			<label for="destination-input" class="mb-1.5 block font-mono text-xs uppercase text-surface-400">Destination</label>
			<input
				id="destination-input"
				type="text"
				bind:value={destination}
				placeholder="e.g. Bangkok, Istanbul, Medellin"
				class="w-full rounded-md border border-surface-700 bg-surface-900 px-3 py-2 text-[13px] text-surface-200 placeholder-surface-600 focus:border-accent-500 focus:outline-none focus:ring-1 focus:ring-accent-500 sm:max-w-sm"
			/>
		</div>

		<!-- Region type -->
		<div>
			<p class="mb-1.5 font-mono text-xs uppercase text-surface-400">Region Type</p>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(regionTypeLabels) as [value, label]}
					{@const active = regionType === value}
					<button
						onclick={() => { regionType = value as RegionType; }}
						class="rounded-lg border px-3 py-1.5 text-[13px] transition-colors {active
							? 'border-accent-600 bg-accent-900/30 text-accent-300'
							: 'border-surface-700 bg-surface-900 text-surface-400 hover:border-surface-600 hover:text-surface-300'}"
					>
						{label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Climate -->
		<div>
			<p class="mb-1.5 font-mono text-xs uppercase text-surface-400">Climate</p>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(climateLabels) as [value, label]}
					{@const active = climate === value}
					<button
						onclick={() => { climate = value as Climate; }}
						class="rounded-lg border px-3 py-1.5 text-[13px] transition-colors {active
							? 'border-accent-600 bg-accent-900/30 text-accent-300'
							: 'border-surface-700 bg-surface-900 text-surface-400 hover:border-surface-600 hover:text-surface-300'}"
					>
						{label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Duration slider -->
		<div>
			<div class="mb-1.5 flex items-center justify-between">
				<p class="font-mono text-xs uppercase text-surface-400">Duration</p>
				<span class="text-[13px] font-medium text-accent-400">{durationLabel}</span>
			</div>
			<input
				type="range"
				min="1"
				max="30"
				step="1"
				bind:value={duration}
				class="w-full accent-accent-500 sm:max-w-sm"
			/>
			<div class="mt-1 flex justify-between text-[11px] text-surface-600 sm:max-w-sm">
				<span>1 day</span>
				<span>1 week</span>
				<span>2 weeks</span>
				<span>30 days</span>
			</div>
		</div>

		<!-- Risk level -->
		<div>
			<p class="mb-1.5 font-mono text-xs uppercase text-surface-400">Risk Level</p>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(riskLabels) as [value, label]}
					{@const active = riskLevel === value}
					{@const desc = riskDescriptions[value as RiskLevel]}
					<button
						onclick={() => { riskLevel = value as RiskLevel; }}
						class="rounded-lg border px-3 py-1.5 text-left transition-colors {active
							? 'border-accent-600 bg-accent-900/30'
							: 'border-surface-700 bg-surface-900 hover:border-surface-600'}"
					>
						<span class="block text-[13px] {active ? 'text-accent-300' : 'text-surface-400'}">{label}</span>
						<span class="block text-[11px] {active ? 'text-accent-500/70' : 'text-surface-600'}">{desc}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Gender -->
		<div>
			<p class="mb-1.5 font-mono text-xs uppercase text-surface-400">Gender</p>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(genderLabels) as [value, label]}
					{@const active = gender === value}
					<button
						onclick={() => { gender = value as Gender; }}
						class="rounded-lg border px-3 py-1.5 text-[13px] transition-colors {active
							? 'border-accent-600 bg-accent-900/30 text-accent-300'
							: 'border-surface-700 bg-surface-900 text-surface-400 hover:border-surface-600 hover:text-surface-300'}"
					>
						{label}
					</button>
				{/each}
			</div>
		</div>

		<!-- Occasion -->
		<div>
			<p class="mb-1.5 font-mono text-xs uppercase text-surface-400">Occasion</p>
			<div class="flex flex-wrap gap-2">
				{#each Object.entries(occasionLabels) as [value, label]}
					{@const active = occasion === value}
					{@const desc = occasionDescriptions[value as Occasion]}
					<button
						onclick={() => { occasion = value as Occasion; }}
						class="rounded-lg border px-3 py-1.5 text-left transition-colors {active
							? 'border-accent-600 bg-accent-900/30'
							: 'border-surface-700 bg-surface-900 hover:border-surface-600'}"
					>
						<span class="block text-[13px] {active ? 'text-accent-300' : 'text-surface-400'}">{label}</span>
						<span class="block text-[11px] {active ? 'text-accent-500/70' : 'text-surface-600'}">{desc}</span>
					</button>
				{/each}
			</div>
		</div>

		<!-- Generate button -->
		<div class="flex items-center gap-3 pt-2">
			<button
				onclick={generate}
				class="rounded-lg bg-accent-700 px-5 py-2 text-[13px] font-medium text-white hover:bg-accent-600 transition-colors"
			>
				Generate Wardrobe Plan
			</button>
			{#if listGenerated}
				<button
					onclick={reset}
					class="rounded-lg border border-surface-700 px-4 py-2 text-[13px] text-surface-400 hover:bg-surface-900 hover:text-surface-300 transition-colors"
				>
					Reset
				</button>
			{/if}
		</div>
	</div>

	<!-- ─── Results ────────────────────────────────────────────────── -->
	{#if listGenerated && clothingList.length > 0}
		<!-- Summary bar -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 px-5 py-4">
			<div class="flex flex-wrap items-center justify-between gap-3">
				<div>
					<p class="text-[13px] text-surface-200">
						{#if destination}
							<span class="font-medium">{destination}</span> &mdash;
						{/if}
						{regionTypeLabels[regionType]} / {climateLabels[climate]} / {durationLabel}
					</p>
					<p class="mt-0.5 text-[11px] text-surface-500">
						{totalItems} items, {totalPieces} total pieces &middot; {riskLabels[riskLevel]} risk &middot; {genderLabels[gender]} &middot; {occasionLabels[occasion]}
					</p>
				</div>
				<div class="flex items-center gap-2">
					<button
						onclick={expandAll}
						class="rounded-md border border-surface-700 px-2.5 py-1 text-[11px] text-surface-400 hover:bg-surface-900 hover:text-surface-300 transition-colors"
					>
						Expand All
					</button>
					<button
						onclick={collapseAll}
						class="rounded-md border border-surface-700 px-2.5 py-1 text-[11px] text-surface-400 hover:bg-surface-900 hover:text-surface-300 transition-colors"
					>
						Collapse All
					</button>
					<button
						onclick={copyList}
						class="rounded-md border border-surface-700 px-2.5 py-1 text-[11px] text-surface-400 hover:bg-surface-900 hover:text-surface-300 transition-colors"
					>
						{copyFeedback ? 'Copied!' : 'Copy List'}
					</button>
				</div>
			</div>
		</div>

		<!-- Clothing categories -->
		{#each clothingList as category, catIdx}
			{@const sectionId = category.title.toLowerCase().replace(/\s+/g, '-')}
			{@const isExpanded = expandedSections.has(sectionId)}
			<div class="rounded-lg border border-surface-700/50 bg-surface-800">
				<button
					onclick={() => toggleSection(sectionId)}
					class="flex w-full items-center justify-between px-5 py-4 text-left"
				>
					<div>
						<p class="font-mono text-xs uppercase tracking-wider text-surface-400">{category.title}</p>
						<p class="mt-0.5 text-[13px] text-surface-500">{category.items.length} items, {category.items.reduce((s, i) => s + i.quantity, 0)} pieces</p>
					</div>
					<span class="text-surface-500 transition-transform duration-200 {isExpanded ? 'rotate-180' : ''}">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
					</span>
				</button>
				{#if isExpanded}
					<div class="border-t border-surface-700/50">
						{#each category.items as item, i}
							<div class="flex gap-4 px-5 py-4 {i < category.items.length - 1 ? 'border-b border-surface-700/30' : ''}">
								<!-- Quantity badge -->
								<div class="flex shrink-0 flex-col items-center gap-1">
									<span class="flex h-8 w-8 items-center justify-center rounded-lg bg-accent-900/30 font-mono text-sm font-semibold text-accent-400">
										{item.quantity}
									</span>
									<span class="text-[10px] text-surface-600">qty</span>
								</div>
								<!-- Item details -->
								<div class="min-w-0 flex-1">
									<p class="text-[13px] font-medium text-surface-200">{item.name}</p>
									<div class="mt-1.5 space-y-1">
										<div class="flex gap-2">
											<span class="shrink-0 font-mono text-[10px] uppercase text-surface-500 mt-[2px]">COLOR</span>
											<p class="text-[13px] text-surface-400">{item.colorGuidance}</p>
										</div>
										<div class="flex gap-2">
											<span class="shrink-0 font-mono text-[10px] uppercase text-surface-500 mt-[2px]">WHY&nbsp;&nbsp;</span>
											<p class="text-[13px] text-surface-500">{item.note}</p>
										</div>
									</div>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/each}

		<!-- Cultural Notes -->
		{#if culturalNotes.length > 0}
			{@const culturalExpanded = expandedSections.has('cultural')}
			<div class="rounded-lg border border-surface-700/50 bg-surface-800">
				<button
					onclick={() => toggleSection('cultural')}
					class="flex w-full items-center justify-between px-5 py-4 text-left"
				>
					<div>
						<p class="font-mono text-xs uppercase tracking-wider text-surface-400">Cultural Notes</p>
						<p class="mt-0.5 text-[13px] text-surface-500">{culturalNotes.length} notes — cover-up requirements, color preferences, items to avoid</p>
					</div>
					<span class="text-surface-500 transition-transform duration-200 {culturalExpanded ? 'rotate-180' : ''}">
						<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="m6 9 6 6 6-6"/></svg>
					</span>
				</button>
				{#if culturalExpanded}
					<div class="border-t border-surface-700/50">
						{#each culturalNotes as note, i}
							<div class="flex gap-3 px-5 py-3.5 {i < culturalNotes.length - 1 ? 'border-b border-surface-700/30' : ''}">
								<span class="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-accent-500"></span>
								<div>
									<p class="text-[13px] font-medium text-surface-200">{note.title}</p>
									<p class="mt-0.5 text-[13px] text-surface-500">{note.detail}</p>
								</div>
							</div>
						{/each}
					</div>
				{/if}
			</div>
		{/if}
	{/if}

	<!-- ─── Footer ─────────────────────────────────────────────────── -->
	<div class="rounded-lg border border-surface-700/30 bg-surface-900 px-4 py-3">
		<p class="text-[11px] text-surface-600">
			All recommendations are general guidance based on cultural norms and gray man principles. Local conditions vary. Research your specific destination and observe locals upon arrival. The best camouflage is always whatever the people around you are already wearing. No data leaves your device.
		</p>
	</div>
</div>
