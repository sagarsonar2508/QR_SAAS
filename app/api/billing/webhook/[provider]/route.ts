import { NextResponse } from "next/server";
import {
  applySubscriptionState,
  claimWebhookEvent,
  getProvider,
  isProviderId,
} from "@/lib/billing";

/**
 * Provider webhooks — the source of truth for renewals, failures, upgrades and
 * cancellations. One route per provider because each signs deliveries with its
 * own scheme:
 *
 *   /api/billing/webhook/razorpay   x-razorpay-signature, HMAC over the raw body
 *   /api/billing/webhook/paddle     Paddle-Signature, HMAC over `${ts}:${body}`
 *
 * Register the matching URL and secret in each provider's dashboard.
 */
export async function POST(
  req: Request,
  { params }: { params: Promise<{ provider: string }> }
) {
  const { provider: providerParam } = await params;
  if (!isProviderId(providerParam)) {
    return NextResponse.json({ error: "Unknown provider" }, { status: 404 });
  }

  const provider = getProvider(providerParam);
  if (!provider.isConfigured()) {
    return NextResponse.json({ error: "Provider not configured" }, { status: 400 });
  }

  // Must be the untouched body — every provider signs the exact bytes sent.
  const rawBody = await req.text();

  const delivery = provider.parseWebhook(rawBody, req.headers);
  if (!delivery) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  // Claim before applying. A retry of an already-handled event returns 200
  // without touching anything.
  const isNew = await claimWebhookEvent(
    provider.id,
    delivery.eventId,
    delivery.eventType
  );
  if (!isNew) return NextResponse.json({ ok: true, duplicate: true });

  if (!delivery.state) return NextResponse.json({ ok: true, ignored: true });

  const result = await applySubscriptionState(provider.id, delivery.state);
  if (!result.ok) {
    // 200 on purpose: retrying won't help attribute an event we can't tie to a
    // user, and a non-2xx would make the provider retry it forever.
    console.error("[billing] unattributable webhook", {
      provider: provider.id,
      eventId: delivery.eventId,
      eventType: delivery.eventType,
      subscriptionId: delivery.state.providerSubscriptionId,
    });
    return NextResponse.json({ ok: true, unattributed: true });
  }

  return NextResponse.json({ ok: true, plan: result.plan });
}
