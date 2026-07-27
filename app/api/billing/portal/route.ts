import { NextResponse } from "next/server";
import { and, desc, eq, inArray } from "drizzle-orm";
import { db, subscriptions } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { getProvider, isProviderId } from "@/lib/billing";

// Mints a fresh, authenticated link to the provider's own billing portal, where
// the customer can update their payment method, download invoices and cancel.
// Portal links are short-lived and single-customer, so they're created per click
// and never cached.
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, user.id),
        inArray(subscriptions.status, [
          "active",
          "trialing",
          "past_due",
          "cancelling",
          "paused",
        ])
      )
    )
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);
  if (!sub || !isProviderId(sub.provider)) {
    return NextResponse.json({ error: "No subscription to manage" }, { status: 404 });
  }

  const provider = getProvider(sub.provider);
  if (!provider.isConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 400 });
  }

  const url = await provider.portalUrl(user.id);
  if (!url) {
    return NextResponse.json(
      { error: "This provider has no billing portal." },
      { status: 404 }
    );
  }

  return NextResponse.json({ url });
}
