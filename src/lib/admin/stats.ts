import { and, count, desc, eq, gte, ilike, inArray, or, sql } from "drizzle-orm";
import {
  db,
  feedback,
  qrCodes,
  scans,
  subscriptions,
  suites,
  users,
  webhookEvents,
} from "@/db";
import { TIERS, type Currency, type Period, type Tier } from "@/lib/billing/tiers";
import { toInr } from "./fx";

/** Subscription statuses that represent live, paying revenue. Mirrors the
 *  entitlement set in lib/billing/apply so the admin numbers and the app's
 *  gating never disagree. */
const LIVE_STATUSES = ["active", "cancelling", "trialing", "past_due"];

export function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

export function daysAgo(n: number) {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

/** Fill gaps so a chart's x-axis is continuous rather than skipping quiet days. */
function fillDays(rows: { day: string; value: number }[], days: number) {
  const byDay = new Map(rows.map((r) => [r.day, r.value]));
  const out: { day: string; value: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
      d.getDate()
    ).padStart(2, "0")}`;
    out.push({ day: key, value: byDay.get(key) ?? 0 });
  }
  return out;
}

const n = (v: unknown) => Number(v ?? 0);

/** A subscription's contribution to monthly recurring revenue, in INR.
 *  Annual plans are divided by 12 so MRR means the same thing across periods. */
function monthlyInr(tier: string, period: string, currency: string): number {
  const t = (tier in TIERS ? tier : "free") as Tier;
  const c = currency.toUpperCase() as Currency;
  const prices = TIERS[t].prices[c] ?? TIERS[t].prices.INR;
  const p = (period === "yearly" ? "yearly" : "monthly") as Period;
  const minor = prices[p];
  return period === "yearly" ? toInr(minor, c) / 12 : toInr(minor, c);
}

// ---------------------------------------------------------------- overview

export async function overviewStats() {
  const [
    userTotals,
    qrTotals,
    scanTotals,
    liveSubs,
    planRows,
    signupRows,
    scanRows,
    activeRows,
    suiteTotals,
    feedbackTotals,
  ] = await Promise.all([
    db
      .select({
        total: count(),
        last30: sql<number>`count(*) filter (where ${users.createdAt} >= ${daysAgo(30).toISOString()})`,
        prev30: sql<number>`count(*) filter (where ${users.createdAt} >= ${daysAgo(60).toISOString()} and ${users.createdAt} < ${daysAgo(30).toISOString()})`,
        paying: sql<number>`count(*) filter (where ${users.plan} <> 'free')`,
      })
      .from(users),

    db
      .select({
        total: count(),
        last30: sql<number>`count(*) filter (where ${qrCodes.createdAt} >= ${daysAgo(30).toISOString()})`,
        dynamic: sql<number>`count(*) filter (where ${qrCodes.isDynamic})`,
        active: sql<number>`count(*) filter (where ${qrCodes.active})`,
      })
      .from(qrCodes),

    db
      .select({
        total: count(),
        today: sql<number>`count(*) filter (where ${scans.ts} >= ${startOfToday().toISOString()})`,
        last30: sql<number>`count(*) filter (where ${scans.ts} >= ${daysAgo(30).toISOString()})`,
        prev30: sql<number>`count(*) filter (where ${scans.ts} >= ${daysAgo(60).toISOString()} and ${scans.ts} < ${daysAgo(30).toISOString()})`,
      })
      .from(scans),

    db
      .select({
        tier: subscriptions.tier,
        period: subscriptions.period,
        currency: subscriptions.currency,
        provider: subscriptions.provider,
        status: subscriptions.status,
        count: count(),
      })
      .from(subscriptions)
      .where(inArray(subscriptions.status, LIVE_STATUSES))
      .groupBy(
        subscriptions.tier,
        subscriptions.period,
        subscriptions.currency,
        subscriptions.provider,
        subscriptions.status
      ),

    db.select({ plan: users.plan, count: count() }).from(users).groupBy(users.plan),

    db
      .select({
        day: sql<string>`to_char(${users.createdAt}, 'YYYY-MM-DD')`,
        value: count(),
      })
      .from(users)
      .where(gte(users.createdAt, daysAgo(29)))
      .groupBy(sql`to_char(${users.createdAt}, 'YYYY-MM-DD')`),

    db
      .select({
        day: sql<string>`to_char(${scans.ts}, 'YYYY-MM-DD')`,
        value: count(),
      })
      .from(scans)
      .where(gte(scans.ts, daysAgo(29)))
      .groupBy(sql`to_char(${scans.ts}, 'YYYY-MM-DD')`),

    // Activation: users who have created at least one QR code. The single most
    // useful funnel number for this product — a signup with no QR never activated.
    db
      .select({ activated: sql<number>`count(distinct ${qrCodes.userId})` })
      .from(qrCodes),

    db.select({ total: count() }).from(suites),

    db
      .select({
        total: count(),
        avgRating: sql<number>`coalesce(avg(${feedback.rating}), 0)`,
      })
      .from(feedback),
  ]);

  const mrrInr = liveSubs.reduce(
    (sum, r) => sum + monthlyInr(r.tier, r.period, r.currency) * n(r.count),
    0
  );
  const liveCount = liveSubs.reduce((s, r) => s + n(r.count), 0);

  const totalUsers = n(userTotals[0]?.total);
  const activated = n(activeRows[0]?.activated);

  return {
    users: {
      total: totalUsers,
      last30: n(userTotals[0]?.last30),
      prev30: n(userTotals[0]?.prev30),
      paying: n(userTotals[0]?.paying),
      activated,
      activationRate: totalUsers ? (activated / totalUsers) * 100 : 0,
      conversionRate: totalUsers ? (n(userTotals[0]?.paying) / totalUsers) * 100 : 0,
    },
    qrs: {
      total: n(qrTotals[0]?.total),
      last30: n(qrTotals[0]?.last30),
      dynamic: n(qrTotals[0]?.dynamic),
      active: n(qrTotals[0]?.active),
    },
    scans: {
      total: n(scanTotals[0]?.total),
      today: n(scanTotals[0]?.today),
      last30: n(scanTotals[0]?.last30),
      prev30: n(scanTotals[0]?.prev30),
    },
    revenue: {
      mrrInr,
      arrInr: mrrInr * 12,
      liveSubscriptions: liveCount,
      arpuInr: liveCount ? mrrInr / liveCount : 0,
    },
    suites: n(suiteTotals[0]?.total),
    feedback: {
      total: n(feedbackTotals[0]?.total),
      avgRating: Number(feedbackTotals[0]?.avgRating ?? 0),
    },
    planMix: planRows
      .map((r) => ({ plan: r.plan, count: n(r.count) }))
      .sort((a, b) => b.count - a.count),
    signupsDaily: fillDays(
      signupRows.map((r) => ({ day: r.day, value: n(r.value) })),
      30
    ),
    scansDaily: fillDays(
      scanRows.map((r) => ({ day: r.day, value: n(r.value) })),
      30
    ),
  };
}

// ------------------------------------------------------------------- users

export type UserRow = {
  id: string;
  name: string;
  email: string;
  plan: string;
  role: string;
  createdAt: Date;
  qrCount: number;
  scanCount: number;
  subStatus: string | null;
  subProvider: string | null;
};

export async function userList({
  search = "",
  plan = "",
  page = 1,
  pageSize = 25,
}: {
  search?: string;
  plan?: string;
  page?: number;
  pageSize?: number;
}) {
  const filters = [];
  if (search) {
    filters.push(
      or(ilike(users.name, `%${search}%`), ilike(users.email, `%${search}%`))
    );
  }
  if (plan) filters.push(eq(users.plan, plan));
  const where = filters.length ? and(...filters) : undefined;

  const [rows, totals] = await Promise.all([
    db
      .select({
        id: users.id,
        name: users.name,
        email: users.email,
        plan: users.plan,
        role: users.role,
        createdAt: users.createdAt,
        // Correlated subqueries are written with explicit aliases and qualified
        // column names: drizzle renders a bare `${table.column}` unqualified
        // inside a subquery, which collides with the outer table's columns.
        qrCount: sql<number>`(select count(*) from qr_codes q where q.user_id = users.id)`,
        scanCount: sql<number>`(select count(*) from scans sc join qr_codes q2 on q2.id = sc.qr_id where q2.user_id = users.id)`,
        subStatus: sql<
          string | null
        >`(select sub.status from subscriptions sub where sub.user_id = users.id order by sub.created_at desc limit 1)`,
        subProvider: sql<
          string | null
        >`(select sub.provider from subscriptions sub where sub.user_id = users.id order by sub.created_at desc limit 1)`,
      })
      .from(users)
      .where(where)
      .orderBy(desc(users.createdAt))
      .limit(pageSize)
      .offset((page - 1) * pageSize),

    db.select({ total: count() }).from(users).where(where),
  ]);

  return {
    rows: rows.map((r) => ({
      ...r,
      qrCount: n(r.qrCount),
      scanCount: n(r.scanCount),
    })) as UserRow[],
    total: n(totals[0]?.total),
    page,
    pageSize,
  };
}

// ----------------------------------------------------------------- revenue

export async function revenueStats() {
  const [subs, statusRows, recent, cancelled] = await Promise.all([
    db
      .select({
        tier: subscriptions.tier,
        period: subscriptions.period,
        currency: subscriptions.currency,
        provider: subscriptions.provider,
        count: count(),
      })
      .from(subscriptions)
      .where(inArray(subscriptions.status, LIVE_STATUSES))
      .groupBy(
        subscriptions.tier,
        subscriptions.period,
        subscriptions.currency,
        subscriptions.provider
      ),

    db
      .select({ status: subscriptions.status, count: count() })
      .from(subscriptions)
      .groupBy(subscriptions.status)
      .orderBy(desc(count())),

    db
      .select({
        id: subscriptions.id,
        tier: subscriptions.tier,
        period: subscriptions.period,
        currency: subscriptions.currency,
        provider: subscriptions.provider,
        status: subscriptions.status,
        currentPeriodEnd: subscriptions.currentPeriodEnd,
        createdAt: subscriptions.createdAt,
        email: users.email,
        name: users.name,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .orderBy(desc(subscriptions.createdAt))
      .limit(50),

    db
      .select({
        last30: sql<number>`count(*) filter (where ${subscriptions.updatedAt} >= ${daysAgo(30).toISOString()})`,
        total: count(),
      })
      .from(subscriptions)
      .where(inArray(subscriptions.status, ["cancelled", "halted", "expired"])),
  ]);

  const withMrr = subs.map((r) => ({
    ...r,
    count: n(r.count),
    mrrInr: monthlyInr(r.tier, r.period, r.currency) * n(r.count),
  }));

  const sumBy = <K extends keyof (typeof withMrr)[number]>(key: K) => {
    const map = new Map<string, { mrrInr: number; count: number }>();
    for (const r of withMrr) {
      const k = String(r[key]);
      const cur = map.get(k) ?? { mrrInr: 0, count: 0 };
      map.set(k, { mrrInr: cur.mrrInr + r.mrrInr, count: cur.count + r.count });
    }
    return [...map.entries()]
      .map(([key, v]) => ({ key, ...v }))
      .sort((a, b) => b.mrrInr - a.mrrInr);
  };

  const mrrInr = withMrr.reduce((s, r) => s + r.mrrInr, 0);
  const liveCount = withMrr.reduce((s, r) => s + r.count, 0);
  const churnedTotal = n(cancelled[0]?.total);

  return {
    mrrInr,
    arrInr: mrrInr * 12,
    liveCount,
    arpuInr: liveCount ? mrrInr / liveCount : 0,
    byTier: sumBy("tier"),
    byCurrency: sumBy("currency"),
    byProvider: sumBy("provider"),
    byPeriod: sumBy("period"),
    statusMix: statusRows.map((r) => ({ status: r.status, count: n(r.count) })),
    churned: { total: churnedTotal, last30: n(cancelled[0]?.last30) },
    // Share of ever-started subscriptions that ended. A blunt lifetime measure,
    // not a monthly cohort churn rate — don't read it as one.
    churnRate: liveCount + churnedTotal ? (churnedTotal / (liveCount + churnedTotal)) * 100 : 0,
    recent,
  };
}

// ----------------------------------------------------------------- content

export async function contentStats() {
  const [types, topQrs, countries, devices, os, browsers, referrers, suiteRows, ratings] =
    await Promise.all([
      db
        .select({ type: qrCodes.type, count: count() })
        .from(qrCodes)
        .groupBy(qrCodes.type)
        .orderBy(desc(count())),

      db
        .select({
          id: qrCodes.id,
          name: qrCodes.name,
          type: qrCodes.type,
          code: qrCodes.code,
          active: qrCodes.active,
          owner: users.email,
          scanCount: count(scans.id),
        })
        .from(qrCodes)
        .innerJoin(users, eq(qrCodes.userId, users.id))
        .leftJoin(scans, eq(scans.qrId, qrCodes.id))
        .groupBy(qrCodes.id, users.email)
        .orderBy(desc(count(scans.id)))
        .limit(15),

      db
        .select({ key: scans.country, count: count() })
        .from(scans)
        .groupBy(scans.country)
        .orderBy(desc(count()))
        .limit(12),

      db
        .select({ key: scans.device, count: count() })
        .from(scans)
        .groupBy(scans.device)
        .orderBy(desc(count())),

      db
        .select({ key: scans.os, count: count() })
        .from(scans)
        .groupBy(scans.os)
        .orderBy(desc(count()))
        .limit(8),

      db
        .select({ key: scans.browser, count: count() })
        .from(scans)
        .groupBy(scans.browser)
        .orderBy(desc(count()))
        .limit(8),

      db
        .select({ key: scans.referrer, count: count() })
        .from(scans)
        .groupBy(scans.referrer)
        .orderBy(desc(count()))
        .limit(8),

      db
        .select({
          id: suites.id,
          name: suites.name,
          kind: suites.kind,
          createdAt: suites.createdAt,
          owner: users.email,
          qrCount: sql<number>`(select count(*) from qr_codes q where q.suite_id = suites.id)`,
        })
        .from(suites)
        .innerJoin(users, eq(suites.userId, users.id))
        .orderBy(desc(suites.createdAt))
        .limit(20),

      db
        .select({ rating: feedback.rating, count: count() })
        .from(feedback)
        .groupBy(feedback.rating)
        .orderBy(feedback.rating),
    ]);

  const label = (v: string | null, fallback = "Unknown") => v || fallback;

  return {
    types: types.map((r) => ({ key: r.type, count: n(r.count) })),
    topQrs: topQrs.map((r) => ({ ...r, scanCount: n(r.scanCount) })),
    countries: countries.map((r) => ({ key: label(r.key), count: n(r.count) })),
    devices: devices.map((r) => ({ key: label(r.key), count: n(r.count) })),
    os: os.map((r) => ({ key: label(r.key), count: n(r.count) })),
    browsers: browsers.map((r) => ({ key: label(r.key), count: n(r.count) })),
    referrers: referrers.map((r) => ({ key: label(r.key, "Direct"), count: n(r.count) })),
    suites: suiteRows.map((r) => ({ ...r, qrCount: n(r.qrCount) })),
    ratings: ratings.map((r) => ({ rating: r.rating, count: n(r.count) })),
  };
}

// ------------------------------------------------------------------ system

export async function systemStats() {
  const [eventRows, recentEvents, problemSubs, orphanCounts] = await Promise.all([
    db
      .select({
        provider: webhookEvents.provider,
        eventType: webhookEvents.eventType,
        count: count(),
        last: sql<string>`max(${webhookEvents.receivedAt})`,
      })
      .from(webhookEvents)
      .groupBy(webhookEvents.provider, webhookEvents.eventType)
      .orderBy(desc(count())),

    db
      .select()
      .from(webhookEvents)
      .orderBy(desc(webhookEvents.receivedAt))
      .limit(25),

    db
      .select({
        id: subscriptions.id,
        provider: subscriptions.provider,
        tier: subscriptions.tier,
        status: subscriptions.status,
        updatedAt: subscriptions.updatedAt,
        email: users.email,
      })
      .from(subscriptions)
      .innerJoin(users, eq(subscriptions.userId, users.id))
      .where(inArray(subscriptions.status, ["past_due", "halted", "paused", "created"]))
      .orderBy(desc(subscriptions.updatedAt))
      .limit(25),

    // A user marked paid with no live subscription behind it means entitlement
    // and billing have drifted — someone is getting a plan for free.
    db
      .select({ count: count() })
      .from(users)
      .where(
        and(
          sql`users.plan <> 'free'`,
          sql`not exists (select 1 from subscriptions s where s.user_id = users.id and s.status = any(${sql.raw(
            `array[${LIVE_STATUSES.map((s) => `'${s}'`).join(",")}]`
          )}))`
        )
      ),
  ]);

  return {
    eventTypes: eventRows.map((r) => ({ ...r, count: n(r.count) })),
    recentEvents,
    problemSubs,
    paidWithoutSubscription: n(orphanCounts[0]?.count),
  };
}
