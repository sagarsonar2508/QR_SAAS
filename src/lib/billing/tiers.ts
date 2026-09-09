export type Tier = "free" | "starter" | "business" | "agency";
export type Period = "monthly" | "yearly";

/** Billing currencies. Adding one here makes TypeScript demand a price for
 *  every tier below, so a half-filled currency can't ship.
 *
 *  TWO, deliberately. EUR/GBP/AUD/CAD were priced here but no configured
 *  provider could settle them, so visitors in those countries were quoted a
 *  fallback currency anyway. They are gone rather than left as dead prices:
 *  the PayPal account holds USD, and a subscription charged in a currency the
 *  account does not hold lands PENDING with
 *  `RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION` unless auto-convert is on —
 *  which is how every EUR sale on the sibling site silently failed. One foreign
 *  currency is also one pricing decision to get right instead of five. */
export type Currency = "INR" | "USD";

export const CURRENCIES: Currency[] = ["INR", "USD"];

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

const LOCALES: Record<Currency, string> = {
  INR: "en-IN",
  USD: "en-US",
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
