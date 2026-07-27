import { NextResponse } from "next/server";
import { and, eq, inArray } from "drizzle-orm";
import { db, subscriptions } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { billingConfigured, razorpay } from "@/lib/billing";

// Cancels at cycle end — the user keeps the plan until the period they paid
// for runs out (the webhook downgrades them when Razorpay fires cancelled).
export async function POST() {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  if (!billingConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 400 });
  }

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.userId, user.id),
        inArray(subscriptions.status, ["active", "created"])
      )
    )
    .orderBy(subscriptions.createdAt)
    .limit(1);
  if (!sub) {
    return NextResponse.json({ error: "No active subscription" }, { status: 404 });
  }

  await razorpay(`/subscriptions/${sub.razorpaySubscriptionId}/cancel`, {
    cancel_at_cycle_end: 1,
  });
  await db
    .update(subscriptions)
    .set({ status: "cancelling", updatedAt: new Date() })
    .where(eq(subscriptions.id, sub.id));

  return NextResponse.json({ ok: true });
}
