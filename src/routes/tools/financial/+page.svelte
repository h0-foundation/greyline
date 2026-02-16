<script lang="ts">
	// ── Types ──────────────────────────────────────────────────────────

	type Region =
		| 'western-europe'
		| 'eastern-europe'
		| 'southeast-asia'
		| 'east-asia'
		| 'south-asia'
		| 'middle-east'
		| 'sub-saharan-africa'
		| 'north-africa'
		| 'latin-america'
		| 'north-america'
		| 'oceania';

	type PaymentMethod = 'cash' | 'credit' | 'debit' | 'crypto';

	interface RegionData {
		label: string;
		cashVsCard: { cash: number; card: number; note: string };
		atmSafety: string[];
		cardAcceptance: string;
		currencyTips: string[];
		tippingNorms: string[];
		commonScams: string[];
		costIndex: number; // multiplier relative to US baseline (1.0)
		costBreakdown: {
			hostel: number;
			midHotel: number;
			budgetMeal: number;
			midMeal: number;
			localTransport: number;
			activity: number;
		};
	}

	interface CheckSection {
		name: string;
		items: { id: string; label: string; detail: string; checked: boolean }[];
	}

	// ── Region database ───────────────────────────────────────────────

	const regionLabels: Record<Region, string> = {
		'western-europe': 'Western Europe',
		'eastern-europe': 'Eastern Europe',
		'southeast-asia': 'Southeast Asia',
		'east-asia': 'East Asia',
		'south-asia': 'South Asia',
		'middle-east': 'Middle East',
		'sub-saharan-africa': 'Sub-Saharan Africa',
		'north-africa': 'North Africa',
		'latin-america': 'Latin America',
		'north-america': 'North America',
		'oceania': 'Oceania'
	};

	const regionData: Record<Region, RegionData> = {
		'western-europe': {
			label: 'Western Europe',
			cashVsCard: {
				cash: 25,
				card: 75,
				note: 'Cards widely accepted. Germany and Austria still favor cash at smaller shops and markets. Contactless is standard across Scandinavia, Netherlands, and UK.'
			},
			atmSafety: [
				'Use ATMs inside bank branches — avoid standalone machines at train stations and tourist areas',
				'PIN-and-chip is required everywhere — swipe-only cards will be rejected',
				'Always decline Dynamic Currency Conversion (DCC) — pay in local currency',
				'Withdrawal limits vary by country and bank — expect 200-500 EUR per transaction',
				'German Sparkasse and Volksbank ATMs are reliable and widespread'
			],
			cardAcceptance: 'Very high in Scandinavia, UK, Netherlands, and France. Moderate in Germany, Austria, and southern Europe where cash remains common at small businesses, bakeries, and market stalls.',
			currencyTips: [
				'Euro used in most countries — notable exceptions are UK (GBP), Switzerland (CHF), Sweden (SEK), Norway (NOK), Denmark (DKK)',
				'Avoid airport exchange bureaus — rates are typically 5-10% worse than mid-market',
				'Wise or Revolut cards offer near-interbank rates with no foreign transaction fees',
				'In Switzerland, EUR is sometimes accepted but change is given in CHF at unfavorable rates'
			],
			tippingNorms: [
				'Service charge is often included in the bill — check before tipping',
				'Restaurants: 5-10% if service was good and not included',
				'Taxis: round up to nearest euro or add 5-10%',
				'Scandinavia: tipping is uncommon and never expected',
				'UK: 10-12.5% at restaurants, optional at pubs'
			],
			commonScams: [
				'Fake petition signers who distract while an accomplice picks your pocket',
				'Gold ring scam — someone "finds" a ring and asks you to pay for it',
				'Bracelet scam — street vendors tie a bracelet on your wrist then demand payment',
				'Restaurant menus without prices at tourist spots — always ask for a priced menu',
				'Taxi meters "not working" — agree on price before entering or use ride-hailing apps'
			],
			costIndex: 1.2,
			costBreakdown: { hostel: 35, midHotel: 120, budgetMeal: 12, midMeal: 25, localTransport: 3, activity: 15 }
		},
		'eastern-europe': {
			label: 'Eastern Europe',
			cashVsCard: {
				cash: 45,
				card: 55,
				note: 'Card acceptance growing rapidly in capitals and tourist areas. Cash still essential for markets, smaller towns, local transport, and street food.'
			},
			atmSafety: [
				'Euronet ATMs are tourist traps — they charge high fees and push unfavorable DCC. Use bank-owned ATMs instead.',
				'Withdraw from ATMs at major local banks: OTP (Hungary), PKO (Poland), Raiffeisen, UniCredit',
				'Some ATMs offer only large denomination notes — request a specific smaller amount if possible',
				'Skimming risk is moderate — inspect ATMs before use, especially at transit hubs',
				'Set withdrawal limits before travel and monitor transaction alerts closely'
			],
			cardAcceptance: 'Moderate to high in capital cities. Lower in rural areas, local markets, and public transport. Visa and Mastercard accepted; Amex rarely. Many places have minimum card purchase amounts.',
			currencyTips: [
				'Multiple currencies in the region: PLN (Poland), CZK (Czechia), HUF (Hungary), RON (Romania), HRK/EUR (Croatia adopted EUR in 2023)',
				'Exchange rates vary wildly — avoid exchange offices near tourist attractions',
				'Best rates are usually at bank branches or withdraw from ATMs',
				'Beware of exchange offices advertising "0% commission" — they compensate with terrible rates',
				'In Hungary, HUF denominations are large (a coffee might cost 800-1200 HUF) — learn the zeros'
			],
			tippingNorms: [
				'Restaurants: 10-15% is standard, sometimes added automatically for tourists',
				'In Czechia, round up or add 10%. Saying "good" when paying means keep the change.',
				'Taxis: round up to nearest convenient number',
				'Tour guides: 5-10 EUR per person is appropriate',
				'Spa/wellness: 10% or small fixed amount per service'
			],
			commonScams: [
				'Overcharging at tourist-area restaurants — always check menu prices and verify the bill',
				'Taxi overcharging — use Bolt or Uber instead of hailing on the street',
				'Currency confusion — vendors may try to give change in a less valuable currency',
				'Strip clubs and "hostess bars" with extortionate hidden charges',
				'Fake police asking to see your wallet — real police do not check wallets'
			],
			costIndex: 0.55,
			costBreakdown: { hostel: 15, midHotel: 60, budgetMeal: 6, midMeal: 15, localTransport: 1.5, activity: 8 }
		},
		'southeast-asia': {
			label: 'Southeast Asia',
			cashVsCard: {
				cash: 75,
				card: 25,
				note: 'Cash is king. Street food, tuk-tuks, local shops, ferries, and markets are cash-only. Cards accepted at hotels, malls, and upscale restaurants.'
			},
			atmSafety: [
				'ATM fees are high (150-220 THB in Thailand, similar elsewhere) — withdraw larger amounts less frequently',
				'Use bank ATMs inside branches, not standalone machines at convenience stores',
				'Bangkok Bank, Kasikorn (Thailand), BDO (Philippines), and CIMB (Malaysia) are reliable networks',
				'ATMs in tourist areas have higher skimming risk — check for loose parts',
				'Some ATMs dispense only large bills — ask hotels or 7-Eleven to break them',
				'Always decline the ATM DCC offer — choose "without conversion" for local currency'
			],
			cardAcceptance: 'Low at local businesses, street vendors, and transport. Moderate at shopping malls, chain restaurants, and hotels. Visa has the widest acceptance, followed by Mastercard. Amex is rare outside luxury hotels.',
			currencyTips: [
				'Thai Baht (THB), Vietnamese Dong (VND), Indonesian Rupiah (IDR), Philippine Peso (PHP), Malaysian Ringgit (MYR) — each country has its own currency',
				'Vietnamese Dong uses very large numbers (1 USD ~ 25,000 VND) — be very careful counting zeros',
				'Indonesian Rupiah: 1 USD ~ 15,000-16,000 IDR — vendors may try to confuse with large denominations',
				'Never exchange money with strangers or unofficial money changers on the street',
				'In Cambodia, USD is widely accepted alongside KHR — carry clean, recent US bills'
			],
			tippingNorms: [
				'Tipping is not traditionally expected but increasingly appreciated in tourist areas',
				'Restaurants: 10% at upscale places if service charge not included',
				'Massage/spa: 50-100 THB (Thailand) or equivalent in local currency',
				'Tour guides/drivers: 200-500 THB per day is generous',
				'Taxis: round up to nearest convenient amount'
			],
			commonScams: [
				'Gem and jewelry scams — "today only" deals with worthless stones, especially in Bangkok',
				'Tuk-tuk drivers taking you to commission shops instead of your destination',
				'Jet ski and motorbike rental damage scams — photograph everything before renting',
				'Taxi meter refusal — insist on meter or use Grab/Bolt ride-hailing apps',
				'Temple/attraction "closed today" scam — locals redirect you to overpriced tours',
				'Short-changing at exchange counters — count your money before leaving the window'
			],
			costIndex: 0.3,
			costBreakdown: { hostel: 8, midHotel: 40, budgetMeal: 3, midMeal: 10, localTransport: 1, activity: 5 }
		},
		'east-asia': {
			label: 'East Asia',
			cashVsCard: {
				cash: 50,
				card: 50,
				note: 'Japan is surprisingly cash-heavy. South Korea and Taiwan are card-friendly. China operates on mobile payments (WeChat/Alipay) which require local bank accounts.'
			},
			atmSafety: [
				'Japan: 7-Eleven (Seven Bank) and Japan Post ATMs are the most reliable for foreign cards',
				'South Korea: most ATMs accept international cards, but check for "Global ATM" or "Foreign Card" labels',
				'China: international card acceptance at ATMs is limited — Bank of China and ICBC are most reliable',
				'Taiwan: 7-Eleven and FamilyMart ATMs accept international cards',
				'Withdraw in local currency and decline conversion offers'
			],
			cardAcceptance: 'Japan: growing but many restaurants and small shops are cash-only. South Korea: high acceptance, Samsung Pay and KakaoPay dominate. Taiwan: moderate, improving in cities. China: very limited for foreign cards — mobile payment ecosystem requires local accounts.',
			currencyTips: [
				'Japanese Yen (JPY): no coins smaller than 1 yen, 1 USD ~ 150 JPY. Coins are important — carry a coin purse.',
				'Chinese Yuan (CNY): difficult to exchange outside China. Bring clean USD and exchange at Bank of China.',
				'Korean Won (KRW): 1 USD ~ 1,300 KRW. Cards widely accepted but cash needed for street food.',
				'New Taiwan Dollar (TWD): easy to withdraw at ATMs. Night markets are cash-only.',
				'Hong Kong Dollar (HKD): pegged to USD. Octopus card is essential for daily transactions.'
			],
			tippingNorms: [
				'Japan: NEVER tip — it is considered rude and confusing',
				'South Korea: not expected, 10% at some Western-style restaurants',
				'China: not customary, some upscale restaurants add service charge',
				'Taiwan: not expected, some restaurants add 10% service charge',
				'Hong Kong: 10% service charge usually included, small cash tip for good service appreciated'
			],
			commonScams: [
				'Tea ceremony scam (China) — friendly strangers invite you to a tea house with extortionate prices',
				'Fake monks collecting "donations" with aggressive pressure tactics',
				'Overpriced rickshaw rides — negotiate and confirm price before boarding',
				'Art student scams — "students" invite you to an exhibit that is actually a hard-sell gallery',
				'Counterfeit currency in China — learn to identify fake 100 RMB bills'
			],
			costIndex: 0.75,
			costBreakdown: { hostel: 25, midHotel: 90, budgetMeal: 8, midMeal: 20, localTransport: 2, activity: 12 }
		},
		'south-asia': {
			label: 'South Asia',
			cashVsCard: {
				cash: 80,
				card: 20,
				note: 'Cash dominates daily transactions. Cards accepted at hotels, upscale restaurants, and modern retailers. India has growing digital payments (UPI) but requires local accounts.'
			},
			atmSafety: [
				'Use ATMs inside bank branches — standalone ATMs have higher skimming risk',
				'India: SBI, HDFC, and ICICI ATMs are most reliable for foreign cards',
				'Nepal: Nabil Bank and Standard Chartered ATMs accept international cards, 500 NPR fee per withdrawal',
				'Sri Lanka: Commercial Bank and HNB ATMs work with foreign cards',
				'ATM withdrawal limits may be low (10,000-20,000 INR in India) — plan multiple withdrawals',
				'Power cuts can interrupt ATM transactions — carry backup cash'
			],
			cardAcceptance: 'Low at local businesses, very low in rural areas. Moderate at hotels, established restaurants, and modern retail. Visa has widest acceptance. India is rapidly adopting UPI (Google Pay, PhonePe) but this requires Indian bank accounts.',
			currencyTips: [
				'Indian Rupee (INR): cannot be imported or exported legally in large amounts. Get cash from ATMs on arrival.',
				'Old, torn, or very worn Indian currency may be refused by vendors — request clean bills at ATMs',
				'Nepalese Rupee (NPR): pegged to INR. Indian 500/2000 rupee notes are not accepted in Nepal.',
				'Sri Lankan Rupee (LKR): exchange at banks for best rates',
				'Small denominations are essential — change for large bills can be scarce outside cities'
			],
			tippingNorms: [
				'India: 10% at restaurants if service charge not included. Small tips for porters, drivers, housekeeping.',
				'Nepal: 10% at tourist restaurants. Tips expected for trekking guides and porters (300-500 NPR/day for porters).',
				'Sri Lanka: 10% at restaurants. Service charge often added.',
				'Bangladesh: tipping not common but small amounts appreciated at restaurants',
				'Always tip in local currency, not USD — local currency is more useful'
			],
			commonScams: [
				'Auto-rickshaw and taxi overcharging — always use meters or negotiate before departure',
				'Gem and carpet "wholesale" scams — vendors offer to ship purchases that never arrive or are worthless',
				'Fake travel agencies booking non-existent trips or accommodations',
				'Counterfeit currency — inspect bills carefully, especially 500 INR notes',
				'Commission-based shop tours — drivers and guides earn commission from overpriced shops they bring you to',
				'"Free" temple guides who demand large donations afterward'
			],
			costIndex: 0.2,
			costBreakdown: { hostel: 5, midHotel: 30, budgetMeal: 2, midMeal: 7, localTransport: 0.5, activity: 5 }
		},
		'middle-east': {
			label: 'Middle East',
			cashVsCard: {
				cash: 40,
				card: 60,
				note: 'Gulf states (UAE, Qatar, Bahrain, Kuwait) are very card-friendly. Jordan, Lebanon, and Egypt rely more on cash. USD widely accepted alongside local currencies.'
			},
			atmSafety: [
				'Gulf states have modern, reliable ATM networks with high withdrawal limits',
				'In Egypt, use ATMs at major banks (CIB, NBE) — avoid street machines',
				'Jordan: Arab Bank and Housing Bank ATMs are reliable for international cards',
				'Lebanon: ATM access and card systems are unreliable due to economic crisis — carry USD cash',
				'Always withdraw in local currency — DCC markups are especially high in this region'
			],
			cardAcceptance: 'Very high in Gulf states (UAE, Qatar, Saudi Arabia). Moderate in Jordan and Egypt (cash needed for local shops, taxis, markets). Lebanon and Iraq are primarily cash economies.',
			currencyTips: [
				'UAE Dirham (AED) and Qatari Riyal (QAR) are pegged to USD — stable exchange',
				'Egyptian Pound (EGP) has fluctuated significantly — check current rates before and during travel',
				'US dollars are widely accepted in the region, especially for hotels and tours',
				'Bring clean, recent USD bills — old or marked bills may be rejected',
				'Jordanian Dinar (JOD) is one of the strongest currencies — 1 JOD ~ 1.41 USD'
			],
			tippingNorms: [
				'UAE/Gulf: 10-15% at restaurants if no service charge. Tip in local currency.',
				'Egypt: tipping (baksheesh) is deeply embedded in culture — tip everyone who provides a service (5-20 EGP)',
				'Jordan: 10% at restaurants. Small tips for guides and drivers expected.',
				'Saudi Arabia: 10-15% at restaurants. Service workers expect tips.',
				'Always carry small denominations for tipping — exact change culture'
			],
			commonScams: [
				'Inflated "tourist prices" at markets — research typical prices and bargain firmly',
				'Self-appointed tour guides at historical sites who demand payment',
				'Perfume and spice shops using high-pressure sales tactics and bait-and-switch',
				'Camel ride price confusion — "per person" vs "per camel" ambiguity used to double-charge',
				'Currency exchange scams — counted quickly with sleight of hand to shortchange'
			],
			costIndex: 0.8,
			costBreakdown: { hostel: 20, midHotel: 80, budgetMeal: 5, midMeal: 18, localTransport: 2, activity: 15 }
		},
		'sub-saharan-africa': {
			label: 'Sub-Saharan Africa',
			cashVsCard: {
				cash: 85,
				card: 15,
				note: 'Cash is dominant. Cards only accepted at international hotels, some restaurants in capitals, and large supermarkets. Mobile money (M-Pesa) is more widespread than card payments.'
			},
			atmSafety: [
				'Use ATMs inside bank branches during business hours only',
				'Kenya: Equity Bank and KCB ATMs are reliable. M-Pesa agents are everywhere as an alternative.',
				'South Africa: FNB, Standard Bank, and Nedbank ATMs are safe inside shopping malls',
				'Nigeria: GTBank and Zenith Bank ATMs are most reliable for international cards',
				'ATM availability drops sharply outside major cities — carry enough cash for rural travel',
				'Power outages can disable ATMs for extended periods — always have backup cash'
			],
			cardAcceptance: 'Very low outside South Africa. Even in capitals, most local businesses are cash-only. South Africa has moderate card acceptance in urban areas. Mobile money dominates in East Africa (Kenya, Tanzania, Uganda).',
			currencyTips: [
				'US dollars are widely preferred — carry clean, recent bills (2009 or newer series)',
				'Torn, old, or marked USD bills will be rejected — inspect bills before travel',
				'South African Rand (ZAR) is the strongest regional currency and accepted in neighboring countries',
				'CFA Franc is used across West and Central Africa — two versions (XOF and XAF) are not interchangeable',
				'Exchange at banks for official rates — street money changers offer better rates but carry significant risk',
				'Small USD denominations (1s, 5s, 10s) get worse exchange rates than 50s and 100s'
			],
			tippingNorms: [
				'South Africa: 10-15% at restaurants. Tip petrol attendants and car guards (5-20 ZAR).',
				'Kenya/Tanzania: 10% at restaurants. Safari guides: $10-20 USD/day, camp staff: $5-10 USD/day',
				'West Africa: tipping not always expected but 500-1000 CFA appreciated at restaurants',
				'Always tip in local currency when possible',
				'Safari staff rely heavily on tips — budget accordingly'
			],
			commonScams: [
				'Fake checkpoints demanding "tolls" or "fees" — legitimate checkpoints have uniformed officials',
				'SIM card registration scams — only buy from official carrier shops',
				'Money changers with rigged counting or counterfeit bills mixed in',
				'Corrupt officials requesting "facilitation fees" — know your rights and ask for receipts',
				'Overpriced "tourist" taxis — negotiate or use ride-hailing apps where available (Bolt, Uber)',
				'Safari price inflation — book through verified operators and get detailed invoices'
			],
			costIndex: 0.35,
			costBreakdown: { hostel: 10, midHotel: 50, budgetMeal: 3, midMeal: 12, localTransport: 1, activity: 20 }
		},
		'north-africa': {
			label: 'North Africa',
			cashVsCard: {
				cash: 70,
				card: 30,
				note: 'Cash is the primary payment method for daily purchases. Cards accepted at hotels, tourist restaurants, and larger shops. Markets and local businesses are cash-only.'
			},
			atmSafety: [
				'Morocco: Attijariwafa Bank and BMCE ATMs are widespread and reliable',
				'Egypt: CIB and National Bank of Egypt ATMs work with international cards',
				'Tunisia: BIAT and Amen Bank ATMs in tourist areas accept foreign cards',
				'ATMs in medinas and tourist areas have higher fees — use bank-branch ATMs',
				'Withdraw enough cash before visiting rural areas where ATMs are scarce'
			],
			cardAcceptance: 'Moderate in tourist zones and modern establishments. Low in medinas, souks, and local markets. Visa is the most accepted network. Many small businesses prefer or only accept cash.',
			currencyTips: [
				'Moroccan Dirham (MAD): cannot be imported or exported — get cash on arrival',
				'Egyptian Pound (EGP): volatile exchange rate — monitor closely and exchange as needed',
				'Tunisian Dinar (TND): also restricted — exchange on arrival and keep receipts for reconversion',
				'EUR is the preferred foreign currency in Morocco and Tunisia; USD preferred in Egypt',
				'Always get small denominations — breaking large bills is difficult in markets'
			],
			tippingNorms: [
				'Morocco: tipping expected widely — 10-15% at restaurants, 10-20 MAD for small services',
				'Egypt: baksheesh culture — 5-20 EGP expected for any service rendered',
				'Tunisia: 10% at restaurants, small amounts for guides and services',
				'Carry plenty of small bills specifically for tipping',
				'Refusing to tip can be seen as very rude — budget for it daily'
			],
			commonScams: [
				'Souk/medina "guides" who demand payment for unsolicited directions',
				'Leather tannery tours with inflated prices and high-pressure sales',
				'Carpet shop tea trap — hospitality followed by aggressive sales and guilt',
				'Horse/camel ride operators adding charges once you are mid-ride and stranded',
				'Counterfeit goods sold as genuine at "special friend" prices'
			],
			costIndex: 0.35,
			costBreakdown: { hostel: 10, midHotel: 45, budgetMeal: 3, midMeal: 10, localTransport: 1, activity: 8 }
		},
		'latin-america': {
			label: 'Latin America',
			cashVsCard: {
				cash: 60,
				card: 40,
				note: 'Cash essential for local transport, markets, street food, and smaller businesses. Cards accepted at malls, restaurants, and hotels. Growing mobile payment adoption in major cities.'
			},
			atmSafety: [
				'Use ATMs inside banks or shopping malls — avoid street-facing machines',
				'Withdrawal fees vary: expect $3-5 USD per transaction from local bank fees',
				'Mexico: Citibanamex and HSBC ATMs are reliable. Avoid unmarked ATMs in tourist zones.',
				'Argentina: ATM withdrawal limits are very low (often $100-200 USD equivalent) — plan multiple withdrawals',
				'Colombia: Bancolombia and Davivienda ATMs have the best international card acceptance',
				'Be aware of "express kidnapping" risk at ATMs at night — withdraw during daytime in safe locations'
			],
			cardAcceptance: 'Moderate in major cities and tourist areas. Low in rural areas and local markets. Chile, Uruguay, and major Mexican cities have the highest card acceptance. Ecuador, Bolivia, and Peru are more cash-dependent.',
			currencyTips: [
				'Argentina has a complex exchange rate situation — the official rate and parallel ("blue dollar") rate can differ significantly',
				'Ecuador, Panama, and El Salvador use USD as official currency',
				'Mexican Peso (MXN), Colombian Peso (COP), and Chilean Peso (CLP) — learn the denominations to avoid confusion',
				'Brazilian Real (BRL) can only be exchanged in Brazil — get cash from ATMs on arrival',
				'USD is widely accepted as backup in most Latin American countries — carry clean bills'
			],
			tippingNorms: [
				'Mexico: 10-15% at restaurants (propina). Check if it is included in the bill.',
				'Brazil: 10% service charge usually included. Extra tip appreciated but not expected.',
				'Argentina: 10% at restaurants. Cash tips preferred even if paying by card.',
				'Colombia: 10% service charge added — you can decline ("voluntario") but it is customary to accept',
				'Peru: 10% at tourist restaurants. Small tips for guides and porters.'
			],
			commonScams: [
				'Express kidnapping near ATMs — victim forced to withdraw maximum amount',
				'Fake police asking for documents and "fines" payable in cash on the spot',
				'Taxi meter tampering — use registered taxis, Uber, Didi, or InDrive',
				'Counterfeit bills, especially in Argentina and Peru — learn security features',
				'Credit card cloning at restaurants — never let your card leave your sight',
				'Distraction theft — mustard/sauce "accidentally" spilled on you while partner picks your pocket'
			],
			costIndex: 0.4,
			costBreakdown: { hostel: 10, midHotel: 50, budgetMeal: 4, midMeal: 12, localTransport: 1, activity: 10 }
		},
		'north-america': {
			label: 'North America',
			cashVsCard: {
				cash: 15,
				card: 85,
				note: 'Card and contactless payments are the norm. Cash useful for tipping, street vendors, and some small businesses. Nearly cashless in most urban environments.'
			},
			atmSafety: [
				'Bank-owned ATMs have no surcharge for account holders — out-of-network ATMs charge $3-5',
				'Credit union ATMs in the US are often surcharge-free for other credit union members',
				'Canada: Big Five banks (TD, RBC, BMO, Scotiabank, CIBC) ATMs are safe and widespread',
				'Avoid cash advance on credit cards — fees and interest rates are significantly higher',
				'Skimming risk at gas station pumps and standalone ATMs — use tap-to-pay when available'
			],
			cardAcceptance: 'Very high everywhere. Contactless and mobile payments widely accepted. Some small vendors and food trucks may be cash-only. Tipping is a major part of culture — carry small bills.',
			currencyTips: [
				'US Dollar (USD) and Canadian Dollar (CAD) are not interchangeable at par — check exchange rates',
				'Canadian coins include $1 (loonie) and $2 (toonie) — no $1 bill exists',
				'US coins are rarely needed but useful for laundromats, parking meters, and vending machines',
				'Mexican resorts near the border accept USD but at poor exchange rates — use MXN',
				'Canada has eliminated the penny — cash transactions are rounded to nearest 5 cents'
			],
			tippingNorms: [
				'USA: 18-22% at restaurants (this is NOT optional — it is the primary income for servers)',
				'Canada: 15-20% at restaurants',
				'Bars: $1-2 per drink',
				'Hotel housekeeping: $2-5 per night left daily',
				'Rideshare/taxi: 15-20%',
				'Coffee shops: $1 or skip — tip jar is optional'
			],
			commonScams: [
				'Credit card skimming at gas stations — use contactless pay or pay inside',
				'Fake toll booths and parking attendants in tourist areas',
				'Timeshare presentation offers with free gifts that lead to high-pressure sales',
				'Unlicensed street vendors selling counterfeit goods at inflated "deal" prices',
				'Overcharging by unlicensed airport taxis — use official taxi stands or rideshare apps'
			],
			costIndex: 1.0,
			costBreakdown: { hostel: 30, midHotel: 150, budgetMeal: 12, midMeal: 30, localTransport: 3, activity: 20 }
		},
		'oceania': {
			label: 'Oceania',
			cashVsCard: {
				cash: 15,
				card: 85,
				note: 'Australia and New Zealand are highly card-friendly with widespread contactless payment. Pacific Islands rely more on cash.'
			},
			atmSafety: [
				'Australia: Big Four banks (CBA, Westpac, NAB, ANZ) ATMs are reliable and widespread',
				'New Zealand: ATMs widely available in towns — scarce in rural and backcountry areas',
				'Pacific Islands: ATM availability limited — carry enough cash for your stay',
				'Fiji: ANZ and Westpac ATMs in tourist areas accept international cards',
				'Foreign transaction fees apply at most ATMs — check with your bank'
			],
			cardAcceptance: 'Very high in Australia and New Zealand — many businesses are going cashless. Low to moderate in Pacific Islands (Fiji has better infrastructure than smaller nations). Visa and Mastercard widely accepted.',
			currencyTips: [
				'Australian Dollar (AUD) and New Zealand Dollar (NZD) are different currencies — do not confuse',
				'Fijian Dollar (FJD): carry some USD as backup for outer islands',
				'Australian notes are polymer (plastic) and survive water — useful for active travel',
				'Exchange rates at airport bureaus are poor — use ATMs or order currency from your bank before travel',
				'Pacific Island nations may accept AUD or NZD alongside local currencies'
			],
			tippingNorms: [
				'Australia: tipping is NOT expected and not part of the culture. 10% for exceptional service at restaurants is appreciated.',
				'New Zealand: same as Australia — tipping is uncommon and never required',
				'Fiji and Pacific Islands: tipping appreciated at resorts, not expected elsewhere',
				'Do not feel pressured to tip — minimum wages are livable in Australia and NZ',
				'Tour guides: small tip appreciated if excellent service, never required'
			],
			commonScams: [
				'Overpriced tours booked through middlemen — book directly with operators',
				'Rental car insurance pressure to buy unnecessary coverage — check your travel insurance first',
				'Fake charity collectors in Australian cities',
				'Pacific Island "cultural show" operators charging hidden fees',
				'Unlicensed tour operators in Fiji and Vanuatu — verify credentials'
			],
			costIndex: 1.1,
			costBreakdown: { hostel: 30, midHotel: 130, budgetMeal: 12, midMeal: 28, localTransport: 4, activity: 18 }
		}
	};

	// ── State ──────────────────────────────────────────────────────────

	let selectedRegion = $state<Region>('southeast-asia');
	let paymentMethods = $state<Record<PaymentMethod, boolean>>({
		cash: true,
		credit: true,
		debit: false,
		crypto: false
	});
	let dailyBudgetInput = $state<number>(50);
	let tripDuration = $state<number>(14);
	let activeTab = $state<'guidance' | 'checklist' | 'budget'>('guidance');

	// ── Derived ───────────────────────────────────────────────────────

	let region = $derived(regionData[selectedRegion]);
	let selectedPaymentList = $derived(
		(Object.entries(paymentMethods) as [PaymentMethod, boolean][])
			.filter(([, v]) => v)
			.map(([k]) => k)
	);
	let hasPaymentMethods = $derived(selectedPaymentList.length > 0);

	// Budget calculations
	let budgetCalc = $derived.by(() => {
		const d = dailyBudgetInput;
		const days = tripDuration;
		const ci = region.costIndex;
		const cb = region.costBreakdown;

		// adjusted daily purchasing power in-region
		const adjustedDaily = Math.round(d / ci);

		// category breakdown based on typical split
		const accommodation = Math.round(d * 0.35);
		const food = Math.round(d * 0.25);
		const transport = Math.round(d * 0.15);
		const activities = Math.round(d * 0.15);
		const reserve = Math.round(d * 0.10);

		// can-afford indicators
		const canAffordMidHotel = d * 0.35 >= cb.midHotel;
		const canAffordHostel = d * 0.35 >= cb.hostel;
		const budgetTier = d >= cb.midHotel + cb.midMeal * 3 + cb.localTransport * 4 + cb.activity
			? 'comfortable'
			: d >= cb.hostel + cb.budgetMeal * 3 + cb.localTransport * 2
				? 'moderate'
				: 'budget';

		return {
			daily: d,
			total: d * days,
			days,
			accommodation,
			food,
			transport,
			activities,
			reserve,
			adjustedDaily,
			canAffordMidHotel,
			canAffordHostel,
			budgetTier,
			costBreakdown: cb
		};
	});

	// ── OPSEC Checklist ───────────────────────────────────────────────

	let sections = $state<CheckSection[]>([
		{
			name: 'Pre-Departure',
			items: [
				{ id: 'fo-pd-1', label: 'Notify bank of travel dates and destinations', detail: 'Prevents fraud alerts from blocking legitimate transactions abroad', checked: false },
				{ id: 'fo-pd-2', label: 'Set up transaction alerts on all cards', detail: 'Enable real-time push notifications for every transaction', checked: false },
				{ id: 'fo-pd-3', label: 'Carry backup card from different bank/network', detail: 'Visa + Mastercard from separate banks ensures coverage if one is blocked', checked: false },
				{ id: 'fo-pd-4', label: 'Keep emergency cash separated from daily funds', detail: 'Hidden stash of USD/EUR in money belt or concealed pouch', checked: false },
				{ id: 'fo-pd-5', label: 'Use RFID-blocking wallet', detail: 'Prevents wireless skimming of contactless-enabled cards in crowds', checked: false },
				{ id: 'fo-pd-6', label: 'Know current exchange rate for destination', detail: 'Check XE or Wise before departure — know what things should cost', checked: false },
				{ id: 'fo-pd-7', label: 'Save emergency card company phone numbers', detail: 'International numbers that work from abroad — the number on your card may not', checked: false }
			]
		},
		{
			name: 'Cash Handling',
			items: [
				{ id: 'fo-ch-1', label: 'Do not flash large bills in public', detail: 'Pull out only the bill you need — never reveal a full wallet or stack', checked: false },
				{ id: 'fo-ch-2', label: 'Count money discreetly', detail: 'Step into a restroom, hotel room, or private area to count cash', checked: false },
				{ id: 'fo-ch-3', label: 'Avoid money changers at tourist spots', detail: 'Airport and tourist-area exchange offices charge 5-15% more than bank rates', checked: false },
				{ id: 'fo-ch-4', label: 'Use ATMs inside banks during business hours', detail: 'Bank-attached ATMs have lower skimming risk and staff nearby if issues arise', checked: false },
				{ id: 'fo-ch-5', label: 'Keep receipt records separate from cards', detail: 'If wallet is stolen, receipts with card info expose you to further fraud', checked: false }
			]
		},
		{
			name: 'Daily Protocol',
			items: [
				{ id: 'fo-dp-1', label: 'Carry only what you can afford to lose today', detail: 'Daily wallet should have one day of budget — replenish from hidden reserve in private', checked: false },
				{ id: 'fo-dp-2', label: 'Split cash across at least 3 locations', detail: 'Wallet, hidden carry, and hotel safe — never put everything in one place', checked: false },
				{ id: 'fo-dp-3', label: 'Monitor card transactions daily', detail: 'Check banking app each evening — report unauthorized charges immediately', checked: false },
				{ id: 'fo-dp-4', label: 'Decline Dynamic Currency Conversion at ATMs', detail: 'Always choose local currency — DCC adds 3-7% in hidden markup', checked: false },
				{ id: 'fo-dp-5', label: 'Never let your card out of sight at restaurants', detail: 'Card cloning takes seconds — watch the payment process or use contactless', checked: false }
			]
		},
		{
			name: 'Emergency Readiness',
			items: [
				{ id: 'fo-er-1', label: 'Know where nearest embassy/consulate is located', detail: 'They can assist with emergency funds transfer if all money and cards are lost', checked: false },
				{ id: 'fo-er-2', label: 'Have a trusted contact who can wire money', detail: 'Pre-arrange a method (Western Union, Wise) with someone back home', checked: false },
				{ id: 'fo-er-3', label: 'Store encrypted copies of card numbers', detail: 'Password-protected note or encrypted file accessible from any device', checked: false },
				{ id: 'fo-er-4', label: 'Know how to freeze cards from banking app', detail: 'Practice freezing and unfreezing before departure so it is muscle memory', checked: false },
				{ id: 'fo-er-5', label: 'Prepare a decoy wallet', detail: 'Old expired card and small amount of cash to surrender in a robbery scenario', checked: false }
			]
		}
	]);

	let checkedCount = $derived(
		sections.reduce((sum, s) => sum + s.items.filter((i) => i.checked).length, 0)
	);
	let totalCount = $derived(sections.reduce((sum, s) => sum + s.items.length, 0));
	let progressPct = $derived(totalCount > 0 ? Math.round((checkedCount / totalCount) * 100) : 0);
	let complete = $derived(checkedCount === totalCount && totalCount > 0);

	// ── localStorage ──────────────────────────────────────────────────

	const STORAGE_KEY_CHECKLIST = 'financial-opsec-checklist-v2';
	const STORAGE_KEY_PROFILE = 'financial-opsec-profile';

	$effect(() => {
		try {
			const saved = localStorage.getItem(STORAGE_KEY_CHECKLIST);
			if (saved) {
				const ids = JSON.parse(saved) as string[];
				for (const s of sections) {
					for (const item of s.items) {
						item.checked = ids.includes(item.id);
					}
				}
			}
		} catch { /* ignore corrupt data */ }

		try {
			const savedProfile = localStorage.getItem(STORAGE_KEY_PROFILE);
			if (savedProfile) {
				const p = JSON.parse(savedProfile);
				if (p.region && p.region in regionData) selectedRegion = p.region;
				if (p.budget && typeof p.budget === 'number') dailyBudgetInput = p.budget;
				if (p.duration && typeof p.duration === 'number') tripDuration = p.duration;
				if (p.payments) paymentMethods = { ...paymentMethods, ...p.payments };
			}
		} catch { /* ignore */ }
	});

	function saveChecklist() {
		const ids = sections.flatMap((s) => s.items).filter((i) => i.checked).map((i) => i.id);
		localStorage.setItem(STORAGE_KEY_CHECKLIST, JSON.stringify(ids));
	}

	function saveProfile() {
		localStorage.setItem(STORAGE_KEY_PROFILE, JSON.stringify({
			region: selectedRegion,
			budget: dailyBudgetInput,
			duration: tripDuration,
			payments: paymentMethods
		}));
	}

	function resetChecklist() {
		for (const s of sections) {
			for (const item of s.items) {
				item.checked = false;
			}
		}
		localStorage.removeItem(STORAGE_KEY_CHECKLIST);
	}

	function togglePayment(method: PaymentMethod) {
		paymentMethods[method] = !paymentMethods[method];
		saveProfile();
	}
