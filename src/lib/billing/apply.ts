import { and, eq } from "drizzle-orm";
import { db, billingCustomers, subscriptions, users, webhookEvents } from "@/db";
import { TIER_RANK, isTier, type Period, type Tier } from "./tiers";
import { parseCurrency } from "./countries";
import type { ProviderId, SubscriptionState } from "./provider";

/** Statuses that entitle a user to their paid tier right now. "created" is
 *  deliberately absent — a subscription that exists but hasn't been paid for
 *  grants nothing. */
const ENTITLING = new Set(["active", "cancelling", "trialing", "past_due"]);

/** Record a delivery and report whether it's new. Providers retry on any
 *  non-2xx (and sometimes on 2xx), so every handler must be replay-safe. */
export async function claimWebhookEvent(
  provider: ProviderId,
  eventId: string,
  eventType: string
): Promise<boolean> {
  const inserted = await db
    .insert(webhookEvents)
    .values({ provider, eventId, eventType })
    .onConflictDoNothing()
    .returning({ eventId: webhookEvents.eventId });
  return inserted.length > 0;
}

/** Derive users.plan from whatever subscriptions are actually live.
 *
 *  Recomputing beats writing the plan straight from the event: a late webhook
 *  for an old, cancelled subscription would otherwise downgrade a user who has
 *  already resubscribed on a new one. */
async function recomputeUserPlan(userId: string): Promise<Tier> {
  const rows = await db
    .select({ tier: subscriptions.tier, status: subscriptions.status })
    .from(subscriptions)
    .where(eq(subscriptions.userId, userId));

  const plan = rows
    .filter((r) => ENTITLING.has(r.status))
    .map((r) => r.tier)
    .filter(isTier)
    .reduce<Tier>((best, t) => (TIER_RANK[t] > TIER_RANK[best] ? t : best), "free");

  await db.update(users).set({ plan }).where(eq(users.id, userId));
  return plan;
}

/** Work out who a subscription belongs to when no local row exists yet — the
 *  normal case for hosted checkout, where the first webhook creates the row. */
async function resolveUserId(
  provider: ProviderId,
  claim: SubscriptionState["claim"]
): Promise<string | null> {
  if (claim?.userId) {
    const [user] = await db
      .select({ id: users.id })
      .from(users)
      .where(eq(users.id, claim.userId))
      .limit(1);
    if (user) return user.id;
  }

  if (claim?.providerCustomerId) {
    const [row] = await db
      .select({ userId: billingCustomers.userId })
      .from(billingCustomers)
      .where(
        and(
          eq(billingCustomers.provider, provider),
          eq(billingCustomers.providerCustomerId, claim.providerCustomerId)
        )
      )
      .limit(1);
    if (row) return row.userId;
  }

  return null;
}

export type ApplyResult =
  | { ok: true; userId: string; plan: Tier }
  | { ok: false; reason: "unattributable" };

/** Fold a provider event into our own tables: upsert the subscription row, then
 *  recompute the owner's plan. Idempotent — applying the same state twice
 *  produces the same result. */
export async function applySubscriptionState(
  provider: ProviderId,
  state: SubscriptionState
): Promise<ApplyResult> {
  const [existing] = await db
    .select()
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.provider, provider),
        eq(subscriptions.providerSubscriptionId, state.providerSubscriptionId)
      )
    )
    .limit(1);

  if (existing) {
    await db
      .update(subscriptions)
      .set({
        status: state.status,
        // Providers omit the period on some events; don't clobber a known end
        // date with null.
        ...(state.currentPeriodEnd ? { currentPeriodEnd: state.currentPeriodEnd } : {}),
        updatedAt: new Date(),
      })
      .where(eq(subscriptions.id, existing.id));

    return { ok: true, userId: existing.userId, plan: await recomputeUserPlan(existing.userId) };
  }

  const userId = await resolveUserId(provider, state.claim);
  const tier = state.claim?.tier;
  if (!userId || !isTier(tier) || tier === "free") {
    return { ok: false, reason: "unattributable" };
  }

  await db
    .insert(subscriptions)
    .values({
      userId,
      provider,
      tier,
      period: (state.claim?.period as Period) ?? "monthly",
      currency: parseCurrency(state.claim?.currency) ?? "USD",
      providerSubscriptionId: state.providerSubscriptionId,
      status: state.status,
      currentPeriodEnd: state.currentPeriodEnd,
    })
    // A concurrent delivery for the same subscription may have won the race.
    .onConflictDoNothing();

  return { ok: true, userId, plan: await recomputeUserPlan(userId) };
}
