import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, subscriptions, users } from "@/db";
import { verifyWebhookSignature } from "@/lib/billing";

type WebhookPayload = {
  event: string;
  payload?: {
    subscription?: {
      entity?: { id: string; status: string; current_end?: number | null };
    };
  };
};

// Razorpay webhook — source of truth for renewals, failures and cancellations.
// Configure the endpoint + RAZORPAY_WEBHOOK_SECRET in the Razorpay dashboard.
export async function POST(req: Request) {
  const rawBody = await req.text();
  const signature = req.headers.get("x-razorpay-signature") ?? "";
  if (!verifyWebhookSignature(rawBody, signature)) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 400 });
  }

  const event = JSON.parse(rawBody) as WebhookPayload;
  const entity = event.payload?.subscription?.entity;
  if (!entity?.id) return NextResponse.json({ ok: true });

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.razorpaySubscriptionId, entity.id))
    .limit(1);
  if (!sub) return NextResponse.json({ ok: true });

  const periodEnd = entity.current_end ? new Date(entity.current_end * 1000) : null;

  switch (event.event) {
    case "subscription.activated":
    case "subscription.charged":
    case "subscription.resumed":
      await db
        .update(subscriptions)
        .set({ status: "active", currentPeriodEnd: periodEnd, updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
      await db.update(users).set({ plan: sub.tier }).where(eq(users.id, sub.userId));
      break;

    case "subscription.halted":
    case "subscription.cancelled":
    case "subscription.completed":
    case "subscription.expired": {
      const status = event.event.replace("subscription.", "");
      await db
        .update(subscriptions)
        .set({ status, updatedAt: new Date() })
        .where(eq(subscriptions.id, sub.id));
      await db.update(users).set({ plan: "free" }).where(eq(users.id, sub.userId));
      break;
    }
  }

  return NextResponse.json({ ok: true });
}
