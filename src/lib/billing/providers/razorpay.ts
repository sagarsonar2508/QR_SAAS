import { createHmac, createHash, timingSafeEqual } from "node:crypto";
import { and, eq } from "drizzle-orm";
import { db, billingPlans } from "@/db";
import { TIERS, type Period, type Tier } from "../tiers";
import type {
  BillingProvider,
  CheckoutRequest,
  CheckoutResult,
  SubscriptionState,
  WebhookDelivery,
} from "../provider";

const PROVIDER = "razorpay";

function keyId() {
  return process.env.RAZORPAY_KEY_ID!;
}
function keySecret() {
  return process.env.RAZORPAY_KEY_SECRET!;
}

async function api<T>(path: string, body?: object): Promise<T> {
  const res = await fetch(`https://api.razorpay.com/v1${path}`, {
    method: body ? "POST" : "GET",
    headers: {
      Authorization:
        "Basic " + Buffer.from(`${keyId()}:${keySecret()}`).toString("base64"),
      ...(body ? { "Content-Type": "application/json" } : {}),
    },
    body: body ? JSON.stringify(body) : undefined,
  });
  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Razorpay ${path} failed (${res.status}): ${text}`);
  }
  return res.json() as Promise<T>;
}

/** Razorpay Plans are created lazily on first subscribe and cached in the DB,
 *  so no manual dashboard setup is needed. Razorpay is INR-only, so the cache
 *  row is always scoped to that currency. */
async function ensurePlan(
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
        eq(billingPlans.currency, "INR")
      )
    )
    .limit(1);
  if (existing) return existing.providerPlanId;

  const plan = await api<{ id: string }>("/plans", {
    period: period === "monthly" ? "monthly" : "yearly",
    interval: 1,
    item: {
      name: `QRVeda ${TIERS[tier].name} (${period})`,
      amount: TIERS[tier].prices.INR[period],
      currency: "INR",
    },
  });
  await db
    .insert(billingPlans)
    .values({
      provider: PROVIDER,
      tier,
      period,
      currency: "INR",
      providerPlanId: plan.id,
    })
    .onConflictDoNothing();
  return plan.id;
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

type SubscriptionEntity = {
  id: string;
  status: string;
  current_end?: number | null;
  notes?: Record<string, string> | null;
};

type WebhookPayload = {
  event: string;
  payload?: { subscription?: { entity?: SubscriptionEntity } };
};

function claimFrom(entity: SubscriptionEntity) {
  const notes = entity.notes ?? {};
  return {
    userId: notes.userId,
    tier: notes.tier as Tier | undefined,
    period: notes.period as Period | undefined,
    currency: "INR" as const,
  };
}

export const razorpayProvider: BillingProvider = {
  id: PROVIDER,

  // Razorpay settles into Indian bank accounts and cannot hold a recurring
  // mandate in any other currency.
  supportedCurrencies: ["INR"],
  hasPortal: false,

  isConfigured() {
    return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
  },

  async createCheckout({
    tier,
    period,
    currency,
    user,
  }: CheckoutRequest): Promise<CheckoutResult> {
    if (currency !== "INR") {
      throw new Error(`Razorpay cannot charge ${currency}; route to a global provider.`);
    }
    const planId = await ensurePlan(tier, period);
    const sub = await api<{ id: string }>("/subscriptions", {
      plan_id: planId,
      // Razorpay requires a fixed number of cycles; 10 years of billing.
      total_count: period === "monthly" ? 120 : 10,
      customer_notify: 1,
      notes: { userId: user.id, tier, period },
    });
    return {
      session: { kind: "razorpay", subscriptionId: sub.id, keyId: keyId() },
      providerSubscriptionId: sub.id,
    };
  },

  /** Signature Razorpay Checkout returns after a subscription payment. */
  verifyClientCallback(payload): SubscriptionState | null {
    const paymentId = payload.razorpay_payment_id;
    const subscriptionId = payload.razorpay_subscription_id;
    const signature = payload.razorpay_signature;
    if (!paymentId || !subscriptionId || !signature) return null;

    const expected = createHmac("sha256", keySecret())
      .update(`${paymentId}|${subscriptionId}`)
      .digest("hex");
    if (!safeEqual(expected, signature)) return null;

    // The callback only tells us the first charge succeeded; the webhook fills
    // in the period end.
    return {
      providerSubscriptionId: subscriptionId,
      status: "active",
      entitled: true,
      currentPeriodEnd: null,
    };
  },

  /** Webhooks are signed with a separate secret set in the Razorpay dashboard. */
  parseWebhook(rawBody, headers): WebhookDelivery | null {
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    if (!secret) return null;

    const signature = headers.get("x-razorpay-signature") ?? "";
    const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
    if (!safeEqual(expected, signature)) return null;

    const event = JSON.parse(rawBody) as WebhookPayload;
    // Razorpay carries the delivery id in a header; fall back to a body digest
    // so idempotency still holds if the header is ever absent.
    const eventId =
      headers.get("x-razorpay-event-id") ??
      createHash("sha256").update(rawBody).digest("hex");

    const entity = event.payload?.subscription?.entity;
    const base = { eventId, eventType: event.event };
    if (!entity?.id) return { ...base, state: null };

    const currentPeriodEnd = entity.current_end
      ? new Date(entity.current_end * 1000)
      : null;
    const common = {
      providerSubscriptionId: entity.id,
      currentPeriodEnd,
      claim: claimFrom(entity),
    };

    switch (event.event) {
      case "subscription.activated":
      case "subscription.charged":
      case "subscription.resumed":
        return { ...base, state: { ...common, status: "active", entitled: true } };

      case "subscription.halted":
      case "subscription.cancelled":
      case "subscription.completed":
      case "subscription.expired":
        return {
          ...base,
          state: {
            ...common,
            status: event.event.replace("subscription.", ""),
            entitled: false,
          },
        };

      default:
        return { ...base, state: null };
    }
  },

  async cancelSubscription(providerSubscriptionId) {
    // Cancels at cycle end — the user keeps the plan until the period they paid
    // for runs out (the webhook downgrades them when Razorpay fires cancelled).
    await api(`/subscriptions/${providerSubscriptionId}/cancel`, {
      cancel_at_cycle_end: 1,
    });
  },

  /** Razorpay has no hosted customer portal; the app's own cancel button is the
   *  self-service path. */
  async portalUrl() {
    return null;
  },
};
