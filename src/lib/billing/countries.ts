import { CURRENCIES, DEFAULT_CURRENCY, type Currency } from "./tiers";

const EUROZONE = [
  "AT", "BE", "HR", "CY", "EE", "FI", "FR", "DE", "GR", "IE",
  "IT", "LV", "LT", "LU", "MT", "NL", "PT", "SK", "SI", "ES",
];

/** Countries billed in something other than DEFAULT_CURRENCY.
 *
 *  Single source of truth for geography → money. It decides what a visitor is
 *  quoted, and the Paddle adapter derives its per-country price overrides from
 *  the same map, so the quote and the charge cannot drift apart. */
export const COUNTRY_CURRENCY: Record<string, Currency> = {
  IN: "INR",
  GB: "GBP",
  AU: "AUD",
  CA: "CAD",
  ...Object.fromEntries(EUROZONE.map((c) => [c, "EUR" as Currency])),
};

/** Countries quoted in `currency`. Empty for DEFAULT_CURRENCY, which is the
 *  fallback for the entire rest of the world rather than an explicit list. */
export function countriesFor(currency: Currency): string[] {
  return Object.entries(COUNTRY_CURRENCY)
    .filter(([, c]) => c === currency)
    .map(([country]) => country);
}

export function currencyForCountry(country: string | null | undefined): Currency {
  if (!country) return DEFAULT_CURRENCY;
  return COUNTRY_CURRENCY[country.toUpperCase()] ?? DEFAULT_CURRENCY;
}

export function parseCurrency(value: string | null | undefined): Currency | null {
  const upper = value?.toUpperCase();
  return CURRENCIES.find((c) => c === upper) ?? null;
}

/** The single request header trusted for visitor geolocation.
 *
 *  Exactly one, deliberately. This header decides which currency a customer is
 *  quoted and charged in, and any header a client can send is a header a client
 *  can forge — so accepting a list of fallbacks means accepting the weakest one.
 *  The CDN must overwrite it on the way in (see docs/BILLING.md).
 *
 *  Default matches Cloudflare. Set GEO_COUNTRY_HEADER for another CDN, e.g.
 *  `x-vercel-ip-country` on Vercel. */
export function geoHeaderName(): string {
  return (process.env.GEO_COUNTRY_HEADER ?? "cf-ipcountry").toLowerCase();
}

/** Two-letter country from the trusted header, or null.
 *
 *  Anything that isn't a bare ISO-3166 alpha-2 code is rejected rather than
 *  passed along — a forged header can carry a list ("IN, SG"), an empty string,
 *  or junk, and none of those should reach the currency lookup. */
export function countryFromHeaders(h: Headers): string | null {
  const raw = h.get(geoHeaderName());
  if (!raw) return null;
  const code = raw.trim().toUpperCase();
  return /^[A-Z]{2}$/.test(code) ? code : null;
}
