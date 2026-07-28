import { NextResponse } from "next/server";
import { db, subscriptions } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { POLICIES, enforce } from "@/lib/rate-limit";
import {
  PAID_TIERS,
  billingConfigured,
  billingCurrency,
  providerForCurrency,
  type Period,
  type Tier,
} from "@/lib/billing";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // Each call creates objects at the payment provider, so it must be bounded.
  const limited = enforce(req, "subscribe", POLICIES.billing, user.id);
  if (limited) return limited;

  if (!billingConfigured()) {
    return NextResponse.json(
      { error: "Payments aren't configured yet — you're on the free pilot." },
      { status: 400 }
    );
  }

  const body = await req.json().catch(() => null);
  const tier = body?.tier as Exclude<Tier, "free">;
  const period: Period = body?.period === "yearly" ? "yearly" : "monthly";
  if (!PAID_TIERS.includes(tier)) {
    return NextResponse.json({ error: "Unknown plan" }, { status: 400 });
  }

  // Resolved server-side from geo/cookie, never taken from the request body —
  // otherwise a client could pick whichever currency is cheapest.
  const currency = await billingCurrency();
  const provider = providerForCurrency(currency);
  if (!provider) {
    return NextResponse.json(
      { error: `No payment provider available for ${currency}.` },
      { status: 400 }
    );
  }

  const origin = process.env.APP_URL ?? new URL(req.url).origin;

  const { session, providerSubscriptionId } = await provider.createCheckout({
    tier,
    period,
    currency,
    user: { id: user.id, email: user.email, name: user.name },
    returnUrl: `${origin}/billing?checkout=complete`,
  });

  // Providers that mint the subscription up front get a row now; hosted-checkout
  // providers create theirs from the webhook, once the user actually pays.
  if (providerSubscriptionId) {
    await db
      .insert(subscriptions)
      .values({
        userId: user.id,
        provider: provider.id,
        tier,
        period,
        currency,
        providerSubscriptionId,
        status: "created",
      })
      .onConflictDoNothing();
  }

  return NextResponse.json({ session });
}
