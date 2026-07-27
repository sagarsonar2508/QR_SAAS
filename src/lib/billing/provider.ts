import type { Currency, Period, Tier } from "./tiers";

export type ProviderId = "razorpay" | "paddle";

/** billing_plans.currency value used by providers whose cached plan object
 *  covers every currency at once (Paddle prices carry per-country overrides,
 *  so there is one price per tier+period, not one per currency). */
export const MULTI_CURRENCY = "*";

/** What the browser needs in order to complete checkout. Modal providers
 *  (Razorpay) hand back ids for their JS SDK; hosted-checkout providers
 *  (Stripe, Paddle) hand back a URL to send the user to. */
export type CheckoutSession =
  | { kind: "razorpay"; subscriptionId: string; keyId: string }
  | { kind: "redirect"; url: string };

export type CheckoutRequest = {
  tier: Exclude<Tier, "free">;
  period: Period;
  currency: Currency;
  user: { id: string; email: string; name: string };
  /** Where the provider should send the user once checkout completes. */
  returnUrl: string;
};

export type CheckoutResult = {
  session: CheckoutSession;
  /** Set when the provider mints the subscription up front (Razorpay), so we can
   *  persist it immediately. Hosted-checkout providers only create it once the
   *  user actually pays, so they return null and let the webhook insert the row. */
  providerSubscriptionId: string | null;
};

/** Normalised subscription state, derived from a webhook or a client callback.
 *  Every provider maps its own vocabulary onto this before the routes see it. */
export type SubscriptionState = {
  providerSubscriptionId: string;
  /** Stored verbatim in subscriptions.status. */
  status: string;
  /** Whether the user should be holding the paid tier as of this event. */
  entitled: boolean;
  currentPeriodEnd: Date | null;
  /** Identifies the owner when no subscription row exists yet, which is the
   *  normal case for hosted checkout — the first webhook creates the row. */
  claim?: {
    userId?: string;
    providerCustomerId?: string;
    tier?: Tier;
    period?: Period;
    currency?: Currency;
  };
};

/** A verified webhook delivery: the event's own id (for idempotency) plus the
 *  state it implies, if it's an event we act on. */
export type WebhookDelivery = {
  eventId: string;
  eventType: string;
  state: SubscriptionState | null;
};

export interface BillingProvider {
  readonly id: ProviderId;

  /** Currencies this provider can actually settle. Razorpay is INR-only; a
   *  global provider will list the rest. Drives both checkout routing and which
   *  prices we're willing to display. */
  readonly supportedCurrencies: readonly Currency[];

  /** Whether this provider offers a hosted billing portal. When true the app
   *  hands off management entirely; when false it falls back to its own cancel
   *  button. Lets the UI branch on capability rather than on provider name. */
  readonly hasPortal: boolean;

  /** True once the provider's credentials are present in the environment. */
  isConfigured(): boolean;

  createCheckout(req: CheckoutRequest): Promise<CheckoutResult>;

  /** Verify the payload a provider's client SDK posts back immediately after
   *  checkout, for instant activation in the UI. Returns null when the signature
   *  fails, or when the provider has no such callback (redirect flows). */
  verifyClientCallback(payload: Record<string, string>): SubscriptionState | null;

  /** Verify the signature and decode the delivery. Returns null when the
   *  signature doesn't check out — callers must treat that as a rejection, not
   *  as an uninteresting event. */
  parseWebhook(rawBody: string, headers: Headers): WebhookDelivery | null;

  cancelSubscription(providerSubscriptionId: string): Promise<void>;

  /** A hosted page where the customer can manage payment method, invoices and
   *  cancellation themselves. Null for providers that don't offer one, in which
   *  case the app falls back to its own cancel button. */
  portalUrl(userId: string): Promise<string | null>;
}
