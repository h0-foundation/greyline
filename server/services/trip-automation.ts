import { createChecklist, deleteChecklistsByDestination, getChecklistsByDestination } from '../db/repositories/checklist';
import { getCountryProfile } from '../db/repositories/knowledge';

// ---------------------------------------------------------------------------
// Packing List Generator
// ---------------------------------------------------------------------------

interface PackingCategory {
	name: string;
	items: Array<{ id: string; label: string; checked: boolean; notes?: string }>;
}

const BASE_PACKING: PackingCategory[] = [
	{
		name: 'Documents & Money',
		items: [
			{ id: 'p-doc-1', label: 'Passport (valid 6+ months)', checked: false },
			{ id: 'p-doc-2', label: 'Passport photocopy (separate from original)', checked: false },
			{ id: 'p-doc-3', label: 'Travel insurance documents', checked: false },
			{ id: 'p-doc-4', label: 'Emergency contact card (laminated)', checked: false },
			{ id: 'p-doc-5', label: 'Local currency cash (small denominations)', checked: false },
			{ id: 'p-doc-6', label: 'Backup debit/credit card (different network)', checked: false },
			{ id: 'p-doc-7', label: 'USD/EUR emergency cash (hidden)', checked: false },
		],
	},
	{
		name: 'Gray Man Clothing',
		items: [
			{ id: 'p-cloth-1', label: 'Neutral-colored shirts (no logos, no slogans)', checked: false },
			{ id: 'p-cloth-2', label: 'Plain dark trousers or jeans', checked: false },
			{ id: 'p-cloth-3', label: 'Comfortable walking shoes (broken in, unremarkable)', checked: false },
			{ id: 'p-cloth-4', label: 'Light jacket or layer (season-appropriate)', checked: false },
			{ id: 'p-cloth-5', label: 'Hat or cap (common local style)', checked: false },
			{ id: 'p-cloth-6', label: 'Sunglasses (non-tactical, non-branded)', checked: false },
		],
	},
	{
		name: 'Electronics',
		items: [
			{ id: 'p-elec-1', label: 'Phone with offline maps downloaded', checked: false },
			{ id: 'p-elec-2', label: 'Portable charger / power bank', checked: false },
			{ id: 'p-elec-3', label: 'Universal power adapter', checked: false },
			{ id: 'p-elec-4', label: 'USB data-blocker for public charging', checked: false },
			{ id: 'p-elec-5', label: 'VPN configured and tested', checked: false },
		],
	},
	{
		name: 'Security & OPSEC',
		items: [
			{ id: 'p-sec-1', label: 'Portable door lock or door wedge', checked: false },
			{ id: 'p-sec-2', label: 'Faraday bag for phone/passport', checked: false },
			{ id: 'p-sec-3', label: 'Webcam cover for laptop', checked: false },
			{ id: 'p-sec-4', label: 'Privacy screen for phone/laptop', checked: false },
			{ id: 'p-sec-5', label: 'Tamper-evident tape or tell-tales', checked: false },
			{ id: 'p-sec-6', label: 'Small flashlight (keychain size)', checked: false },
		],
	},
	{
		name: 'Health & Hygiene',
		items: [
			{ id: 'p-health-1', label: 'Prescription medications (in original packaging)', checked: false },
			{ id: 'p-health-2', label: 'Basic first aid supplies', checked: false },
			{ id: 'p-health-3', label: 'Hand sanitizer', checked: false },
			{ id: 'p-health-4', label: 'Insect repellent (if applicable)', checked: false },
			{ id: 'p-health-5', label: 'Sunscreen', checked: false },
		],
	},
	{
		name: 'Emergency Go-Bag Items',
		items: [
			{ id: 'p-go-1', label: 'Passport + cash always accessible', checked: false },
			{ id: 'p-go-2', label: 'Phone + charger cable', checked: false },
			{ id: 'p-go-3', label: 'Photocopy of key docs', checked: false },
			{ id: 'p-go-4', label: 'Water bottle (collapsible)', checked: false },
			{ id: 'p-go-5', label: 'Granola/energy bars', checked: false },
		],
	},
];

