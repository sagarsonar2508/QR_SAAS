import { and, eq } from "drizzle-orm";
import { db, billingPlans } from "@/db";
import { TIERS, type Currency, type Period, type Tier } from "../tiers";
import type {
  BillingProvider,
  CheckoutRequest,
  CheckoutResult,
  SubscriptionState,
  WebhookDelivery,
} from "../provider";

const PROVIDER = "paypal";

/**
 * PayPal Subscriptions — the rest-of-world rail.
 *
 * WHY NOT RAZORPAY: Razorpay is the INR provider and settles into an Indian
 * bank account. Its recurring mandates are INR-only, so "turn on Razorpay
 * international" does not produce a foreign-currency subscription — it produces
 * foreign-currency *one-time orders*, which is not what this app sells. On top
 * of that, this Razorpay account is shared with daredate.in and cheekydeck.com
 * and carries an account-level international-CARD block (probe payment
 * `pay_TPRw54u9Tt8jwr` → `international_transaction_not_allowed`), so foreign
 * cards cannot reach it at all.
 *
 * WHY NOT THE SIBLING SITES' PAYPAL CODE VERBATIM: daredate.in and
 * cheekydeck.com sell one-time passes and use Orders v2 (create → capture).
 * QRVeda sells auto-renewing plans, which is a different API — catalog product
 * → billing plan → subscription, with PayPal doing the recurring charge. The
 * auth, token cache and webhook-verification approach are ported from
 * `dare_web/lib/paypal.ts`; the money-movement calls are not.
 *
 * USD ONLY, deliberately. The PayPal account holds USD, and a capture in a
 * currency the account does not hold lands as PENDING with
 * `RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION` unless auto-convert is turned
 * on — the bug that silently failed every EUR sale on daredate.in. Quoting the
 * whole non-Indian world in USD sidesteps it entirely, and one currency is one
 * pricing decision instead of five.
 */

const LIVE_BASE = "https://api-m.paypal.com";
const SANDBOX_BASE = "https://api-m.sandbox.paypal.com";

/** Sandbox unless PAYPAL_ENV is exactly "live", so a half-finished config fails
 *  against test credentials rather than quietly charging real cards. */
function isLive() {
  return process.env.PAYPAL_ENV === "live";
}

function baseUrl() {
  return isLive() ? LIVE_BASE : SANDBOX_BASE;
}

function clientId() {
  return process.env.PAYPAL_CLIENT_ID!;
}
function clientSecret() {
  return process.env.PAYPAL_CLIENT_SECRET!;
}

/** PayPal settles these for us. USD only — see the note at the top of the file. */
const PAYPAL_CURRENCIES: Currency[] = ["USD"];

// ─── Access token ────────────────────────────────────────
// Tokens live ~9 hours. Cached per base URL: a live token is useless against
// the sandbox host and vice versa, so one shared slot would thrash on an env
// flip during development.

const tokenCache = new Map<string, { value: string; expiresAt: number }>();

