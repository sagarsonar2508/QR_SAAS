import { Globe, Smartphone, Star, UtensilsCrossed } from "lucide-react";
import { contentStats } from "@/lib/admin/stats";
import Chart from "@/components/Chart";
import {
  MAX_CATEGORICAL,
  categoricalBarOption,
  magnitudeBarOption,
  ratingOption,
} from "@/components/admin/charts";
import { Card, Empty, Pill, TableWrap, Td, Th } from "@/components/admin/ui";

export const dynamic = "force-dynamic";

/** Categorical palettes cap at four hues. Anything past that folds into "Other"
 *  rather than inventing a fifth colour nobody can distinguish. */
function foldToOther(rows: { key: string; count: number }[], max = MAX_CATEGORICAL) {
  if (rows.length <= max) return rows;
  const head = rows.slice(0, max - 1);
  const tail = rows.slice(max - 1);
  return [
    ...head,
    { key: "Other", count: tail.reduce((s, r) => s + r.count, 0) },
  ];
}

export default async function AdminContentPage() {
  const c = await contentStats();
  const totalScans = c.devices.reduce((s, d) => s + d.count, 0);
  const devices = foldToOther(c.devices);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Content</h1>
        <p className="text-sm text-gray-500 mt-0.5">
          What your customers build, and who scans it
        </p>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="QR types" subtitle="What people actually create">
          {c.types.length ? (
            <>
              <Chart
                option={magnitudeBarOption(c.types.slice(0, 10))}
                className="h-64 w-full"
              />
              <p className="text-[11px] text-gray-400 mt-2">
                Top 10 of {c.types.length} types in use.
              </p>
            </>
          ) : (
            <Empty>No QR codes yet</Empty>
          )}
        </Card>

        <Card title="Scans by device" subtitle="Where scans come from">
          {totalScans ? (
            <>
              <Chart
                option={categoricalBarOption(devices, {
                  labels: devices.map(
                    (d) => `${((d.count / totalScans) * 100).toFixed(0)}%`
                  ),
                })}
                className="h-64 w-full"
              />
              <TableWrap>
                <table className="w-full mt-3">
                  <thead>
                    <tr className="border-b border-gray-100">
                      <Th>Device</Th>
                      <Th right>Scans</Th>
                      <Th right>Share</Th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-50">
                    {devices.map((d) => (
                      <tr key={d.key}>
                        <Td className="capitalize">{d.key}</Td>
                        <Td right>{d.count}</Td>
                        <Td right>{((d.count / totalScans) * 100).toFixed(1)}%</Td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </TableWrap>
            </>
          ) : (
            <Empty>No scans yet</Empty>
          )}
        </Card>
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <Card title="Top countries" subtitle="Scan origin">
          {c.countries.length ? (
            <Chart
              option={magnitudeBarOption(c.countries)}
              className="h-64 w-full"
            />
          ) : (
            <Empty>
              <Globe className="w-4 h-4 inline mr-1" /> No geo data yet
            </Empty>
          )}
        </Card>

        <Card title="Operating systems" subtitle="Top 8">
          {c.os.length ? (
            <Chart option={magnitudeBarOption(c.os)} className="h-64 w-full" />
          ) : (
            <Empty>
              <Smartphone className="w-4 h-4 inline mr-1" /> No scans yet
            </Empty>
          )}
        </Card>

        <Card title="Referrers" subtitle="Top 8 · Direct means no referrer">
          {c.referrers.length ? (
            <Chart option={magnitudeBarOption(c.referrers)} className="h-64 w-full" />
          ) : (
            <Empty>No scans yet</Empty>
          )}
        </Card>
      </div>

      <Card title="Most scanned QR codes" subtitle="Top 15 across all accounts">
        {c.topQrs.length ? (
          <TableWrap>
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-200">
                  <Th>QR code</Th>
                  <Th>Type</Th>
                  <Th>Owner</Th>
                  <Th>State</Th>
                  <Th right>Scans</Th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {c.topQrs.map((q) => (
                  <tr key={q.id} className="hover:bg-gray-50">
                    <Td>
                      <p className="font-medium text-gray-900">{q.name}</p>
                      <p className="text-xs text-gray-400 font-mono">/{q.code}</p>
                    </Td>
                    <Td>
                      <span className="text-xs text-gray-600">{q.type}</span>
                    </Td>
                    <Td>
                      <span className="text-xs text-gray-500">{q.owner}</span>
                    </Td>
                    <Td>
                      <Pill tone={q.active ? "emerald" : "slate"}>
                        {q.active ? "active" : "paused"}
                      </Pill>
                    </Td>
                    <Td right>{q.scanCount}</Td>
                  </tr>
                ))}
              </tbody>
            </table>
          </TableWrap>
        ) : (
          <Empty>No QR codes yet</Empty>
        )}
      </Card>

      <div className="grid lg:grid-cols-2 gap-4">
        <Card title="Feedback ratings" subtitle="Restaurant review funnel">
          {c.ratings.length ? (
            <Chart option={ratingOption(c.ratings)} className="h-56 w-full" />
          ) : (
            <Empty>
              <Star className="w-4 h-4 inline mr-1" /> No feedback collected yet
            </Empty>
          )}
        </Card>

        <Card title="Restaurant suites" subtitle="Newest 20">
          {c.suites.length ? (
            <TableWrap>
              <table className="w-full">
                <thead>
                  <tr className="border-b border-gray-200">
                    <Th>Suite</Th>
                    <Th>Owner</Th>
                    <Th right>QRs</Th>
                    <Th right>Created</Th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-100">
                  {c.suites.map((s) => (
                    <tr key={s.id} className="hover:bg-gray-50">
                      <Td>
                        <p className="font-medium text-gray-900">{s.name}</p>
                        <p className="text-xs text-gray-400">{s.kind}</p>
                      </Td>
                      <Td>
                        <span className="text-xs text-gray-500">{s.owner}</span>
                      </Td>
                      <Td right>{s.qrCount}</Td>
                      <Td right>
                        <span className="text-xs text-gray-500">
                          {s.createdAt.toLocaleDateString("en-GB", {
                            day: "numeric",
                            month: "short",
                          })}
                        </span>
                      </Td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </TableWrap>
          ) : (
            <Empty>
              <UtensilsCrossed className="w-4 h-4 inline mr-1" /> No suites yet
            </Empty>
          )}
        </Card>
      </div>
    </div>
  );
}