function getClimateItems(countryData: any): Array<{ id: string; label: string; checked: boolean; notes?: string }> {
	if (!countryData) return [];
	const items: Array<{ id: string; label: string; checked: boolean; notes?: string }> = [];

	try {
		const rc = typeof countryData.rest_countries === 'string' ? JSON.parse(countryData.rest_countries) : countryData.rest_countries;
		const lat = rc?.latlng?.[0];
		if (lat !== undefined) {
			if (Math.abs(lat) < 23.5) {
				items.push({ id: 'p-climate-1', label: 'Lightweight moisture-wicking clothing', checked: false, notes: 'Tropical/equatorial region' });
				items.push({ id: 'p-climate-2', label: 'Rain jacket or compact umbrella', checked: false });
				items.push({ id: 'p-climate-3', label: 'Insect repellent (DEET-based)', checked: false, notes: 'Tropical mosquito risk' });
			} else if (Math.abs(lat) > 55) {
				items.push({ id: 'p-climate-1', label: 'Warm base layers (merino or synthetic)', checked: false, notes: 'High-latitude cold climate' });
				items.push({ id: 'p-climate-2', label: 'Insulated jacket', checked: false });
				items.push({ id: 'p-climate-3', label: 'Warm hat and gloves', checked: false });
			} else {
				items.push({ id: 'p-climate-1', label: 'Layering options for variable weather', checked: false, notes: 'Temperate climate' });
			}
		}

		if (rc?.landlocked) {
			items.push({ id: 'p-climate-4', label: 'No beach gear needed (landlocked country)', checked: false });
		}
	} catch { /* ignore parse errors */ }

	return items;
}

function getCurrencyItems(countryData: any): Array<{ id: string; label: string; checked: boolean; notes?: string }> {
	if (!countryData) return [];
	const items: Array<{ id: string; label: string; checked: boolean; notes?: string }> = [];

	try {
		const rc = typeof countryData.rest_countries === 'string' ? JSON.parse(countryData.rest_countries) : countryData.rest_countries;
		if (rc?.currencies) {
			const currencyNames = Object.entries(rc.currencies).map(([code, info]: [string, any]) => `${info?.name ?? code} (${code})`).join(', ');
			items.push({ id: 'p-curr-1', label: `Local currency: ${currencyNames}`, checked: false, notes: 'Obtain before arrival or at airport' });
		}
	} catch { /* ignore */ }

	return items;
}

export function generatePackingList(tripId: string, destinationId: string, countryCode?: string | null): void {
	const countryData = countryCode ? getCountryProfile(countryCode) : null;

	const allItems: Array<{ id: string; label: string; checked: boolean; notes?: string }> = [];

	for (const cat of BASE_PACKING) {
		for (const item of cat.items) {
			allItems.push({ ...item, notes: item.notes ? `[${cat.name}] ${item.notes}` : `[${cat.name}]` });
		}
	}

	// Add climate-specific items
	const climateItems = getClimateItems(countryData);
	for (const item of climateItems) {
		allItems.push({ ...item, notes: item.notes ? `[Climate] ${item.notes}` : '[Climate]' });
	}

	// Add currency items
	const currencyItems = getCurrencyItems(countryData);
	for (const item of currencyItems) {
		allItems.push({ ...item, notes: item.notes ? `[Financial] ${item.notes}` : '[Financial]' });
	}

	// Add car-side note
	try {
		const rc = countryData?.rest_countries ? JSON.parse(countryData.rest_countries as string) : null;
		if (rc?.car?.side === 'left') {
			allItems.push({ id: 'p-drive-1', label: 'Left-hand traffic — practice awareness when crossing roads', checked: false, notes: '[Local Info] Vehicles drive on the left' });
		}
	} catch { /* ignore */ }

	const countryLabel = countryCode || 'destination';
	createChecklist({
		trip_id: tripId,
		destination_id: destinationId,
		type: 'packing',
		name: `Packing List — ${countryLabel}`,
		items: allItems,
	});
}

// ---------------------------------------------------------------------------
// Security Protocol Generator
// ---------------------------------------------------------------------------