async function accessToken(): Promise<string> {
  const base = baseUrl();
  const hit = tokenCache.get(base);
  if (hit && Date.now() < hit.expiresAt) return hit.value;

  const res = await fetch(`${base}/v1/oauth2/token`, {
    method: "POST",
    headers: {
      Authorization:
        "Basic " +
        Buffer.from(`${clientId()}:${clientSecret()}`).toString("base64"),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: "grant_type=client_credentials",
    cache: "no-store",
  });

  const body = (await res.json().catch(() => ({}))) as {
    access_token?: string;
    expires_in?: number;
    error_description?: string;
  };
  if (!res.ok || !body.access_token) {
    throw new Error(
      `PayPal auth failed (${res.status}): ${body.error_description ?? "no token"}`
    );
  }

  // Refresh a minute early so we never race the expiry mid-checkout.
  tokenCache.set(base, {
    value: body.access_token,
    expiresAt: Date.now() + ((body.expires_in ?? 32400) - 60) * 1000,
  });
  return body.access_token;
}

async function api<T>(
  path: string,
  init?: { method?: string; body?: object; headers?: Record<string, string> }
): Promise<T> {
  const res = await fetch(`${baseUrl()}${path}`, {
    method: init?.method ?? (init?.body ? "POST" : "GET"),
    headers: {
      Authorization: `Bearer ${await accessToken()}`,
      "Content-Type": "application/json",
      ...(init?.headers ?? {}),
    },
    body: init?.body ? JSON.stringify(init.body) : undefined,
    cache: "no-store",
  });

  // 204 on cancel/suspend — there is no body to parse.
  if (res.status === 204) return undefined as T;

  const body = (await res.json().catch(() => ({}))) as Record<string, unknown>;
  if (!res.ok) {
    // PayPal puts the actionable part in `details`, not `message`.
    const detail = Array.isArray(body.details) ? JSON.stringify(body.details) : "";
    throw new Error(
      `PayPal ${path} failed (${res.status}): ${body.message ?? ""} ${detail}`.trim()
    );
  }
  return body as T;
}

// ─── Catalog product + billing plan ──────────────────────

/**
 * Product and plan are created lazily on first subscribe and cached in
 * `billing_plans`, so no manual dashboard setup is needed — same approach as
 * the Razorpay adapter.
 *
 * The cache row is scoped to USD rather than MULTI_CURRENCY: a PayPal billing
 * plan carries exactly one currency, so a second currency would need its own
 * plan object, not an override on this one.
 */
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
        eq(billingPlans.currency, "USD")
      )
    )
    .limit(1);
  if (existing) return existing.providerPlanId;

  const product = await api<{ id: string }>("/v1/catalogs/products", {
    body: {
      name: `QRVeda ${TIERS[tier].name}`,
      type: "SERVICE",
      // PayPal's category list; SOFTWARE is the closest fit for SaaS.
      category: "SOFTWARE",
    },
  });

  // Amounts live in minor units here but PayPal wants major units as a string,
  // so the /100 happens once, at the boundary.
  const amount = (TIERS[tier].prices.USD[period] / 100).toFixed(2);

  const plan = await api<{ id: string }>("/v1/billing/plans", {
    body: {
      product_id: product.id,
      name: `QRVeda ${TIERS[tier].name} (${period})`,
      status: "ACTIVE",
      billing_cycles: [
        {
          frequency: {
            interval_unit: period === "monthly" ? "MONTH" : "YEAR",
            interval_count: 1,
          },
          tenure_type: "REGULAR",
          sequence: 1,
          // 0 means bill forever. Razorpay demands a finite count and gets 10
          // years; PayPal does not, so there is no artificial end date here.
          total_cycles: 0,
          pricing_scheme: {
            fixed_price: { value: amount, currency_code: "USD" },
          },
        },
      ],
      payment_preferences: {
        auto_bill_outstanding: true,
        setup_fee_failure_action: "CANCEL",
        // After 3 failed retries PayPal suspends rather than cancels, so a
        // customer who fixes their card keeps the same subscription.
        payment_failure_threshold: 3,
      },
    },
  });

  await db
    .insert(billingPlans)
    .values({
      provider: PROVIDER,
      tier,
      period,
      currency: "USD",
      providerPlanId: plan.id,
    })
    .onConflictDoNothing();
  return plan.id;
}

// ─── Webhooks ────────────────────────────────────────────

/**
 * Ask PayPal whether a delivery is genuine.
 *
 * Unlike Razorpay and Paddle there is no local HMAC to check — PayPal signs
 * with a rotating cert, so verification means handing the transmission headers
 * plus the parsed event back to PayPal. This is why `parseWebhook` is async on
 * the BillingProvider interface. A handler that skips this is an
 * unauthenticated endpoint that hands out paid plans to anyone who can POST
 * JSON at it.
 *
 * `event` must be the PARSED body: PayPal re-serialises it on their side, so
 * passing the raw string fails verification even on a valid delivery.
 */
