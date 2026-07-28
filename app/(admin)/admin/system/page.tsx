import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { systemStats } from "@/lib/admin/stats";
import { adminBootstrapConfigured } from "@/lib/admin/auth";
import { outstandingFields } from "@/lib/legal/business";
import { availableCurrencies, getProvider, isProviderId } from "@/lib/billing";
import { CURRENCIES } from "@/lib/billing/tiers";
import { Card, Empty, Pill, TableWrap, Td, Th, statusTone } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

const PROVIDER_IDS = ["razorpay", "paddle"] as const;

function Health({
  ok,
  label,
  detail,
  warn = false,
}: {
  ok: boolean;
  label: string;
  detail: string;
  warn?: boolean;
}) {
  const Icon = ok ? CheckCircle2 : warn ? AlertTriangle : XCircle;
  const tone = ok
    ? "text-emerald-600"
    : warn
      ? "text-amber-600"
      : "text-gray-400";
  return (
    <div className="flex items-start gap-2.5 py-2.5">
      <Icon className={`w-4 h-4 mt-0.5 shrink-0 ${tone}`} aria-hidden />
      <div className="min-w-0">
        <p className="text-sm font-medium text-gray-900">{label}</p>
        <p className="text-xs text-gray-500">{detail}</p>
      </div>
    </div>
  );
}

export default async function AdminSystemPage() {
  const s = await systemStats();

  const providers = PROVIDER_IDS.filter(isProviderId).map((id) => {
    const p = getProvider(id);
    return {
      id,
      configured: p.isConfigured(),
      currencies: p.supportedCurrencies.join(", "),
      portal: p.hasPortal,
    };
  });

  const available = availableCurrencies();
  const unsellable = CURRENCIES.filter((c) => !available.includes(c));
  const anyConfigured = providers.some((p) => p.configured);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">System</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          Configuration and the signals that mean someone isn&apos;t getting what
          they paid for
        </p>
      </div>

      {s.paidWithoutSubscription > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-800">
          <AlertTriangle className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>
              {s.paidWithoutSubscription} user
              {s.paidWithoutSubscription === 1 ? " is" : "s are"} on a paid plan with
              no live subscription.
            </strong>{" "}
            Either they were upgraded manually, or a cancellation webhook never
            arrived. Both mean entitlement and billing have drifted apart.
          </span>
        </div>
      )}

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Payment providers" subtitle="What this deployment can charge">
          <div className="divide-y divide-gray-100">
            {providers.map((p) => (
              <Health
                key={p.id}
                ok={p.configured}
                label={`${p.id[0].toUpperCase()}${p.id.slice(1)}`}
                detail={
                  p.configured
                    ? `Configured · ${p.currencies}${p.portal ? " · hosted portal" : " · in-app cancel only"}`
                    : `Not configured — ${p.currencies} cannot be charged`
                }
              />
            ))}
            <Health
              ok={anyConfigured}
              warn={!anyConfigured}
              label="Billing mode"
              detail={
                anyConfigured
                  ? `Live · selling in ${available.join(", ")}`
                  : "Free pilot — plan limits are not enforced and nothing is charged"
              }
            />
            {unsellable.length > 0 && anyConfigured && (
              <Health
                ok={false}
                warn
                label="Unsellable currencies"
                detail={`${unsellable.join(", ")} are priced in code but no configured provider settles them — visitors there see a fallback currency.`}
              />
            )}
          </div>
        </Card>

        <Card title="Admin access" subtitle="Who can reach this panel">
          <div className="divide-y divide-gray-100">
            <Health
              ok={adminBootstrapConfigured()}
              warn={!adminBootstrapConfigured()}
              label="ADMIN_EMAILS bootstrap"
              detail={
                adminBootstrapConfigured()
                  ? "Set — those addresses keep access even if their role is changed"
                  : "Not set. Access depends entirely on users.role = 'admin'; if that's cleared, nobody can get back in without database access."
              }
            />
            <Health
              ok
              label="Panel visibility"
              detail="Non-admins get a 404, so the panel isn't discoverable by URL."
            />
            <Health
              ok={outstandingFields().length === 0}
              warn={outstandingFields().length > 0}
              label="Legal pages"
              detail={
                outstandingFields().length === 0
                  ? "Terms, Privacy, Refund and Contact are complete."
                  : `Still placeholder: ${outstandingFields().join(", ")}. Payment providers check these during review — fill src/lib/legal/business.ts.`
              }
            />
          </div>
        </Card>
      </div>

      <Card
        title="Subscriptions needing attention"
        subtitle="Past due, halted, paused, or stuck at created"
      >
        {s.problemSubs.length ? (
          <TableWrap>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <Th>Customer</Th>
                  <Th>Tier</Th>
                  <Th>Provider</Th>
                  <Th>Status</Th>
                  <Th right>Last change</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {s.problemSubs.map((p) => (
                  <tr key={p.id} className="hover:bg-gray-50">
                    <Td>
                      <span className="text-sm text-gray-700">{p.email}</span>
                    </Td>
                    <Td className="capitalize">{p.tier}</Td>
                    <Td className="capitalize text-xs text-gray-600">{p.provider}</Td>
                    <Td>
                      <Pill tone={statusTone(p.status)}>{p.status}</Pill>
                    </Td>
                    <Td right>
                      <span className="text-xs text-gray-500">
                        {p.updatedAt.toLocaleDateString("en-GB", {
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
          <Empty>Nothing needs attention</Empty>
        )}
        <p className="text-[11px] text-gray-400 mt-3">
          A subscription stuck at <code>created</code> means checkout was started but
          never paid — normal in small numbers, worth investigating in bulk.
        </p>
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Webhook events by type" subtitle="What providers have sent us">
          {s.eventTypes.length ? (
            <TableWrap>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <Th>Provider</Th>
                    <Th>Event</Th>
                    <Th right>Count</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {s.eventTypes.map((e) => (
                    <tr key={`${e.provider}-${e.eventType}`}>
                      <Td className="capitalize text-xs text-gray-600">{e.provider}</Td>
                      <Td>
                        <span className="font-mono text-xs">{e.eventType}</span>
                      </Td>
                      <Td right>{e.count}</Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <Empty>No webhooks received yet</Empty>
          )}
        </Card>

        <Card title="Recent deliveries" subtitle="Newest 25">
          {s.recentEvents.length ? (
            <TableWrap>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <Th>Event</Th>
                    <Th right>Received</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {s.recentEvents.map((e) => (
                    <tr key={`${e.provider}-${e.eventId}`}>
                      <Td>
                        <span className="font-mono text-xs">{e.eventType}</span>
                        <p className="text-[11px] text-gray-400 capitalize">
                          {e.provider}
                        </p>
                      </Td>
                      <Td right>
                        <span className="text-xs text-gray-500">
                          {e.receivedAt.toLocaleString("en-GB", {
                            day: "numeric",
                            month: "short",
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <Empty>No webhooks received yet</Empty>
          )}
          <p className="text-[11px] text-gray-400 mt-3">
            Only <em>verified</em> deliveries appear here — a rejected signature never
            reaches this table. Events we couldn&apos;t tie to a user are logged as{" "}
            <code>[billing] unattributable webhook</code> in the server logs.
          </p>
        </Card>
      </div>
    </div>
  );
}
