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
