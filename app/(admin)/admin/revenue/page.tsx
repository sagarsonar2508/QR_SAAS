import { IndianRupee, TrendingUp, Users, UserMinus } from "lucide-react";
import { revenueStats } from "@/lib/admin/stats";
import {
  RATES_REVIEWED,
  formatInr,
  formatInrCompact,
  ratesInInr,
  usesOverrides,
} from "@/lib/admin/fx";
import { availableCurrencies, billingConfigured } from "@/lib/billing";
import Chart from "@/components/Chart";
import { categoricalBarOption, magnitudeBarOption } from "@/components/admin/charts";
import { Card, Empty, Pill, Stat, TableWrap, Td, Th, statusTone } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

export default async function AdminRevenuePage() {
  const r = await revenueStats();
  const rates = ratesInInr();

  // Fixed tier order — colour follows the plan, never its current rank.
  const tierOrder = ["starter", "business", "agency"];
  const byTier = tierOrder.map((t) => ({
    key: t,
    count: r.byTier.find((x) => x.key === t)?.count ?? 0,
    mrrInr: r.byTier.find((x) => x.key === t)?.mrrInr ?? 0,
  }));

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Revenue</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Recurring revenue across both providers, normalised to INR
          </p>
        </div>
        {!billingConfigured() && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            No provider configured — pilot mode
          </p>
        )}
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="MRR"
          value={formatInrCompact(r.mrrInr)}
          hint={formatInr(r.mrrInr)}
          icon={IndianRupee}
          tone="emerald"
        />
        <Stat
          label="ARR"
          value={formatInrCompact(r.arrInr)}
          hint="MRR × 12"
          icon={TrendingUp}
          tone="emerald"
        />
        <Stat
          label="Live subscriptions"
          value={r.liveCount}
          hint={`ARPU ${formatInrCompact(r.arpuInr)}`}
          icon={Users}
          tone="violet"
        />
        <Stat
          label="Ended subscriptions"
          value={r.churned.total}
          hint={`${r.churned.last30} in last 30d`}
          icon={UserMinus}
          tone="rose"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="MRR by tier" subtitle="Which plan actually carries the business">
          {r.liveCount ? (
            <>
              <Chart
                option={categoricalBarOption(
                  byTier.map((t) => ({ key: t.key, count: Math.round(t.mrrInr) })),
                  { labels: byTier.map((t) => formatInrCompact(t.mrrInr)) }
                )}
                className="h-56 w-full"
              />
              <TableWrap>
                <table className="w-full mt-3">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <Th>Tier</Th>
                      <Th right>Subs</Th>
                      <Th right>MRR</Th>
                      <Th right>Share</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {byTier.map((t) => (
                      <tr key={t.key}>
                        <Td className="capitalize">{t.key}</Td>
                        <Td right>{t.count}</Td>
                        <Td right>{formatInr(t.mrrInr)}</Td>
                        <Td right>
                          {r.mrrInr ? `${((t.mrrInr / r.mrrInr) * 100).toFixed(0)}%` : "—"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </>
          ) : (
            <Empty>No live subscriptions yet</Empty>
          )}
        </Card>

        <Card
          title="MRR by currency"
          subtitle="Where in the world the money comes from"
        >
          {r.byCurrency.length ? (
            <>
              <Chart
                option={magnitudeBarOption(
                  r.byCurrency.map((c) => ({ key: c.key, count: Math.round(c.mrrInr) })),
                  { labels: r.byCurrency.map((c) => formatInrCompact(c.mrrInr)) }
                )}
                className="h-56 w-full"
              />
              <TableWrap>
                <table className="w-full mt-3">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <Th>Currency</Th>
                      <Th right>Subs</Th>
                      <Th right>MRR (INR)</Th>
                      <Th right>Rate used</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {r.byCurrency.map((c) => (
                      <tr key={c.key}>
                        <Td>{c.key}</Td>
                        <Td right>{c.count}</Td>
                        <Td right>{formatInr(c.mrrInr)}</Td>
                        <Td right>
                          <span className="text-xs text-gray-500">
                            {c.key === "INR" ? "—" : `₹${rates[c.key] ?? 1}`}
                          </span>
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </>
          ) : (
            <Empty>No revenue in any currency yet</Empty>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="By provider" subtitle="Razorpay vs Paddle">
          {r.byProvider.length ? (
            <dl className="divide-y divide-gray-100">
              {r.byProvider.map((p) => (
                <div key={p.key} className="flex items-center justify-between py-2.5">
                  <dt className="text-sm text-gray-700 capitalize">{p.key}</dt>
                  <dd className="text-right">
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatInr(p.mrrInr)}
                    </p>
                    <p className="text-[11px] text-gray-500">{p.count} subs</p>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <Empty>Nothing yet</Empty>
          )}
        </Card>

        <Card title="Monthly vs annual" subtitle="Cash-flow shape">
          {r.byPeriod.length ? (
            <dl className="divide-y divide-gray-100">
              {r.byPeriod.map((p) => (
                <div key={p.key} className="flex items-center justify-between py-2.5">
                  <dt className="text-sm text-gray-700 capitalize">{p.key}</dt>
                  <dd className="text-right">
                    <p className="text-sm font-semibold text-gray-900 tabular-nums">
                      {formatInr(p.mrrInr)}
                    </p>
                    <p className="text-[11px] text-gray-500">{p.count} subs</p>
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <Empty>Nothing yet</Empty>
          )}
        </Card>

        <Card title="Subscription states" subtitle="Every row we hold">
          {r.statusMix.length ? (
            <dl className="divide-y divide-gray-100">
              {r.statusMix.map((s) => (
                <div key={s.status} className="flex items-center justify-between py-2.5">
                  <dt>
                    <Pill tone={statusTone(s.status)}>{s.status}</Pill>
                  </dt>
                  <dd className="text-sm font-semibold text-gray-900 tabular-nums">
                    {s.count}
                  </dd>
                </div>
              ))}
            </dl>
          ) : (
            <Empty>No subscriptions yet</Empty>
          )}
        </Card>
      </div>

      <Card
        title="Recent subscriptions"
        subtitle="Newest 50, whatever their state"
      >
        {r.recent.length ? (
          <TableWrap>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <Th>Customer</Th>
                  <Th>Tier</Th>
                  <Th>Provider</Th>
                  <Th>Status</Th>
                  <Th right>Renews / ends</Th>
                  <Th right>Started</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {r.recent.map((s) => (
                  <tr key={s.id} className="hover:bg-gray-50">
                    <Td>
                      <p className="font-medium text-gray-900">{s.name}</p>
                      <p className="text-xs text-gray-500">{s.email}</p>
                    </Td>
                    <Td>
                      <span className="capitalize">{s.tier}</span>
                      <span className="text-xs text-gray-400"> · {s.period}</span>
                    </Td>
                    <Td>
                      <span className="capitalize text-xs text-gray-600">
                        {s.provider}
                      </span>
                      <span className="text-xs text-gray-400"> · {s.currency}</span>
                    </Td>
                    <Td>
                      <Pill tone={statusTone(s.status)}>{s.status}</Pill>
                    </Td>
                    <Td right>
                      <span className="text-xs text-gray-500">
                        {s.currentPeriodEnd
                          ? s.currentPeriodEnd.toLocaleDateString("en-GB", {
                              day: "numeric",
                              month: "short",
                              year: "numeric",
                            })
                          : "—"}
                      </span>
                    </Td>
                    <Td right>
                      <span className="text-xs text-gray-500">
                        {s.createdAt.toLocaleDateString("en-GB", {
                          day: "numeric",
                          month: "short",
                          year: "numeric",
                        })}
                      </span>
                    </Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <Empty>No subscriptions yet</Empty>
        )}
      </Card>

      <Card title="How these numbers are built" subtitle="Read before quoting them">
        <ul className="text-sm text-gray-600 space-y-2 list-disc pl-5">
          <li>
            <strong>MRR</strong> counts subscriptions in {" "}
            <em>active, cancelling, trialing, past&nbsp;due</em> — the same set that
            entitles a user to their plan, so revenue and access never disagree.
            Annual plans are divided by 12.
          </li>
          <li>
            Amounts come from the <strong>price table in code</strong>, not from
            provider invoices. Discounts, refunds, failed collections, taxes and
            Paddle&apos;s fees are <strong>not</strong> reflected. Payout statements
            are the authority on what you actually earned.
          </li>
          <li>
            Non-INR revenue is converted at estimated rates
            {usesOverrides() ? " from FX_RATES_INR" : ` reviewed ${RATES_REVIEWED}`} (
            {Object.entries(rates)
              .filter(([k]) => k !== "INR")
              .map(([k, v]) => `${k} ₹${v}`)
              .join(" · ")}
            ). Set <code>FX_RATES_INR</code> to update without a deploy.
          </li>
          <li>
            <strong>Ended subscriptions</strong> is a lifetime count, not a monthly
            cohort churn rate — {r.churnRate.toFixed(1)}% of all subscriptions ever
            started have ended. Don&apos;t report it as churn.
          </li>
          <li>
            Currencies you can currently charge:{" "}
            <strong>{availableCurrencies().join(", ")}</strong>.
          </li>
        </ul>
      </Card>
    </div>
  );
}