const PRE_TRIP_SECURITY = [
	{ id: 'sec-pre-1', label: 'Full device backup completed', checked: false, notes: 'Backup phone, laptop before departure' },
	{ id: 'sec-pre-2', label: 'Travel-only email account configured', checked: false, notes: 'Separate from personal/work accounts' },
	{ id: 'sec-pre-3', label: 'Social media posting paused or scheduled', checked: false, notes: 'No real-time location disclosure' },
	{ id: 'sec-pre-4', label: 'Emergency contacts notified of travel plans', checked: false },
	{ id: 'sec-pre-5', label: 'Trusted contact has itinerary copy', checked: false },
	{ id: 'sec-pre-6', label: 'Check-in schedule established', checked: false, notes: 'Agree on times and method with trusted contact' },
	{ id: 'sec-pre-7', label: 'VPN subscription active and tested', checked: false },
	{ id: 'sec-pre-8', label: 'Offline maps downloaded for all destinations', checked: false },
	{ id: 'sec-pre-9', label: 'Sensitive data removed from devices or encrypted', checked: false },
	{ id: 'sec-pre-10', label: 'Travel insurance purchased and documented', checked: false },
];

const IN_TRANSIT_SECURITY = [
	{ id: 'sec-transit-1', label: 'Devices powered off during border crossing', checked: false, notes: 'Reduces data extraction risk at checkpoints' },
	{ id: 'sec-transit-2', label: 'No public WiFi without VPN', checked: false },
	{ id: 'sec-transit-3', label: 'Luggage locks and tamper indicators in place', checked: false },
	{ id: 'sec-transit-4', label: 'Carry-on has go-bag essentials', checked: false },
	{ id: 'sec-transit-5', label: 'Passport and cash on person (not in checked bag)', checked: false },
	{ id: 'sec-transit-6', label: 'Aware of surveillance cameras at transit points', checked: false },
	{ id: 'sec-transit-7', label: 'Bluetooth and AirDrop disabled', checked: false },
	{ id: 'sec-transit-8', label: 'Phone on airplane mode when not needed', checked: false },
];

const ON_GROUND_SECURITY = [
	{ id: 'sec-ground-1', label: 'Hotel room security check completed', checked: false, notes: 'Use hotel security checklist' },
	{ id: 'sec-ground-2', label: 'Vary daily routes (avoid patterns)', checked: false },
	{ id: 'sec-ground-3', label: 'Emergency exit routes identified at hotel', checked: false },
	{ id: 'sec-ground-4', label: 'Local emergency numbers saved offline', checked: false },
	{ id: 'sec-ground-5', label: 'Nearest embassy/consulate location noted', checked: false },
	{ id: 'sec-ground-6', label: 'Nearest hospital location noted', checked: false },
	{ id: 'sec-ground-7', label: 'Daily check-in with trusted contact', checked: false },
	{ id: 'sec-ground-8', label: 'Valuables secured when leaving room', checked: false },
	{ id: 'sec-ground-9', label: 'No discussion of itinerary with strangers', checked: false },
	{ id: 'sec-ground-10', label: 'Camera/phone EXIF stripping before sharing photos', checked: false },
];

const DIGITAL_HYGIENE = [
	{ id: 'sec-dig-1', label: 'VPN active at all times on public networks', checked: false },
	{ id: 'sec-dig-2', label: 'Location services off except when actively navigating', checked: false },
	{ id: 'sec-dig-3', label: 'WiFi auto-connect disabled', checked: false },
	{ id: 'sec-dig-4', label: 'Bluetooth off when not in use', checked: false },
	{ id: 'sec-dig-5', label: 'USB data-blocker used for public charging', checked: false },
	{ id: 'sec-dig-6', label: 'Browser private/incognito mode for local searches', checked: false },
	{ id: 'sec-dig-7', label: 'No real-time social media posts with location', checked: false },
	{ id: 'sec-dig-8', label: 'App permissions reviewed (camera, mic, location)', checked: false },
	{ id: 'sec-dig-9', label: 'Two-factor authentication on all accounts', checked: false },
	{ id: 'sec-dig-10', label: 'Device encrypted with strong PIN/passphrase', checked: false },
];

