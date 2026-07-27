import Link from "next/link";
import {
  Users,
  IndianRupee,
  QrCode,
  ScanLine,
  TrendingUp,
  Zap,
  UtensilsCrossed,
  Star,
} from "lucide-react";
import { overviewStats } from "@/lib/admin/stats";
import { formatInrCompact, formatInr, RATES_REVIEWED } from "@/lib/admin/fx";
import { billingConfigured } from "@/lib/billing";
import Chart from "@/components/Chart";
import {
  categoricalBarOption,
  deltaPct,
  trendOption,
} from "@/components/admin/charts";
import { Card, Stat, Empty, TableWrap, Th, Td } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const TIER_LABEL: Record<string, string> = {
  free: "Free",
  starter: "Starter",
  business: "Business",
  agency: "Agency",
};

export default async function AdminOverviewPage() {
  const s = await overviewStats();
  const live = billingConfigured();

  // Fixed tier order so a colour never moves between plans as counts change.
  const planOrder = ["free", "starter", "business", "agency"];
  const planMix = planOrder.map((plan) => ({
    key: TIER_LABEL[plan] ?? plan,
    count: s.planMix.find((p) => p.plan === plan)?.count ?? 0,
  }));

  const hasSignups = s.signupsDaily.some((d) => d.value > 0);
  const hasScans = s.scansDaily.some((d) => d.value > 0);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Business overview
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            Everything in one place · last 30 days unless stated
          </p>
        </div>
        {!live && (
          <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-1.5">
            Pilot mode — no payment provider configured, so revenue is ₹0 by
            definition.
          </p>
        )}
      </div>

      {/* Money first: the numbers that decide whether the business works. */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="MRR"
          value={formatInrCompact(s.revenue.mrrInr)}
          hint={`ARR ${formatInrCompact(s.revenue.arrInr)}`}
          icon={IndianRupee}
          tone="emerald"
        />
        <Stat
          label="Paying customers"
          value={s.users.paying}
          hint={`${s.users.conversionRate.toFixed(1)}% of signups`}
          icon={TrendingUp}
          tone="emerald"
        />
        <Stat
          label="ARPU"
          value={formatInrCompact(s.revenue.arpuInr)}
          hint="per live subscription"
          icon={IndianRupee}
          tone="violet"
        />
        <Stat
          label="Live subscriptions"
          value={s.revenue.liveSubscriptions}
          hint="active · trialing · past due"
          icon={Zap}
          tone="violet"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <Stat
          label="Total users"
          value={s.users.total}
          delta={deltaPct(s.users.last30, s.users.prev30)}
          hint={`+${s.users.last30} in 30d`}
          icon={Users}
        />
        <Stat
          label="Activated"
          value={`${s.users.activationRate.toFixed(0)}%`}
          hint={`${s.users.activated} made a QR`}
          icon={Zap}
          tone="amber"
        />
        <Stat
          label="QR codes"
          value={s.qrs.total}
          hint={`${s.qrs.dynamic} dynamic · ${s.qrs.active} active`}
          icon={QrCode}
        />
        <Stat
          label="Scans"
          value={s.scans.total}
          delta={deltaPct(s.scans.last30, s.scans.prev30)}
          hint={`${s.scans.today} today`}
          icon={ScanLine}
          tone="violet"
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card
          title="Signups per day"
          subtitle="New accounts, last 30 days"
        >
          {hasSignups ? (
            <Chart option={trendOption(s.signupsDaily)} className="h-56 w-full" />
          ) : (
            <Empty>No signups in the last 30 days</Empty>
          )}
        </Card>

        <Card title="Scans per day" subtitle="All QR codes, last 30 days">
          {hasScans ? (
            <Chart option={trendOption(s.scansDaily)} className="h-56 w-full" />
          ) : (
            <Empty>No scans in the last 30 days</Empty>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card
          title="Users by plan"
          subtitle="Where your base actually sits"
        >
          {s.users.total ? (
            <>
              <Chart
                option={categoricalBarOption(planMix)}
                className="h-56 w-full"
              />
              {/* Table view accompanies the chart: the palette's lighter slots
                  fall below 3:1 on white, so values must be readable without
                  relying on colour. */}
              <TableWrap>
                <table className="w-full mt-3">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <Th>Plan</Th>
                      <Th right>Users</Th>
                      <Th right>Share</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {planMix.map((p) => (
                      <tr key={p.key}>
                        <Td>{p.key}</Td>
                        <Td right>{p.count}</Td>
                        <Td right>
                          {s.users.total
                            ? `${((p.count / s.users.total) * 100).toFixed(1)}%`
                            : "—"}
                        </Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </>
          ) : (
            <Empty>No users yet</Empty>
          )}
        </Card>

        <Card title="Product health" subtitle="Beyond the money">
          <dl className="divide-y divide-gray-100">
            {[
              {
                label: "Restaurant suites",
                value: s.suites,
                hint: "guided multi-QR setups",
                icon: UtensilsCrossed,
              },
              {
                label: "Feedback responses",
                value: s.feedback.total,
                hint: s.feedback.total
                  ? `avg ${s.feedback.avgRating.toFixed(2)}★`
                  : "no responses yet",
                icon: Star,
              },
              {
                label: "QR codes created (30d)",
                value: s.qrs.last30,
                hint: "creation is the activation signal",
                icon: QrCode,
              },
              {
                label: "Scans (30d)",
                value: s.scans.last30,
                hint: `${s.scans.prev30} in the 30 days before`,
                icon: ScanLine,
              },
            ].map((row) => (
              <div key={row.label} className="flex items-center gap-3 py-3">
                <span className="rounded-lg p-1.5 bg-gray-100 text-gray-600">
                  <row.icon className="w-4 h-4" />
                </span>
                <div className="min-w-0 flex-1">
                  <dt className="text-sm font-medium text-gray-900">{row.label}</dt>
                  <dd className="text-xs text-gray-500">{row.hint}</dd>
                </div>
                <span className="text-lg font-bold text-gray-900 tabular-nums">
                  {row.value}
                </span>
              </div>
            ))}
          </dl>
          <p className="text-[11px] text-gray-400 mt-3">
            Revenue is converted to INR at estimated rates (reviewed{" "}
            {RATES_REVIEWED}); exact MRR today is {formatInr(s.revenue.mrrInr)}. See{" "}
            <Link href="/admin/revenue" className="text-indigo-600 hover:underline">
              Revenue
            </Link>{" "}
            for the per-currency breakdown.
          </p>
        </Card>
      </div>
    </div>
  );
}
