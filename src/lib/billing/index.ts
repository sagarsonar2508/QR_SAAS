import { count, eq } from "drizzle-orm";
import { db, qrCodes } from "@/db";
import { CURRENCIES, qrLimitFor, type Currency } from "./tiers";
import { resolveCurrency } from "./currency";
import type { BillingProvider, ProviderId } from "./provider";
import { razorpayProvider } from "./providers/razorpay";
import { paddleProvider } from "./providers/paddle";

export * from "./tiers";
export * from "./provider";
export * from "./currency";
export * from "./apply";

/** Registration order is preference order: the first provider that can settle a
 *  given currency wins. Razorpay leads so Indian customers keep UPI Autopay
 *  rather than being routed to the merchant-of-record. */
const PROVIDERS: Record<ProviderId, BillingProvider> = {
  razorpay: razorpayProvider,
  paddle: paddleProvider,
};

export function getProvider(id: ProviderId): BillingProvider {
  return PROVIDERS[id];
}

export function isProviderId(value: string): value is ProviderId {
  return value in PROVIDERS;
}

function configuredProviders(): BillingProvider[] {
  return Object.values(PROVIDERS).filter((p) => p.isConfigured());
}

/** The provider that should handle a new checkout in `currency`. */
export function providerForCurrency(currency: Currency): BillingProvider | null {
  return (
    configuredProviders().find((p) => p.supportedCurrencies.includes(currency)) ?? null
  );
}

export function defaultProvider(): BillingProvider | null {
  return configuredProviders()[0] ?? null;
}

export function billingConfigured(): boolean {
  return configuredProviders().length > 0;
}

/** Currencies we can display a price in, because some configured provider can
 *  settle them. With no provider configured the app is in free pilot mode and
 *  nothing is ever charged, so every currency is fair game for display. */
export function availableCurrencies(): Currency[] {
  const configured = configuredProviders();
  if (configured.length === 0) return CURRENCIES;
  return CURRENCIES.filter((c) =>
    configured.some((p) => p.supportedCurrencies.includes(c))
  );
}

/** The currency the current request should see prices in. */
export function billingCurrency(): Promise<Currency> {
  return resolveCurrency(availableCurrencies());
}

/** Plan-limit check for QR creation. When billing isn't configured the app
 *  runs in pilot mode and limits aren't enforced. */
export async function checkQrQuota(
  userId: string,
  plan: string,
  adding = 1
): Promise<{ ok: boolean; used: number; limit: number }> {
  const limit = qrLimitFor(plan);
  const [row] = await db
    .select({ used: count() })
    .from(qrCodes)
    .where(eq(qrCodes.userId, userId));
  const used = Number(row?.used ?? 0);
  if (!billingConfigured()) return { ok: true, used, limit };
  return { ok: used + adding <= limit, used, limit };
}