</script>

<svelte:head>
	<title>Financial OPSEC - Greyline</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div>
		<a href="/tools" class="text-sm text-accent-400 hover:text-accent-300">&larr; Tools</a>
		<h1 class="mt-2 text-xl font-semibold text-surface-100">Financial OPSEC</h1>
		<p class="mt-0.5 font-mono text-xs text-surface-500">PAYMENT SECURITY & MONEY MANAGEMENT</p>
	</div>

	<!-- Region Selector + Profile -->
	<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
		<h2 class="mb-4 font-mono text-[11px] uppercase tracking-widest text-surface-500">Destination & Profile</h2>

		<div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
			<!-- Region dropdown -->
			<div>
				<label for="region-select" class="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-surface-400">Region</label>
				<select
					id="region-select"
					bind:value={selectedRegion}
					onchange={saveProfile}
					class="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-[13px] text-surface-100 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
				>
					{#each Object.entries(regionLabels) as [key, label]}
						<option value={key}>{label}</option>
					{/each}
				</select>
			</div>

			<!-- Daily budget -->
			<div>
				<label for="daily-budget" class="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-surface-400">Daily Budget (USD)</label>
				<input
					id="daily-budget"
					type="number"
					bind:value={dailyBudgetInput}
					onchange={saveProfile}
					min="5"
					max="2000"
					step="5"
					class="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-[13px] text-surface-100 placeholder-surface-600 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
				/>
			</div>

			<!-- Trip duration -->
			<div>
				<label for="trip-duration" class="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-surface-400">Trip Duration (days)</label>
				<input
					id="trip-duration"
					type="number"
					bind:value={tripDuration}
					onchange={saveProfile}
					min="1"
					max="365"
					step="1"
					class="w-full rounded-lg border border-surface-700 bg-surface-900 px-3 py-2 text-[13px] text-surface-100 placeholder-surface-600 focus:border-accent-600 focus:outline-none focus:ring-1 focus:ring-accent-600"
				/>
			</div>

			<!-- Payment methods -->
			<div>
				<span class="mb-1.5 block font-mono text-[11px] uppercase tracking-wider text-surface-400">Payment Methods</span>
				<div class="flex flex-wrap gap-2">
					{#each (['cash', 'credit', 'debit', 'crypto'] as const) as method}
						<button
							onclick={() => togglePayment(method)}
							class="rounded-md border px-2.5 py-1.5 text-[12px] font-medium transition-colors {paymentMethods[method]
								? 'border-accent-600/50 bg-accent-900/20 text-accent-300'
								: 'border-surface-700 bg-surface-900 text-surface-500 hover:border-surface-600'}"
						>
							{method === 'credit' ? 'Credit Card' : method === 'debit' ? 'Debit Card' : method === 'crypto' ? 'Crypto' : 'Cash'}
						</button>
					{/each}
				</div>
			</div>
		</div>

		<!-- Profile summary -->
		<div class="mt-4 rounded-md border border-surface-700/30 bg-surface-900 px-4 py-2.5">
			<p class="text-[13px] text-surface-400">
				<span class="text-accent-400">{region.label}</span> &middot;
				${dailyBudgetInput}/day &middot;
				{tripDuration} days &middot;
				${budgetCalc.total} total &middot;
				{#if hasPaymentMethods}
					Carrying: {selectedPaymentList.map(m => m === 'credit' ? 'credit card' : m === 'debit' ? 'debit card' : m).join(', ')}
				{:else}
					<span class="text-amber-400">No payment methods selected</span>
				{/if}
			</p>
		</div>
	</div>

	<!-- Tab navigation -->
	<div class="flex gap-1 rounded-lg border border-surface-700/50 bg-surface-800 p-1">
		<button
			onclick={() => { activeTab = 'guidance'; }}
			class="flex-1 rounded-md px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors {activeTab === 'guidance'
				? 'bg-surface-700 text-accent-300'
				: 'text-surface-500 hover:text-surface-300'}"
		>Region Guidance</button>
		<button
			onclick={() => { activeTab = 'checklist'; }}
			class="flex-1 rounded-md px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors {activeTab === 'checklist'
				? 'bg-surface-700 text-accent-300'
				: 'text-surface-500 hover:text-surface-300'}"
		>OPSEC Checklist <span class="ml-1 text-[10px] {complete ? 'text-emerald-400' : ''}">{checkedCount}/{totalCount}</span></button>
		<button
			onclick={() => { activeTab = 'budget'; }}
			class="flex-1 rounded-md px-4 py-2 font-mono text-[11px] uppercase tracking-wider transition-colors {activeTab === 'budget'
				? 'bg-surface-700 text-accent-300'
				: 'text-surface-500 hover:text-surface-300'}"
		>Budget Calculator</button>
	</div>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- TAB: Region Guidance                                           -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	{#if activeTab === 'guidance'}
		<!-- Cash vs Card -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 font-mono text-[11px] uppercase tracking-widest text-surface-500">Cash vs Card</h2>

			<!-- Visual bar -->
			<div class="mb-3 flex h-8 overflow-hidden rounded-lg">
				<div
					class="flex items-center justify-center bg-emerald-800/60 text-[12px] font-medium text-emerald-200 transition-all duration-300"
					style="width: {region.cashVsCard.cash}%"
				>
					{#if region.cashVsCard.cash >= 20}Cash {region.cashVsCard.cash}%{/if}
				</div>
				<div
					class="flex items-center justify-center bg-accent-800/40 text-[12px] font-medium text-accent-200 transition-all duration-300"
					style="width: {region.cashVsCard.card}%"
				>
					{#if region.cashVsCard.card >= 20}Card {region.cashVsCard.card}%{/if}
				</div>
			</div>
			{#if region.cashVsCard.cash < 20}
				<p class="mb-1 text-[11px] text-emerald-300">Cash: {region.cashVsCard.cash}%</p>
			{/if}
			{#if region.cashVsCard.card < 20}
				<p class="mb-1 text-[11px] text-accent-300">Card: {region.cashVsCard.card}%</p>
			{/if}
			<p class="text-[13px] text-surface-300">{region.cashVsCard.note}</p>

			<!-- Payment-specific warnings -->
			{#if paymentMethods.crypto}
				<div class="mt-3 rounded-md border border-amber-800/30 bg-amber-950/20 px-3 py-2.5">
					<p class="text-[13px] text-amber-300/90">Crypto acceptance is extremely limited in {region.label}. Do not rely on it for daily expenses. Always carry conventional payment methods as primary.</p>
				</div>
			{/if}
			{#if !paymentMethods.cash && region.cashVsCard.cash >= 50}
				<div class="mt-3 rounded-md border border-red-800/30 bg-red-950/20 px-3 py-2.5">
					<p class="text-[13px] text-red-300/90">Warning: {region.label} is a cash-heavy region ({region.cashVsCard.cash}% cash). You should strongly consider carrying cash.</p>
				</div>
			{/if}
			{#if !paymentMethods.credit && !paymentMethods.debit && region.cashVsCard.card >= 50}
				<div class="mt-3 rounded-md border border-amber-800/30 bg-amber-950/20 px-3 py-2.5">
					<p class="text-[13px] text-amber-300/90">Note: {region.label} has strong card acceptance ({region.cashVsCard.card}%). Carrying a credit or debit card would give you more flexibility.</p>
				</div>
			{/if}
		</div>

		<!-- ATM Safety -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 font-mono text-[11px] uppercase tracking-widest text-surface-500">ATM Safety</h2>
			<div class="space-y-2">
				{#each region.atmSafety as tip, i}
					<div class="flex items-start gap-3 rounded-md bg-surface-900 px-4 py-3">
						<span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-accent-900/30 text-[11px] font-medium text-accent-400">{i + 1}</span>
						<p class="text-[13px] text-surface-300">{tip}</p>
					</div>
				{/each}
			</div>
			<div class="mt-3 rounded-md border border-amber-800/30 bg-amber-950/20 px-3 py-2.5">
				<p class="text-[13px] text-amber-300/90"><span class="font-medium">DCC Warning:</span> When an ATM asks "Would you like to pay in your home currency?" always select NO. Dynamic Currency Conversion adds 3-7% in hidden markup. Always choose the local currency.</p>
			</div>
		</div>

		<!-- Card Acceptance -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 font-mono text-[11px] uppercase tracking-widest text-surface-500">Card Acceptance</h2>
			<p class="text-[13px] text-surface-300">{region.cardAcceptance}</p>
		</div>

		<!-- Currency Tips -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 font-mono text-[11px] uppercase tracking-widest text-surface-500">Currency Tips</h2>
			<div class="space-y-2">
				{#each region.currencyTips as tip}
					<div class="flex items-start gap-2 rounded-md bg-surface-900 px-4 py-3">
						<span class="mt-1 text-accent-500">&#8226;</span>
						<p class="text-[13px] text-surface-300">{tip}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Tipping Norms -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 font-mono text-[11px] uppercase tracking-widest text-surface-500">Tipping Norms</h2>
			<div class="space-y-2">
				{#each region.tippingNorms as norm}
					<div class="flex items-start gap-2 rounded-md bg-surface-900 px-4 py-3">
						<span class="mt-1 text-accent-500">&#8226;</span>
						<p class="text-[13px] text-surface-300">{norm}</p>
					</div>
				{/each}
			</div>
		</div>

		<!-- Common Scams -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 font-mono text-[11px] uppercase tracking-widest text-surface-500">Common Financial Scams</h2>
			<div class="space-y-2">
				{#each region.commonScams as scam, i}
					<div class="flex items-start gap-3 rounded-md bg-surface-900 px-4 py-3">
						<span class="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-red-900/30 text-[11px] font-medium text-red-400">{i + 1}</span>
						<p class="text-[13px] text-surface-300">{scam}</p>
					</div>
				{/each}
			</div>
		</div>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- TAB: OPSEC Checklist                                           -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	{:else if activeTab === 'checklist'}
		<div class="space-y-4">
			<!-- Progress bar -->
			<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
				<div class="flex items-center justify-between">
					<div>
						<h2 class="font-mono text-[11px] uppercase tracking-widest text-surface-500">Preparation Progress</h2>
						<p class="mt-1 text-[13px] text-surface-400">{checkedCount} of {totalCount} items completed</p>
					</div>
					<div class="flex items-center gap-3">
						<span class="font-mono text-sm {complete ? 'text-emerald-400' : 'text-surface-400'}">{progressPct}%</span>
						<button
							onclick={resetChecklist}
							class="rounded-md border border-surface-700 px-3 py-1.5 text-[12px] text-surface-400 transition-colors hover:border-surface-600 hover:bg-surface-700"
						>Reset</button>
					</div>
				</div>
				<div class="mt-3 h-2 overflow-hidden rounded-full bg-surface-900">
					<div
						class="h-full rounded-full transition-all duration-300 {complete ? 'bg-emerald-500' : 'bg-accent-500'}"
						style="width: {progressPct}%"
					></div>
				</div>
			</div>

			{#if complete}
				<div class="rounded-lg border border-emerald-700/50 bg-emerald-900/10 px-4 py-3 text-[13px] text-emerald-300">
					Financial OPSEC preparation complete. All {totalCount} items verified.
				</div>
			{/if}

			{#each sections as section}
				{@const sChecked = section.items.filter((i) => i.checked).length}
				{@const sTotal = section.items.length}
				{@const sComplete = sChecked === sTotal}
				<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
					<div class="mb-3 flex items-center justify-between">
						<h3 class="font-mono text-[11px] uppercase tracking-widest text-surface-500">{section.name}</h3>
						<span class="font-mono text-[11px] {sComplete ? 'text-emerald-400' : 'text-surface-500'}">{sChecked}/{sTotal}</span>
					</div>
					<div class="space-y-1">
						{#each section.items as item}
							<label class="flex cursor-pointer items-start gap-3 rounded-md px-2 py-2.5 transition-colors hover:bg-surface-700/50">
								<input
									type="checkbox"
									bind:checked={item.checked}
									onchange={saveChecklist}
									class="mt-0.5 h-4 w-4 rounded border-surface-600 bg-surface-900 text-accent-500 focus:ring-accent-500"
								/>
								<div class="min-w-0 flex-1">
									<span class="text-[13px] {item.checked ? 'text-surface-500 line-through' : 'text-surface-200'}">{item.label}</span>
									<p class="mt-0.5 text-[12px] text-surface-500">{item.detail}</p>
								</div>
							</label>
						{/each}
					</div>
				</div>
			{/each}
		</div>

	<!-- ═══════════════════════════════════════════════════════════════ -->
	<!-- TAB: Budget Calculator                                         -->
	<!-- ═══════════════════════════════════════════════════════════════ -->
	{:else if activeTab === 'budget'}
		<!-- Trip totals -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 font-mono text-[11px] uppercase tracking-widest text-surface-500">Trip Budget Overview</h2>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-4">
				<div class="rounded-md bg-surface-900 px-3 py-3 text-center">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Daily</p>
					<p class="mt-1 text-lg font-semibold text-surface-100">${budgetCalc.daily}</p>
				</div>
				<div class="rounded-md bg-surface-900 px-3 py-3 text-center">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Total ({budgetCalc.days}d)</p>
					<p class="mt-1 text-lg font-semibold text-surface-100">${budgetCalc.total}</p>
				</div>
				<div class="rounded-md bg-surface-900 px-3 py-3 text-center">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Cost Index</p>
					<p class="mt-1 text-lg font-semibold text-surface-100">{region.costIndex}x</p>
				</div>
				<div class="rounded-md bg-surface-900 px-3 py-3 text-center">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Tier</p>
					<p class="mt-1 text-lg font-semibold {budgetCalc.budgetTier === 'comfortable' ? 'text-emerald-400' : budgetCalc.budgetTier === 'moderate' ? 'text-accent-400' : 'text-amber-400'}">{budgetCalc.budgetTier}</p>
				</div>
			</div>
		</div>

		<!-- Daily breakdown -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 font-mono text-[11px] uppercase tracking-widest text-surface-500">Daily Budget Breakdown</h2>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-5">
				<div class="rounded-md bg-surface-900 px-3 py-3 text-center">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Accommodation</p>
					<p class="mt-1 text-lg font-semibold text-surface-200">${budgetCalc.accommodation}</p>
					<p class="text-[11px] text-surface-600">35%</p>
				</div>
				<div class="rounded-md bg-surface-900 px-3 py-3 text-center">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Food</p>
					<p class="mt-1 text-lg font-semibold text-surface-200">${budgetCalc.food}</p>
					<p class="text-[11px] text-surface-600">25%</p>
				</div>
				<div class="rounded-md bg-surface-900 px-3 py-3 text-center">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Transport</p>
					<p class="mt-1 text-lg font-semibold text-surface-200">${budgetCalc.transport}</p>
					<p class="text-[11px] text-surface-600">15%</p>
				</div>
				<div class="rounded-md bg-surface-900 px-3 py-3 text-center">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Activities</p>
					<p class="mt-1 text-lg font-semibold text-surface-200">${budgetCalc.activities}</p>
					<p class="text-[11px] text-surface-600">15%</p>
				</div>
				<div class="rounded-md bg-surface-900 px-3 py-3 text-center">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Reserve</p>
					<p class="mt-1 text-lg font-semibold text-accent-400">${budgetCalc.reserve}</p>
					<p class="text-[11px] text-surface-600">10%</p>
				</div>
			</div>
			<p class="mt-3 text-[12px] text-surface-500">Suggested allocation based on your daily budget. The 10% reserve covers unexpected expenses, emergencies, and currency fluctuations.</p>
		</div>

		<!-- Regional cost reference -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 font-mono text-[11px] uppercase tracking-widest text-surface-500">Typical Costs in {region.label}</h2>
			<div class="grid grid-cols-2 gap-3 sm:grid-cols-3">
				<div class="rounded-md bg-surface-900 px-4 py-3">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Hostel/Night</p>
					<p class="mt-1 text-base font-semibold text-surface-200">${region.costBreakdown.hostel}</p>
				</div>
				<div class="rounded-md bg-surface-900 px-4 py-3">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Mid-Range Hotel</p>
					<p class="mt-1 text-base font-semibold text-surface-200">${region.costBreakdown.midHotel}</p>
				</div>
				<div class="rounded-md bg-surface-900 px-4 py-3">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Budget Meal</p>
					<p class="mt-1 text-base font-semibold text-surface-200">${region.costBreakdown.budgetMeal}</p>
				</div>
				<div class="rounded-md bg-surface-900 px-4 py-3">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Mid-Range Meal</p>
					<p class="mt-1 text-base font-semibold text-surface-200">${region.costBreakdown.midMeal}</p>
				</div>
				<div class="rounded-md bg-surface-900 px-4 py-3">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Local Transport</p>
					<p class="mt-1 text-base font-semibold text-surface-200">${region.costBreakdown.localTransport}</p>
				</div>
				<div class="rounded-md bg-surface-900 px-4 py-3">
					<p class="font-mono text-[10px] uppercase tracking-wider text-surface-500">Activity/Entry</p>
					<p class="mt-1 text-base font-semibold text-surface-200">${region.costBreakdown.activity}</p>
				</div>
			</div>
		</div>

		<!-- Budget assessment -->
		<div class="rounded-lg border border-surface-700/50 bg-surface-800 p-5">
			<h2 class="mb-4 font-mono text-[11px] uppercase tracking-widest text-surface-500">Budget Assessment</h2>
			<div class="space-y-3">
				<!-- Accommodation affordability -->
				<div class="rounded-md bg-surface-900 px-4 py-3">
					<div class="flex items-center gap-2">
						<span class="h-2 w-2 rounded-full {budgetCalc.canAffordMidHotel ? 'bg-emerald-400' : budgetCalc.canAffordHostel ? 'bg-accent-400' : 'bg-red-400'}"></span>
						<p class="text-[13px] font-medium text-surface-200">Accommodation</p>
					</div>
					<p class="mt-1 text-[13px] text-surface-400">
						{#if budgetCalc.canAffordMidHotel}
							Your accommodation budget of ${budgetCalc.accommodation}/night covers mid-range hotels (${region.costBreakdown.midHotel}/night avg) in {region.label}.
						{:else if budgetCalc.canAffordHostel}
							Your accommodation budget of ${budgetCalc.accommodation}/night fits hostels (${region.costBreakdown.hostel}/night avg) but not mid-range hotels (${region.costBreakdown.midHotel}/night) in {region.label}.
						{:else}
							Your accommodation budget of ${budgetCalc.accommodation}/night is below even hostel prices (${region.costBreakdown.hostel}/night avg) in {region.label}. Consider increasing your daily budget or using alternatives like Couchsurfing.
						{/if}
					</p>
				</div>

				<!-- Food affordability -->
				<div class="rounded-md bg-surface-900 px-4 py-3">
					<div class="flex items-center gap-2">
						<span class="h-2 w-2 rounded-full {budgetCalc.food >= region.costBreakdown.midMeal * 2 + region.costBreakdown.budgetMeal ? 'bg-emerald-400' : budgetCalc.food >= region.costBreakdown.budgetMeal * 3 ? 'bg-accent-400' : 'bg-amber-400'}"></span>
						<p class="text-[13px] font-medium text-surface-200">Food</p>
					</div>
					<p class="mt-1 text-[13px] text-surface-400">
						Food budget of ${budgetCalc.food}/day covers approximately {Math.floor(budgetCalc.food / region.costBreakdown.budgetMeal)} budget meals or {Math.floor(budgetCalc.food / region.costBreakdown.midMeal)} mid-range meals per day in {region.label}.
					</p>
				</div>

				<!-- Cash carry recommendation -->
				<div class="rounded-md bg-surface-900 px-4 py-3">
					<div class="flex items-center gap-2">
						<span class="h-2 w-2 rounded-full bg-accent-400"></span>
						<p class="text-[13px] font-medium text-surface-200">Recommended Cash to Carry</p>
					</div>
					<p class="mt-1 text-[13px] text-surface-400">
						For {region.label} ({region.cashVsCard.cash}% cash usage), carry approximately
						${Math.round(dailyBudgetInput * (region.cashVsCard.cash / 100) * 2)}-${Math.round(dailyBudgetInput * (region.cashVsCard.cash / 100) * 3)} in local currency
						as your daily-accessible amount (2-3 days of cash spending). Keep an additional
						${Math.round(dailyBudgetInput * (region.cashVsCard.cash / 100) * 7)} as a secured weekly reserve.
					</p>
				</div>

				<!-- Trip total summary -->
				<div class="rounded-md border border-accent-800/30 bg-accent-950/10 px-4 py-3">
					<p class="text-[13px] text-surface-300">
						<span class="font-medium text-accent-300">Total trip budget:</span>
						${budgetCalc.total} for {budgetCalc.days} days in {region.label}.
						At the <span class="font-medium">{budgetCalc.budgetTier}</span> tier, your daily ${budgetCalc.daily} goes
						{region.costIndex < 0.5 ? 'very far' : region.costIndex < 0.8 ? 'reasonably far' : region.costIndex <= 1.0 ? 'about the same as at home' : 'less far than in the US'} in this region (cost index: {region.costIndex}x US baseline).
						{#if budgetCalc.budgetTier === 'budget'}
							Consider building in a 15-20% emergency buffer above your planned total.
						{/if}
					</p>
				</div>
			</div>
		</div>
	{/if}
</div>
