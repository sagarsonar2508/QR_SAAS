import { NextResponse } from "next/server";
import { db, subscriptions } from "@/db";
import { getSessionUser } from "@/lib/auth";
import {
  PAID_TIERS,
  billingConfigured,
  ensureRazorpayPlan,
  razorpay,
  type Period,
  type Tier,
} from "@/lib/billing";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
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

  const planId = await ensureRazorpayPlan(tier, period);
  const sub = await razorpay<{ id: string }>("/subscriptions", {
    plan_id: planId,
    // Razorpay requires a fixed number of cycles; 10 years of billing.
    total_count: period === "monthly" ? 120 : 10,
    customer_notify: 1,
    notes: { userId: user.id, tier, period },
  });

  await db.insert(subscriptions).values({
    userId: user.id,
    tier,
    period,
    razorpaySubscriptionId: sub.id,
    status: "created",
  });

  return NextResponse.json({
    subscriptionId: sub.id,
    keyId: process.env.RAZORPAY_KEY_ID,
    tierName: tier,
  });
}
