export type Tier = "free" | "starter" | "business" | "agency";
export type Period = "monthly" | "yearly";

/** Billing currencies. Adding one here makes TypeScript demand a price for
 *  every tier below, so a half-filled currency can't ship. */
export type Currency = "INR" | "USD" | "EUR" | "GBP" | "AUD" | "CAD";

export const CURRENCIES: Currency[] = ["INR", "USD", "EUR", "GBP", "AUD", "CAD"];

/** Used for visitors we can't place, and for every country without its own
 *  entry in COUNTRY_CURRENCY (see ./currency). */
export const DEFAULT_CURRENCY: Currency = "USD";

/** Prices are in each currency's minor unit — paise, cents. Every currency we
 *  support today has 100 minor units; a zero-decimal one (JPY) would need
 *  formatMoney and the provider adapters revisited.
 *
 *  These are priced per market, NOT FX-converted: ₹299 and $9 are both "the
 *  entry plan", they are not the same amount of money. Set the non-INR numbers
 *  deliberately before going live — they're a pricing decision, not a lookup.
 *
 *  qrLimit is the number of QR codes a plan may hold. */
export const TIERS: Record<
  Tier,
  {
    name: string;
    tagline: string;
    qrLimit: number;
    prices: Record<Currency, Record<Period, number>>;
    features: string[];
  }
> = {
  free: {
    name: "Free",
    tagline: "Try it out",
    qrLimit: 3,
    prices: {
      INR: { monthly: 0, yearly: 0 },
      USD: { monthly: 0, yearly: 0 },
      EUR: { monthly: 0, yearly: 0 },
      GBP: { monthly: 0, yearly: 0 },
      AUD: { monthly: 0, yearly: 0 },
      CAD: { monthly: 0, yearly: 0 },
    },
    features: ["3 dynamic QR codes", "Scan analytics", "All QR types", "PNG & SVG export"],
  },
  starter: {
    name: "Starter",
    tagline: "Freelancers & single shops",
    qrLimit: 25,
    prices: {
      INR: { monthly: 29900, yearly: 249900 },
      USD: { monthly: 900, yearly: 7500 },
      EUR: { monthly: 900, yearly: 7500 },
      GBP: { monthly: 700, yearly: 5900 },
      AUD: { monthly: 1400, yearly: 11500 },
      CAD: { monthly: 1200, yearly: 9900 },
    },
    features: [
      "25 dynamic QR codes",
      "Full scan analytics",
      "All QR types incl. UPI",
      "Priority email support",
    ],
  },
  business: {
    name: "Business",
    tagline: "Restaurants & retailers",
    qrLimit: 100,
    prices: {
      INR: { monthly: 69900, yearly: 599900 },
      USD: { monthly: 1900, yearly: 15900 },
      EUR: { monthly: 1900, yearly: 15900 },
      GBP: { monthly: 1500, yearly: 12900 },
      AUD: { monthly: 2900, yearly: 24500 },
      CAD: { monthly: 2500, yearly: 20900 },
    },
    features: [
      "100 dynamic QR codes",
      "Restaurant suite",
      "Feedback & review funnel",
      "Print-ready table sheets",
    ],
  },
  agency: {
    name: "Agency",
    tagline: "Agencies & print shops",
    qrLimit: 1000,
    prices: {
      INR: { monthly: 299900, yearly: 2499900 },
      USD: { monthly: 7900, yearly: 65900 },
      EUR: { monthly: 7900, yearly: 65900 },
      GBP: { monthly: 6500, yearly: 54500 },
      AUD: { monthly: 11900, yearly: 99900 },
      CAD: { monthly: 10500, yearly: 87900 },
    },
    features: [
      "1,000 dynamic QR codes",
      "Everything in Business",
      "White-label (coming soon)",
      "Priority support",
    ],
  },
};

export const PAID_TIERS: Exclude<Tier, "free">[] = ["starter", "business", "agency"];

/** Ordering used to pick the best plan when a user has more than one live
 *  subscription (mid-upgrade, or a stale row not yet cancelled). */
export const TIER_RANK: Record<Tier, number> = {
  free: 0,
  starter: 1,
  business: 2,
  agency: 3,
};

export function isTier(value: string | undefined | null): value is Tier {
  return !!value && value in TIERS;
}

export function qrLimitFor(plan: string): number {
  return TIERS[(plan as Tier) in TIERS ? (plan as Tier) : "free"].qrLimit;
}

export function priceFor(tier: Tier, currency: Currency, period: Period): number {
  return TIERS[tier].prices[currency][period];
}

// AUD and CAD deliberately use en-US so Intl renders the disambiguating "A$"
// and "CA$" rather than a bare "$" that reads as US dollars.
const LOCALES: Record<Currency, string> = {
  INR: "en-IN",
  USD: "en-US",
  EUR: "en-IE",
  GBP: "en-GB",
  AUD: "en-US",
  CAD: "en-US",
};

/** Formats a minor-unit amount for display. Safe in client components — this
 *  module has no server-only imports. */
export function formatMoney(minorUnits: number, currency: Currency): string {
  return new Intl.NumberFormat(LOCALES[currency], {
    style: "currency",
    currency,
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(minorUnits / 100);
}
