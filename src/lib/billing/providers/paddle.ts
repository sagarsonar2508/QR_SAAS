import { createHmac, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, billingCustomers, billingPlans } from "@/db";
import { TIERS, type Currency, type Period, type Tier } from "../tiers";
import { countriesFor } from "../countries";
import {
  MULTI_CURRENCY,
  type BillingProvider,
  type CheckoutRequest,
  type CheckoutResult,
  type WebhookDelivery,
} from "../provider";

const PROVIDER = "paddle";

/** Paddle's base currency for our prices. Every other currency is expressed as
 *  a per-country override on the same price object. */
const BASE_CURRENCY: Currency = "USD";

/** Currencies Paddle settles for us. INR is Razorpay's job — Paddle is the
 *  rest-of-world provider. */
const PADDLE_CURRENCIES: Currency[] = ["USD", "EUR", "GBP", "AUD", "CAD"];

function apiKey() {
  return process.env.PADDLE_API_KEY!;
}

/** Sandbox and live are separate environments with separate keys and separate
 *  data. PADDLE_ENV picks which one; default to sandbox so a missing env var
 *  can never accidentally charge a real card. */
function baseUrl() {
  return process.env.PADDLE_ENV === "live"
    ? "https://api.paddle.com"
    : "https://sandbox-api.paddle.com";
}

async function api<T>(
  path: string,
  init?: { method?: string; body?: object }
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${apiKey()}`,
      ...(init?.body ? { "Content-Type": "application/json" } : {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Paddle ${path} failed (${res.status}): ${text}`);
  }
  const json = (await res.json()) as { data: T };
  return json.data;
}

/** Paddle prices carry one base amount plus per-country overrides, so a single
 *  price object serves every currency we sell in. Built from COUNTRY_CURRENCY so
 *  the amount a visitor is quoted and the amount Paddle charges come from the
 *  same map. */
function unitPriceOverrides(tier: Exclude<Tier, "free">, period: Period) {
  return PADDLE_CURRENCIES.filter((c) => c !== BASE_CURRENCY)
    .map((currency) => ({
      country_codes: countriesFor(currency),
      unit_price: {
        amount: String(TIERS[tier].prices[currency][period]),
        currency_code: currency,
      },
    }))
    .filter((o) => o.country_codes.length > 0);
}

/** Product + price are created lazily on first checkout and cached in the DB,
 *  so no manual dashboard setup is needed. The cache row is scoped to
 *  MULTI_CURRENCY because one price covers all of them. */
async function ensurePrice(
  tier: Exclude<Tier, "free">,
  period: Period
): Promise<string> {
  const [existing] = await db
    .select()
    .from(billingPlans)
    .where(
      and(
        eq(billingPlans.provider, PROVIDER),
        eq(billingPlans.tier, tier),
        eq(billingPlans.period, period),
        eq(billingPlans.currency, MULTI_CURRENCY)
      )
    )
    .limit(1);
  if (existing) return existing.providerPlanId;

  const product = await api<{ id: string }>("/products", {
    body: {
      name: `QRVeda ${TIERS[tier].name}`,
      // Digital SaaS. This drives which tax rates Paddle applies, so it must
      // match what you actually sell.
      tax_category: "saas",
    },
  });

  const price = await api<{ id: string }>("/prices", {
    body: {
      product_id: product.id,
      description: `QRVeda ${TIERS[tier].name} (${period})`,
      unit_price: {
        amount: String(TIERS[tier].prices[BASE_CURRENCY][period]),
        currency_code: BASE_CURRENCY,
      },
      unit_price_overrides: unitPriceOverrides(tier, period),
      billing_cycle: { interval: period === "monthly" ? "month" : "year", frequency: 1 },
      quantity: { minimum: 1, maximum: 1 },
    },
  });

  await db
    .insert(billingPlans)
    .values({
      provider: PROVIDER,
      tier,
      period,
      currency: MULTI_CURRENCY,
      providerPlanId: price.id,
    })
    .onConflictDoNothing();
  return price.id;
}

/** Reuse one Paddle customer per user so repeat purchases and the portal both
 *  resolve to the same record. */
