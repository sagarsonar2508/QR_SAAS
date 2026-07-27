import Link from "next/link";
import { count, desc, eq } from "drizzle-orm";
import { Plus, UtensilsCrossed } from "lucide-react";
import { db, qrCodes, scans, suites } from "@/db";
import { getSessionUser } from "@/lib/auth";

export const dynamic = "force-dynamic";

export default async function RestaurantListPage() {
  const user = (await getSessionUser())!;

  const rows = await db
    .select({
      id: suites.id,
      name: suites.name,
      createdAt: suites.createdAt,
      qrCount: count(qrCodes.id),
    })
    .from(suites)
    .leftJoin(qrCodes, eq(qrCodes.suiteId, suites.id))
    .where(eq(suites.userId, user.id))
    .groupBy(suites.id)
    .orderBy(desc(suites.createdAt));

  const scanCounts = await db
    .select({ suiteId: qrCodes.suiteId, scanCount: count(scans.id) })
    .from(qrCodes)
    .innerJoin(scans, eq(scans.qrId, qrCodes.id))
    .where(eq(qrCodes.userId, user.id))
    .groupBy(qrCodes.suiteId);
  const scansBySuite = new Map(
    scanCounts.filter((s) => s.suiteId).map((s) => [s.suiteId, Number(s.scanCount)])
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Restaurant Suite</h1>
          <p className="text-sm text-gray-500">
            Menu, table, feedback and review QRs — one setup
          </p>
        </div>
        <Link
          href="/restaurant/new"
          className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2"
        >
          <Plus className="w-4 h-4" /> New restaurant
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-xl border border-dashed border-gray-300 p-12 text-center">
          <span className="inline-flex bg-indigo-50 text-indigo-600 rounded-xl p-3 mb-3">
            <UtensilsCrossed className="w-6 h-6" />
          </span>
          <p className="text-gray-700 font-medium mb-1">Set up your first restaurant</p>
          <p className="text-sm text-gray-500 mb-4 max-w-sm mx-auto">
            Four questions and you get per-table menu QRs, a feedback funnel, a
            Google review QR, and a print-ready sticker sheet.
          </p>
          <Link
            href="/restaurant/new"
            className="inline-flex items-center gap-1.5 bg-indigo-600 text-white text-sm font-medium rounded-lg px-4 py-2"
          >
            <Plus className="w-4 h-4" /> Get started
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((s) => (
            <Link
              key={s.id}
              href={`/restaurant/${s.id}`}
              className="bg-white rounded-xl border border-gray-200 p-5 hover:shadow-sm hover:border-indigo-300 transition-all"
            >
              <span className="inline-flex bg-indigo-50 text-indigo-600 rounded-lg p-2 mb-3">
                <UtensilsCrossed className="w-5 h-5" />
              </span>
              <p className="font-semibold text-gray-900">{s.name}</p>
              <p className="text-sm text-gray-500 mt-1">
                {s.qrCount} QR codes · {scansBySuite.get(s.id) ?? 0} scans
              </p>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