async function verifyWebhook(headers: Headers, event: unknown): Promise<boolean> {
  const webhookId = process.env.PAYPAL_WEBHOOK_ID;
  if (!webhookId) return false;

  const required = {
    auth_algo: headers.get("paypal-auth-algo"),
    cert_url: headers.get("paypal-cert-url"),
    transmission_id: headers.get("paypal-transmission-id"),
    transmission_sig: headers.get("paypal-transmission-sig"),
    transmission_time: headers.get("paypal-transmission-time"),
  };
  if (Object.values(required).some((v) => !v)) return false;

  try {
    const res = await api<{ verification_status?: string }>(
      "/v1/notifications/verify-webhook-signature",
      { body: { ...required, webhook_id: webhookId, webhook_event: event } }
    );
    return res.verification_status === "SUCCESS";
  } catch (err) {
    // Failing to REACH PayPal is not proof of forgery, but "unverified" is the
    // only safe reading — better to drop a real event (PayPal retries for
    // three days) than to grant a plan on an unchecked one.
    console.error("[paypal] webhook verification error:", err);
    return false;
  }
}

type PayPalSubscription = {
  id: string;
  status: string;
  custom_id?: string | null;
  billing_info?: { next_billing_time?: string | null } | null;
  subscriber?: { payer_id?: string | null } | null;
};

type PayPalEvent = {
  id: string;
  event_type: string;
  resource?: Record<string, unknown> | null;
};

/** PayPal status → our vocabulary. `entitled` is what actually gates the plan. */
function mapStatus(status: string): { status: string; entitled: boolean } | null {
  switch (status) {
    case "ACTIVE":
      return { status: "active", entitled: true };
    // PayPal suspends after the payment-failure threshold. Treated like Paddle's
    // past_due: keep them on the plan while they fix the card, because losing
    // access is how a recoverable billing hiccup becomes a cancellation.
    case "SUSPENDED":
      return { status: "past_due", entitled: true };
    case "CANCELLED":
      // NOT a same-day downgrade. PayPal cancels immediately and sends no
      // further event, but the customer has already paid through the current
      // period — so this is recorded as "cancelling" with the paid-through date,
      // and recomputeUserPlan drops them once that date passes.
      return { status: "cancelling", entitled: true };
    case "EXPIRED":
      return { status: "expired", entitled: false };
    // APPROVAL_PENDING / APPROVED mean the buyer has not finished paying.
    default:
      return null;
  }
}

/** Unpack the userId/tier/period we stashed on the subscription at create time. */
function claimFrom(sub: PayPalSubscription): SubscriptionState["claim"] {
  let custom: Record<string, string> = {};
  try {
    custom = sub.custom_id ? JSON.parse(sub.custom_id) : {};
  } catch {
    // A custom_id we did not write, or one truncated by PayPal's 127-char
    // limit. Attribution falls through to payer_id below.
  }
  return {
    userId: custom.userId,
    providerCustomerId: sub.subscriber?.payer_id ?? undefined,
    tier: custom.tier as Tier | undefined,
    period: custom.period as Period | undefined,
    currency: "USD" as const,
  };
}

function stateFrom(sub: PayPalSubscription): SubscriptionState | null {
  const mapped = mapStatus(sub.status);
  if (!mapped || !sub.id) return null;
  const next = sub.billing_info?.next_billing_time;
  return {
    providerSubscriptionId: sub.id,
    status: mapped.status,
    entitled: mapped.entitled,
    currentPeriodEnd: next ? new Date(next) : null,
    claim: claimFrom(sub),
  };
}

