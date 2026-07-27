import { cookies, headers } from "next/headers";
import { DEFAULT_CURRENCY, type Currency } from "./tiers";
import { currencyForCountry, parseCurrency } from "./countries";

/** Set by the currency switcher so a visitor can override what geo picked. */
export const CURRENCY_COOKIE = "currency";

export * from "./countries";

/** Two-letter country from whatever CDN sits in front of us. Null in local dev,
 *  which is why the cookie override exists. */
export async function requestCountry(): Promise<string | null> {
  const h = await headers();
  return (
    h.get("x-vercel-ip-country") ??
    h.get("cf-ipcountry") ??
    h.get("x-country-code") ??
    null
  );
}

/** The currency to price in: an explicit choice beats geo, and both are clamped
 *  to `allowed` — we must never display a price we can't actually charge. */
export async function resolveCurrency(allowed: Currency[]): Promise<Currency> {
  const clamp = (c: Currency | null) => (c && allowed.includes(c) ? c : null);

  const store = await cookies();
  const chosen = clamp(parseCurrency(store.get(CURRENCY_COOKIE)?.value));
  if (chosen) return chosen;

  const geo = clamp(currencyForCountry(await requestCountry()));
  if (geo) return geo;

  return clamp(DEFAULT_CURRENCY) ?? allowed[0] ?? DEFAULT_CURRENCY;
}
