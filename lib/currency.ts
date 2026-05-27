// Pure travel-money helpers for the Currency tool.
// All functions are side-effect free and unit-testable.

/** A foreign-exchange channel and what it typically costs a traveler. */
export interface ChannelCost {
  /** Human-readable channel name. */
  name: string;
  /** Spread applied against the mid-market rate, as a fraction (0.12 = 12%). */
  spreadPct: number;
  /**
   * Effective rate the traveler actually receives.
   * Expressed in the same direction as the mid-market rate (home -> destination):
   * a worse rate means you get fewer destination units per home unit.
   */
  effectiveRate: number;
  /** How much value (in home currency) you lose per 100 units converted. */
  lossPer100: number;
}

/**
 * Published industry spread ranges, expressed as the midpoint constant we use.
 * Sources: typical airport/hotel kiosk 7-15%, retail bank 1-3%,
 * ATM network surcharge 1-3% (plus possible flat fee), card network ~1%.
 */
const CHANNELS: ReadonlyArray<{ name: string; spreadPct: number }> = [
  { name: "Airport / hotel kiosk", spreadPct: 0.12 },
  { name: "Bank", spreadPct: 0.025 },
  { name: "ATM (network)", spreadPct: 0.03 },
  { name: "Card network (Visa/MC)", spreadPct: 0.01 },
];

/**
 * Given the mid-market rate (destination units per 1 home unit), return the
 * effective rate and per-100 loss for each typical exchange channel.
 */
export function channelCosts(midRate: number): ChannelCost[] {
  return CHANNELS.map(({ name, spreadPct }) => ({
    name,
    spreadPct,
    // You receive fewer destination units once the spread is taken.
    effectiveRate: midRate * (1 - spreadPct),
    // Convert 100 home units: you lose spreadPct of that value.
    lossPer100: 100 * spreadPct,
  }));
}

/** Per-diem spending tiers. */
export type PerDiemTier = "budget" | "standard" | "comfort";

export interface PerDiemDaily {
  lodging: number;
  meals: number;
  transport: number;
  buffer: number;
  total: number;
}

export interface PerDiemResult {
  daily: PerDiemDaily;
  total: number;
}

/**
 * Grounded daily defaults in the HOME currency, loosely based on US State Dept
 * per-diem tiers (lodging + M&IE) plus local transport and a contingency buffer.
 */
const TIER_DAILY: Record<PerDiemTier, Omit<PerDiemDaily, "total">> = {
  // ~$120/day
  budget: { lodging: 65, meals: 35, transport: 10, buffer: 10 },
  // ~$250/day
  standard: { lodging: 140, meals: 70, transport: 20, buffer: 20 },
  // ~$450/day
  comfort: { lodging: 260, meals: 130, transport: 35, buffer: 25 },
};

/**
 * Estimate total trip spend for a given number of days and tier.
 * Returns the daily breakdown (in home currency) and the grand total.
 */
export function perDiem(days: number, tier: PerDiemTier): PerDiemResult {
  const base = TIER_DAILY[tier];
  const dailyTotal = base.lodging + base.meals + base.transport + base.buffer;
  const safeDays = Number.isFinite(days) && days > 0 ? Math.floor(days) : 0;
  return {
    daily: { ...base, total: dailyTotal },
    total: dailyTotal * safeDays,
  };
}

/** One row of a cash denomination breakdown. */
export interface DenominationRow {
  note: number;
  count: number;
}

/**
 * Greedy decomposition of a cash target into the given currency's banknotes.
 * `notes` should be sorted descending (the JSON data is). Any remainder smaller
 * than the smallest note is dropped (no coins modeled).
 */
export function denominations(
  amount: number,
  _currency: string,
  notes: number[],
): DenominationRow[] {
  if (!Number.isFinite(amount) || amount <= 0 || notes.length === 0) return [];
  const sorted = [...notes].sort((a, b) => b - a);
  let remaining = Math.floor(amount);
  const rows: DenominationRow[] = [];
  for (const note of sorted) {
    if (note <= 0) continue;
    const count = Math.floor(remaining / note);
    if (count > 0) {
      rows.push({ note, count });
      remaining -= count * note;
    }
  }
  return rows;
}

/** Most jurisdictions require declaring cash at or above this home-currency value. */
export const CASH_DECLARATION_THRESHOLD = 10000;

/**
 * Whether a cash amount (in destination currency) meets/exceeds the typical
 * ~US$10,000 / EUR10,000 declaration threshold. `midRate` is destination units
 * per 1 home unit, used to convert the threshold into destination terms.
 */
export function exceedsDeclarationThreshold(
  destinationAmount: number,
  midRate: number,
): boolean {
  if (!Number.isFinite(midRate) || midRate <= 0) return false;
  const thresholdInDestination = CASH_DECLARATION_THRESHOLD * midRate;
  return destinationAmount >= thresholdInDestination;
}