export const paypalProvider: BillingProvider = {
  id: PROVIDER,

  supportedCurrencies: PAYPAL_CURRENCIES,

  // PayPal has no per-customer portal API we can mint a scoped link into —
  // subscribers manage billing inside their own PayPal account. The app's own
  // cancel button is the self-service path, same as Razorpay.
  hasPortal: false,

  isConfigured() {
    return Boolean(process.env.PAYPAL_CLIENT_ID && process.env.PAYPAL_CLIENT_SECRET);
  },

  async createCheckout({
    tier,
    period,
    currency,
    user,
    returnUrl,
  }: CheckoutRequest): Promise<CheckoutResult> {
    if (!PAYPAL_CURRENCIES.includes(currency)) {
      throw new Error(`PayPal is not configured to charge ${currency}.`);
    }

    const planId = await ensurePlan(tier, period);

    const sub = await api<{
      id: string;
      status: string;
      links?: { rel: string; href: string }[];
    }>("/v1/billing/subscriptions", {
      // PayPal deduplicates on this header, so a double-clicked Upgrade button
      // cannot mint two subscriptions for the same user, plan and period.
      headers: { "PayPal-Request-Id": `${user.id}:${tier}:${period}` },
      body: {
        plan_id: planId,
        // Attribution for the webhook, which arrives before any local row on a
        // hosted-checkout flow. Capped at PayPal's 127 characters.
        custom_id: JSON.stringify({ userId: user.id, tier, period }).slice(0, 127),
        subscriber: { email_address: user.email },
        application_context: {
          brand_name: "QRVeda",
          user_action: "SUBSCRIBE_NOW",
          // Digital SaaS — asking for a shipping address is a checkout step
          // that only loses buyers.
          shipping_preference: "NO_SHIPPING",
          return_url: returnUrl,
          cancel_url: returnUrl.replace("checkout=complete", "checkout=cancelled"),
        },
      },
    });

    const approve = sub.links?.find((l) => l.rel === "approve")?.href;
    if (!approve) {
      throw new Error("PayPal returned no approval link for the subscription.");
    }

    // PayPal mints the subscription up front (status APPROVAL_PENDING), so the
    // id is persisted now and the webhook activates it — same shape as Razorpay,
    // unlike Paddle where the row only exists after payment.
    return {
      session: { kind: "redirect", url: approve },
      providerSubscriptionId: sub.id,
    };
  },

  /** PayPal returns via redirect, not a signed client callback. */
  verifyClientCallback() {
    return null;
  },

  async parseWebhook(rawBody, headers): Promise<WebhookDelivery | null> {
    const event = JSON.parse(rawBody) as PayPalEvent;
    if (!(await verifyWebhook(headers, event))) return null;

    const base = { eventId: event.id, eventType: event.event_type };

    // Renewals arrive as a sale, not a subscription update, and the sale
    // payload carries no next_billing_time. Re-read the subscription so the
    // renewed period end is the one PayPal actually holds.
    if (event.event_type === "PAYMENT.SALE.COMPLETED") {
      const subId = (event.resource as { billing_agreement_id?: string } | null)
        ?.billing_agreement_id;
      if (!subId) return { ...base, state: null };
      const sub = await api<PayPalSubscription>(
        `/v1/billing/subscriptions/${subId}`
      ).catch(() => null);
      return { ...base, state: sub ? stateFrom(sub) : null };
    }

    if (!event.event_type?.startsWith("BILLING.SUBSCRIPTION.")) {
      return { ...base, state: null };
    }

    const sub = event.resource as PayPalSubscription | null;
    if (!sub?.id) return { ...base, state: null };
    return { ...base, state: stateFrom(sub) };
  },

  async cancelSubscription(providerSubscriptionId) {
    // PayPal stops billing immediately — there is no cancel-at-cycle-end as
    // there is on Razorpay and Paddle. The customer keeps the plan until the
    // period they already paid for runs out; that is enforced on our side, via
    // the "cancelling" status recorded from the CANCELLED webhook.
    await api(`/v1/billing/subscriptions/${providerSubscriptionId}/cancel`, {
      body: { reason: "Cancelled by the customer in QRVeda." },
    });
  },

  /** No hosted portal — see `hasPortal`. */
  async portalUrl() {
    return null;
  },
};
