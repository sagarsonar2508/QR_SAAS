import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, subscriptions, users } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { billingConfigured, verifyCheckoutSignature } from "@/lib/billing";

// Called by the client right after Razorpay Checkout succeeds. The webhook is
// the source of truth for renewals; this gives instant activation in the UI.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!billingConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 400 });
  }

  const body = await req.json().catch(() => null);
  const paymentId = body?.razorpay_payment_id;
  const subscriptionId = body?.razorpay_subscription_id;
  const signature = body?.razorpay_signature;
  if (!paymentId || !subscriptionId || !signature) {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  if (!verifyCheckoutSignature(paymentId, subscriptionId, signature)) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.razorpaySubscriptionId, subscriptionId))
    .limit(1);
  if (!sub || sub.userId !== user.id) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  await db
    .update(subscriptions)
    .set({ status: "active", updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id));
  await db.update(users).set({ plan: sub.tier }).where(eq(users.id, user.id));

  return NextResponse.json({ ok: true, plan: sub.tier });
}
