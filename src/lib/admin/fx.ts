import type { Currency } from "@/lib/billing/tiers";

/**
 * Static FX rates, expressed as INR per 1 unit of currency.
 *
 * Revenue arrives in six currencies; a single MRR number needs one unit. These
 * are ESTIMATES, not live rates — good enough to see whether MRR is 2 lakh or
 * 20 lakh, not good enough for accounting. Your provider payout statements are
 * the authority on what you actually earned.
 *
 * Override without a deploy by setting FX_RATES_INR to a JSON object, e.g.
 *   FX_RATES_INR='{"USD":88.5,"EUR":95.2}'
 * Unlisted currencies keep the defaults below.
 */
const DEFAULT_RATES_INR: Record<Currency, number> = {
  INR: 1,
  USD: 88,
  EUR: 95,
  GBP: 112,
  AUD: 58,
  CAD: 64,
};

/** Last time the defaults above were reviewed. Shown in the UI so a stale table
 *  is visible rather than silently wrong. */
export const RATES_REVIEWED = "July 2026";

let cached: Record<string, number> | null = null;

export function ratesInInr(): Record<string, number> {
  if (cached) return cached;

  let overrides: Record<string, number> = {};
  const raw = process.env.FX_RATES_INR;
  if (raw) {
    try {
      const parsed = JSON.parse(raw) as Record<string, unknown>;
      overrides = Object.fromEntries(
        Object.entries(parsed)
          .filter(([, v]) => typeof v === "number" && Number.isFinite(v) && v > 0)
          .map(([k, v]) => [k.toUpperCase(), v as number])
      );
    } catch {
      console.error("[admin] FX_RATES_INR is not valid JSON — using defaults");
    }
  }

  cached = { ...DEFAULT_RATES_INR, ...overrides };
  return cached;
}

export function usesOverrides(): boolean {
  return Boolean(process.env.FX_RATES_INR);
}

/** Convert a minor-unit amount (paise/cents) in `currency` to whole INR.
 *  Unknown currencies convert at 1:1 and are counted as INR rather than dropped,
 *  so revenue is never silently lost from a total. */
export function toInr(minorUnits: number, currency: string): number {
  const rate = ratesInInr()[currency.toUpperCase()] ?? 1;
  return (minorUnits / 100) * rate;
}

/** Compact INR for dashboard tiles: ₹1.2L, ₹3.4Cr — the units Indian businesses
 *  actually think in. */
export function formatInrCompact(amount: number): string {
  const abs = Math.abs(amount);
  if (abs >= 1e7) return `₹${(amount / 1e7).toFixed(2)}Cr`;
  if (abs >= 1e5) return `₹${(amount / 1e5).toFixed(2)}L`;
  if (abs >= 1e3) return `₹${(amount / 1e3).toFixed(1)}k`;
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}

export function formatInr(amount: number): string {
  return `₹${Math.round(amount).toLocaleString("en-IN")}`;
}