export function generateSecurityProtocol(tripId: string, destinationId: string, countryCode?: string | null): void {
	const countryData = countryCode ? getCountryProfile(countryCode) : null;

	// Pre-trip security
	createChecklist({
		trip_id: tripId,
		destination_id: destinationId,
		type: 'digital-hygiene',
		name: 'Pre-Trip Security Protocol',
		items: [...PRE_TRIP_SECURITY],
	});

	// In-transit security
	createChecklist({
		trip_id: tripId,
		destination_id: destinationId,
		type: 'digital-hygiene',
		name: 'In-Transit Security',
		items: [...IN_TRANSIT_SECURITY],
	});

	// On-ground security
	const groundItems = [...ON_GROUND_SECURITY];

	// Add country-specific items if we have data
	if (countryData) {
		try {
			const rc = typeof countryData.rest_countries === 'string' ? JSON.parse(countryData.rest_countries as string) : countryData.rest_countries;
			if (rc?.car?.side === 'left') {
				groundItems.push({ id: 'sec-ground-11', label: 'Left-hand traffic awareness — look right first when crossing', checked: false, notes: 'Vehicles drive on the left in this country' });
			}
			if (rc?.region === 'Asia' || rc?.region === 'Africa') {
				groundItems.push({ id: 'sec-ground-12', label: 'Avoid displaying expensive electronics publicly', checked: false, notes: 'Reduces target profile' });
			}
		} catch { /* ignore */ }
	}

	createChecklist({
		trip_id: tripId,
		destination_id: destinationId,
		type: 'digital-hygiene',
		name: 'On-Ground Security',
		items: groundItems,
	});

	// Digital hygiene
	createChecklist({
		trip_id: tripId,
		destination_id: destinationId,
		type: 'digital-hygiene',
		name: 'Digital Hygiene Protocol',
		items: [...DIGITAL_HYGIENE],
	});
}

// ---------------------------------------------------------------------------
// Border Crossing Checklist Generator
// ---------------------------------------------------------------------------

const BORDER_CROSSING_BASE = [
	{ id: 'bc-1', label: 'Passport valid for 6+ months beyond planned stay', checked: false },
	{ id: 'bc-2', label: 'Visa obtained or verified not required', checked: false },
	{ id: 'bc-3', label: 'Return/onward ticket available to show', checked: false },
	{ id: 'bc-4', label: 'Accommodation confirmation printed or offline', checked: false },
	{ id: 'bc-5', label: 'Know purpose-of-visit answer (tourism, business)', checked: false, notes: 'Keep it simple, consistent, and truthful' },
	{ id: 'bc-6', label: 'No prohibited items in luggage', checked: false },
	{ id: 'bc-7', label: 'Customs declaration prepared if required', checked: false },
	{ id: 'bc-8', label: 'Cash amount within declaration threshold', checked: false, notes: 'Many countries require declaring >$10,000 USD equivalent' },
	{ id: 'bc-9', label: 'Phone and laptop powered off before checkpoint', checked: false, notes: 'Reduces risk of device inspection accessing unlocked data' },
	{ id: 'bc-10', label: 'Travel-only phone prepared (if high-risk destination)', checked: false },
	{ id: 'bc-11', label: 'No sensitive files on device (moved to encrypted cloud)', checked: false },
	{ id: 'bc-12', label: 'Demeanor: calm, polite, brief answers', checked: false, notes: 'Gray man principle: do not attract attention' },
];