async function ensureCustomer(user: {
  id: string;
  email: string;
  name: string;
}): Promise<string> {
  const [existing] = await db
    .select()
    .from(billingCustomers)
    .where(
      and(
        eq(billingCustomers.userId, user.id),
        eq(billingCustomers.provider, PROVIDER)
      )
    )
    .limit(1);
  if (existing) return existing.providerCustomerId;

  let customerId: string;
  try {
    const created = await api<{ id: string }>("/customers", {
      body: { email: user.email, name: user.name },
    });
    customerId = created.id;
  } catch (err) {
    // Paddle rejects a duplicate email with 409; recover the existing record
    // rather than dead-ending the checkout.
    const match = await api<{ id: string }[]>(
      `/customers?email=${encodeURIComponent(user.email)}`
    ).catch(() => null);
    if (!match?.[0]?.id) throw err;
    customerId = match[0].id;
  }

  await db
    .insert(billingCustomers)
    .values({ userId: user.id, provider: PROVIDER, providerCustomerId: customerId })
    .onConflictDoNothing();
  return customerId;
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** `Paddle-Signature: ts=<unix>;h1=<hex>` over `${ts}:${rawBody}`. */
function verifySignature(rawBody: string, header: string | null): boolean {
  const secret = process.env.PADDLE_WEBHOOK_SECRET;
  if (!secret || !header) return false;

  const parts = Object.fromEntries(
    header.split(";").map((p) => {
      const i = p.indexOf("=");
      return [p.slice(0, i).trim(), p.slice(i + 1).trim()];
    })
  );
  const ts = parts.ts;
  const h1 = parts.h1;
  if (!ts || !h1) return false;

  // Reject stale deliveries so a captured payload can't be replayed later.
  // Paddle's own SDKs default to 5s; we allow more room for retries and clock
  // skew, and the webhook_events table catches genuine duplicates.
  const ageSeconds = Math.abs(Date.now() / 1000 - Number(ts));
  if (!Number.isFinite(ageSeconds) || ageSeconds > 300) return false;

  const expected = createHmac("sha256", secret).update(`${ts}:${rawBody}`).digest("hex");
  return safeEqual(expected, h1);
}

type PaddleEvent = {
  event_id: string;
  event_type: string;
  data: {
    id: string;
    status: string;
    customer_id?: string | null;
    currency_code?: string | null;
    current_billing_period?: { ends_at?: string | null } | null;
    scheduled_change?: { action?: string } | null;
    custom_data?: Record<string, string> | null;
  };
};

/** Paddle status → our vocabulary. `entitled` is what actually gates the plan. */
function mapStatus(e: PaddleEvent): { status: string; entitled: boolean } | null {
  const { status, scheduled_change } = e.data;
  switch (status) {
    case "active":
      // A cancellation scheduled for period end still leaves them entitled now.
      return scheduled_change?.action === "cancel"
        ? { status: "cancelling", entitled: true }
        : { status: "active", entitled: true };
    case "trialing":
      return { status: "trialing", entitled: true };
    case "past_due":
      // Paddle keeps dunning; keep them on the plan until it actually cancels.
      return { status: "past_due", entitled: true };
    case "paused":
      return { status: "paused", entitled: false };
    case "canceled":
      return { status: "cancelled", entitled: false };
    default:
      return null;
  }
}

export const paddleProvider: BillingProvider = {
  id: PROVIDER,

  supportedCurrencies: PADDLE_CURRENCIES,
  hasPortal: true,

  isConfigured() {
    return Boolean(process.env.PADDLE_API_KEY && process.env.PADDLE_WEBHOOK_SECRET);
  },

  async createCheckout({
    tier,
    period,
    currency,
    user,
    returnUrl,
  }: CheckoutRequest): Promise<CheckoutResult> {
    if (!PADDLE_CURRENCIES.includes(currency)) {
      throw new Error(`Paddle is not configured to charge ${currency}.`);
    }

    const [priceId, customerId] = await Promise.all([
      ensurePrice(tier, period),
      ensureCustomer(user),
    ]);

    const txn = await api<{ checkout?: { url?: string | null } | null }>(
      "/transactions",
      {
        body: {
          items: [{ price_id: priceId, quantity: 1 }],
          customer_id: customerId,
          currency_code: currency,
          collection_mode: "automatic",
          // Carried through onto the subscription, so the webhook can attribute
          // it even though no local row exists until payment lands.
          custom_data: { userId: user.id, tier, period, currency },
          checkout: { url: returnUrl },
        },
      }
    );

    const url = txn.checkout?.url;
    if (!url) {
      throw new Error(
        "Paddle returned no checkout URL — set a default payment link under " +
          "Checkout settings in the Paddle dashboard."
      );
    }

    // Paddle creates the subscription only once the payment completes, so there
    // is nothing to persist yet; the first webhook writes the row.
    return { session: { kind: "redirect", url }, providerSubscriptionId: null };
  },

  /** Paddle checkout returns via redirect, not a signed client callback. */
  verifyClientCallback() {
    return null;
  },

  parseWebhook(rawBody, headers): WebhookDelivery | null {
    if (!verifySignature(rawBody, headers.get("paddle-signature"))) return null;

    const event = JSON.parse(rawBody) as PaddleEvent;
    const base = { eventId: event.event_id, eventType: event.event_type };

    if (!event.event_type?.startsWith("subscription.") || !event.data?.id) {
      return { ...base, state: null };
    }

    const mapped = mapStatus(event);
    if (!mapped) return { ...base, state: null };

    const custom = event.data.custom_data ?? {};
    const endsAt = event.data.current_billing_period?.ends_at;

    return {
      ...base,
      state: {
        providerSubscriptionId: event.data.id,
        status: mapped.status,
        entitled: mapped.entitled,
        currentPeriodEnd: endsAt ? new Date(endsAt) : null,
        claim: {
          userId: custom.userId,
          providerCustomerId: event.data.customer_id ?? undefined,
          tier: custom.tier as Tier | undefined,
          period: custom.period as Period | undefined,
          currency: (event.data.currency_code as Currency | undefined) ??
            (custom.currency as Currency | undefined),
        },
      },
    };
  },

  async cancelSubscription(providerSubscriptionId) {
    await api(`/subscriptions/${providerSubscriptionId}/cancel`, {
      body: { effective_from: "next_billing_period" },
    });
  },

  async portalUrl(userId) {
    const [customer] = await db
      .select()
      .from(billingCustomers)
      .where(
        and(
          eq(billingCustomers.userId, userId),
          eq(billingCustomers.provider, PROVIDER)
        )
      )
      .limit(1);
    if (!customer) return null;

    // Portal sessions are short-lived and must not be cached — mint one per click.
    const session = await api<{ urls?: { general?: { overview?: string } } }>(
      `/customers/${customer.providerCustomerId}/portal-sessions`,
      { method: "POST", body: {} }
    );
    return session.urls?.general?.overview ?? null;
  },
};
