import { desc, eq } from "drizzle-orm";
import { AlertTriangle } from "lucide-react";
import { db, subscriptions } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { TIERS, billingConfigured, checkQrQuota, type Tier } from "@/lib/billing";
import PlanCards from "@/components/billing/PlanCards";
import CancelButton from "@/components/billing/CancelButton";

export const dynamic = "force-dynamic";

export default async function BillingPage() {
  const user = (await getSessionUser())!;
  const configured = billingConfigured();
  const quota = await checkQrQuota(user.id, user.plan, 0);
  const tier = TIERS[(user.plan as Tier) in TIERS ? (user.plan as Tier) : "free"];

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  const tiers = (Object.keys(TIERS) as Tier[]).map((key) => ({
    key,
    name: TIERS[key].name,
    tagline: TIERS[key].tagline,
    features: TIERS[key].features,
    monthly: TIERS[key].prices.monthly,
    yearly: TIERS[key].prices.yearly,
  }));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
        <p className="text-sm text-gray-500">Manage your plan and subscription</p>
      </div>

      {!configured && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Payments aren&apos;t configured yet — the app is running in{" "}
            <strong>free pilot mode</strong> with no plan limits. Add{" "}
            <code>RAZORPAY_KEY_ID</code>, <code>RAZORPAY_KEY_SECRET</code> and{" "}
            <code>RAZORPAY_WEBHOOK_SECRET</code> to <code>.env</code> to go live.
          </span>
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 p-5 flex flex-wrap items-center justify-between gap-4">
        <div>
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Current plan
          </p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">{tier.name}</p>
          {sub && sub.status !== "created" && (
            <p className="text-xs text-gray-500 mt-1">
              Subscription: {sub.status}
              {sub.currentPeriodEnd &&
                ` · renews/ends ${sub.currentPeriodEnd.toLocaleDateString("en-IN", {
                  day: "numeric",
                  month: "short",
                  year: "numeric",
                })}`}
            </p>
          )}
        </div>
        <div className="text-right">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            QR codes used
          </p>
          <p className="text-xl font-bold text-gray-900 mt-0.5">
            {quota.used}
            <span className="text-sm text-gray-400 font-medium">
              {" "}
              / {configured ? quota.limit : "∞ (pilot)"}
            </span>
          </p>
          {configured && sub?.status === "active" && <CancelButton />}
        </div>
      </div>

      <PlanCards
        tiers={tiers}
        currentPlan={user.plan}
        configured={configured}
        email={user.email}
        name={user.name}
      />
    </div>
  );
}