export function generateBorderCrossingChecklist(tripId: string, destinationId: string, countryCode?: string | null): void {
	const countryData = countryCode ? getCountryProfile(countryCode) : null;

	const items = [...BORDER_CROSSING_BASE];

	if (countryData) {
		try {
			const rc = typeof countryData.rest_countries === 'string' ? JSON.parse(countryData.rest_countries as string) : countryData.rest_countries;

			// Add language note
			if (rc?.languages) {
				const langs = Object.values(rc.languages).join(', ');
				items.push({ id: 'bc-lang-1', label: `Know basic greeting in local language: ${langs}`, checked: false, notes: 'Shows respect, reduces suspicion' });
			}

			// Add currency note
			if (rc?.currencies) {
				const currencies = Object.entries(rc.currencies).map(([code, info]: [string, any]) => `${info?.name ?? code} (${code})`).join(', ');
				items.push({ id: 'bc-curr-1', label: `Currency: ${currencies}`, checked: false, notes: 'Have some local currency for immediate expenses' });
			}

			// Add border countries note
			if (rc?.borders && rc.borders.length > 0) {
				items.push({ id: 'bc-border-1', label: `Bordering countries: ${rc.borders.join(', ')}`, checked: false, notes: 'Know neighboring countries for onward travel questions' });
			}

			// Calling code
			if (rc?.idd?.root) {
				const suffix = rc.idd.suffixes?.[0] ?? '';
				items.push({ id: 'bc-idd-1', label: `Country calling code: ${rc.idd.root}${suffix}`, checked: false, notes: 'For emergency calls and local SIM setup' });
			}
		} catch { /* ignore */ }
	}

	const countryLabel = countryCode || 'destination';
	createChecklist({
		trip_id: tripId,
		destination_id: destinationId,
		type: 'border-crossing',
		name: `Border Crossing — ${countryLabel}`,
		items,
	});
}

// ---------------------------------------------------------------------------
// Hotel Security Checklist Generator
// ---------------------------------------------------------------------------

const HOTEL_SECURITY_ITEMS = [
	{ id: 'hs-1', label: 'Requested floor 2-6 (above ground access, below fire reach)', checked: false },
	{ id: 'hs-2', label: 'Room not at end of hallway', checked: false },
	{ id: 'hs-3', label: 'Near stairwell (not just elevator)', checked: false },
	{ id: 'hs-4', label: 'Deadbolt functional and engaged', checked: false },
	{ id: 'hs-5', label: 'Door chain or swing bar present', checked: false },
	{ id: 'hs-6', label: 'Peephole clear and unobstructed', checked: false },
	{ id: 'hs-7', label: 'Portable door lock or wedge deployed', checked: false },
	{ id: 'hs-8', label: 'Connecting door locked and blocked', checked: false },
	{ id: 'hs-9', label: 'Windows lock from inside', checked: false },
	{ id: 'hs-10', label: 'No external access to windows', checked: false },
	{ id: 'hs-11', label: 'Curtains fully close (no gaps)', checked: false },
	{ id: 'hs-12', label: 'In-room safe tested with own code', checked: false },
	{ id: 'hs-13', label: 'Smoke detector present and working', checked: false },
	{ id: 'hs-14', label: 'No signs of tampering (vents, clocks, mirrors)', checked: false },
	{ id: 'hs-15', label: 'Two exit routes walked and verified', checked: false },
	{ id: 'hs-16', label: 'Stairwell doors open from inside', checked: false },
	{ id: 'hs-17', label: 'Go-bag positioned near door', checked: false },
	{ id: 'hs-18', label: 'Shoes and light source by bed', checked: false },
];

export function generateHotelSecurityChecklist(tripId: string, destinationId: string): void {
	createChecklist({
		trip_id: tripId,
		destination_id: destinationId,
		type: 'hotel-security',
		name: 'Hotel Security Check',
		items: [...HOTEL_SECURITY_ITEMS],
	});
}

// ---------------------------------------------------------------------------
// Master automation — called when a destination is added to a trip
// ---------------------------------------------------------------------------

export function generateAllChecklistsForDestination(tripId: string, destinationId: string, countryCode?: string | null): void {
	// Don't duplicate if checklists already exist
	const existing = getChecklistsByDestination(destinationId);
	if (existing.length > 0) return;

	generatePackingList(tripId, destinationId, countryCode);
	generateSecurityProtocol(tripId, destinationId, countryCode);
	generateBorderCrossingChecklist(tripId, destinationId, countryCode);
	generateHotelSecurityChecklist(tripId, destinationId);
}

export function regenerateChecklistsForDestination(tripId: string, destinationId: string, countryCode?: string | null): void {
	deleteChecklistsByDestination(destinationId);
	generatePackingList(tripId, destinationId, countryCode);
	generateSecurityProtocol(tripId, destinationId, countryCode);
	generateBorderCrossingChecklist(tripId, destinationId, countryCode);
	generateHotelSecurityChecklist(tripId, destinationId);
}
