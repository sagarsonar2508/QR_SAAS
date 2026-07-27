import { createHmac, timingSafeEqual } from "node:crypto";
import { and, count, eq } from "drizzle-orm";
import { db, billingPlans, qrCodes } from "@/db";

export type Tier = "free" | "starter" | "business" | "agency";
export type Period = "monthly" | "yearly";

// Prices in paise. qrLimit is the number of QR codes a plan may hold.
export const TIERS: Record<
  Tier,
  {
    name: string;
    tagline: string;
    qrLimit: number;
    prices: Record<Period, number>;
    features: string[];
  }
> = {
  free: {
    name: "Free",
    tagline: "Try it out",
    qrLimit: 3,
    prices: { monthly: 0, yearly: 0 },
    features: ["3 dynamic QR codes", "Scan analytics", "All QR types", "PNG & SVG export"],
  },
  starter: {
    name: "Starter",
    tagline: "Freelancers & single shops",
    qrLimit: 25,
    prices: { monthly: 29900, yearly: 249900 },
    features: [
      "25 dynamic QR codes",
      "Full scan analytics",
      "All QR types incl. UPI",
      "Priority email support",
    ],
  },
  business: {
    name: "Business",
    tagline: "Restaurants & retailers",
    qrLimit: 100,
    prices: { monthly: 69900, yearly: 599900 },
    features: [
      "100 dynamic QR codes",
      "Restaurant suite",
      "Feedback & review funnel",
      "Print-ready table sheets",
    ],
  },
  agency: {
    name: "Agency",
    tagline: "Agencies & print shops",
    qrLimit: 1000,
    prices: { monthly: 299900, yearly: 2499900 },
    features: [
      "1,000 dynamic QR codes",
      "Everything in Business",
      "White-label (coming soon)",
      "Priority support",
    ],
  },
};

export const PAID_TIERS: Exclude<Tier, "free">[] = ["starter", "business", "agency"];

export function billingConfigured() {
  return Boolean(process.env.RAZORPAY_KEY_ID && process.env.RAZORPAY_KEY_SECRET);
}

function keyId() {
  return process.env.RAZORPAY_KEY_ID!;
}
function keySecret() {
  return process.env.RAZORPAY_KEY_SECRET!;
}

export async function razorpay<T>(path: string, body?: object): Promise<T> {
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
 *  so no manual dashboard setup is needed. */
export async function ensureRazorpayPlan(
  tier: Exclude<Tier, "free">,
  period: Period
): Promise<string> {
  const [existing] = await db
    .select()
    .from(billingPlans)
    .where(and(eq(billingPlans.tier, tier), eq(billingPlans.period, period)))
    .limit(1);
  if (existing) return existing.razorpayPlanId;

  const plan = await razorpay<{ id: string }>("/plans", {
    period: period === "monthly" ? "monthly" : "yearly",
    interval: 1,
    item: {
      name: `QRVeda ${TIERS[tier].name} (${period})`,
      amount: TIERS[tier].prices[period],
      currency: "INR",
    },
  });
  await db
    .insert(billingPlans)
    .values({ tier, period, razorpayPlanId: plan.id })
    .onConflictDoNothing();
  return plan.id;
}

function safeEqual(a: string, b: string) {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}

/** Signature returned by Razorpay Checkout after a subscription payment. */
export function verifyCheckoutSignature(
  paymentId: string,
  subscriptionId: string,
  signature: string
) {
  const expected = createHmac("sha256", keySecret())
    .update(`${paymentId}|${subscriptionId}`)
    .digest("hex");
  return safeEqual(expected, signature);
}

/** Signature on incoming webhooks (uses the separate webhook secret). */
export function verifyWebhookSignature(rawBody: string, signature: string) {
  const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
  if (!secret) return false;
  const expected = createHmac("sha256", secret).update(rawBody).digest("hex");
  return safeEqual(expected, signature);
}

export function qrLimitFor(plan: string): number {
  return TIERS[(plan as Tier) in TIERS ? (plan as Tier) : "free"].qrLimit;
}

/** Plan-limit check for QR creation. When billing isn't configured the app
 *  runs in pilot mode and limits aren't enforced. */
export async function checkQrQuota(
  userId: string,
  plan: string,
  adding = 1
): Promise<{ ok: boolean; used: number; limit: number }> {
  const limit = qrLimitFor(plan);
  const [row] = await db
    .select({ used: count() })
    .from(qrCodes)
    .where(eq(qrCodes.userId, userId));
  const used = Number(row?.used ?? 0);
  if (!billingConfigured()) return { ok: true, used, limit };
  return { ok: used + adding <= limit, used, limit };
}
