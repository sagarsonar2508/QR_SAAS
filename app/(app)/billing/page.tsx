import { desc, eq } from "drizzle-orm";
import { AlertTriangle, CheckCircle2 } from "lucide-react";
import { db, subscriptions } from "@/db";
import { getSessionUser } from "@/lib/auth";
import {
  TIERS,
  availableCurrencies,
  billingConfigured,
  billingCurrency,
  checkQrQuota,
  getProvider,
  isProviderId,
  type Tier,
} from "@/lib/billing";
import PlanCards from "@/components/billing/PlanCards";
import CancelButton from "@/components/billing/CancelButton";
import ManageBillingButton from "@/components/billing/ManageBillingButton";
import CurrencySwitcher from "@/components/billing/CurrencySwitcher";

export const dynamic = "force-dynamic";

/** Statuses where offering self-service management makes sense. */
const MANAGEABLE = ["active", "trialing", "past_due", "cancelling", "paused"];

export default async function BillingPage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const user = (await getSessionUser())!;
  const { checkout } = await searchParams;
  const configured = billingConfigured();
  const quota = await checkQrQuota(user.id, user.plan, 0);
  const tier = TIERS[(user.plan as Tier) in TIERS ? (user.plan as Tier) : "free"];

  const [sub] = await db
    .select()
    .from(subscriptions)
    .where(eq(subscriptions.userId, user.id))
    .orderBy(desc(subscriptions.createdAt))
    .limit(1);

  const currency = await billingCurrency();
  const tiers = (Object.keys(TIERS) as Tier[]).map((key) => ({
    key,
    name: TIERS[key].name,
    tagline: TIERS[key].tagline,
    features: TIERS[key].features,
    monthly: TIERS[key].prices[currency].monthly,
    yearly: TIERS[key].prices[currency].yearly,
  }));

  // Providers with a hosted portal own cancellation too, so we show one control
  // or the other — never both.
  const manageable = !!sub && MANAGEABLE.includes(sub.status);
  const hasPortal =
    manageable && isProviderId(sub.provider) && getProvider(sub.provider).hasPortal;

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Billing</h1>
          <p className="text-sm text-gray-500">Manage your plan and subscription</p>
        </div>
        <CurrencySwitcher currency={currency} options={availableCurrencies()} />
      </div>

      {checkout === "complete" && (
        <div className="flex items-start gap-2.5 rounded-xl border border-emerald-200 bg-emerald-50 px-4 py-3 text-sm text-emerald-800">
          <CheckCircle2 className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Payment received — thanks! Your plan activates as soon as the payment
            provider confirms it, usually within a few seconds. Refresh if this page
            still shows the old plan.
          </span>
        </div>
      )}

      {!configured && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            Payments aren&apos;t configured yet — the app is running in{" "}
            <strong>free pilot mode</strong> with no plan limits. Set{" "}
            <code>RAZORPAY_*</code> for India and <code>PADDLE_*</code> for the rest
            of the world in <code>.env</code> to go live. See{" "}
            <code>docs/BILLING.md</code>.
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
                ` · renews/ends ${sub.currentPeriodEnd.toLocaleDateString("en-GB", {
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
          {configured && hasPortal && <ManageBillingButton />}
          {configured && manageable && !hasPortal && sub.status !== "cancelling" && (
            <CancelButton />
          )}
        </div>
      </div>

      <PlanCards
        tiers={tiers}
        currency={currency}
        currentPlan={user.plan}
        configured={configured}
        email={user.email}
        name={user.name}
      />
    </div>
  );
}
