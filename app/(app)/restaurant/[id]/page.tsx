import Link from "next/link";
import { notFound } from "next/navigation";
import { and, count, desc, eq, inArray } from "drizzle-orm";
import { ArrowLeft, Printer, Star } from "lucide-react";
import { db, feedback, qrCodes, scans, suites } from "@/db";
import { getSessionUser } from "@/lib/auth";
import TypeIcon from "@/components/qr/TypeIcon";
import DeleteSuiteButton from "@/components/restaurant/DeleteSuiteButton";

export const dynamic = "force-dynamic";

const ROLE_LABEL: Record<string, string> = {
  table: "Table",
  menu: "Menu",
  feedback: "Feedback",
  review: "Google Reviews",
};

export default async function SuiteDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = (await getSessionUser())!;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [suite] = await db
    .select()
    .from(suites)
    .where(and(eq(suites.id, id), eq(suites.userId, user.id)))
    .limit(1);
  if (!suite) notFound();

  const qrs = await db
    .select({
      id: qrCodes.id,
      name: qrCodes.name,
      type: qrCodes.type,
      role: qrCodes.role,
      code: qrCodes.code,
      scanCount: count(scans.id),
    })
    .from(qrCodes)
    .leftJoin(scans, eq(scans.qrId, qrCodes.id))
    .where(eq(qrCodes.suiteId, suite.id))
    .groupBy(qrCodes.id)
    .orderBy(qrCodes.createdAt);

  const totalScans = qrs.reduce((s, q) => s + Number(q.scanCount), 0);
  const tableQrs = qrs.filter((q) => q.role === "table");
  const topTable = [...tableQrs].sort(
    (a, b) => Number(b.scanCount) - Number(a.scanCount)
  )[0];

  const feedbackQrIds = qrs.filter((q) => q.role === "feedback").map((q) => q.id);
  const feedbackEntries = feedbackQrIds.length
    ? await db
        .select()
        .from(feedback)
        .where(inArray(feedback.qrId, feedbackQrIds))
        .orderBy(desc(feedback.createdAt))
        .limit(30)
    : [];
  const avgRating = feedbackEntries.length
    ? feedbackEntries.reduce((s, f) => s + f.rating, 0) / feedbackEntries.length
    : null;

  return (
    <div className="space-y-6">
      <Link
        href="/restaurant"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" /> All restaurants
      </Link>

      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="text-2xl font-bold text-gray-900">{suite.name}</h1>
        <div className="flex items-center gap-2">
          <Link
            href={`/print/${suite.id}`}
            className="inline-flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-lg px-4 py-2"
          >
            <Printer className="w-4 h-4" /> Print sticker sheet
          </Link>
          <DeleteSuiteButton suiteId={suite.id} name={suite.name} />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Total scans
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{totalScans}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            QR codes
          </p>
          <p className="text-3xl font-bold text-gray-900 mt-1">{qrs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Busiest table
          </p>
          <p className="text-lg font-bold text-gray-900 mt-1 truncate">
            {topTable && Number(topTable.scanCount) > 0 ? topTable.name : "—"}
          </p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
            Avg. rating
          </p>
          <p className="text-lg font-bold text-gray-900 mt-1 flex items-center gap-1">
            {avgRating ? (
              <>
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {avgRating.toFixed(1)}
              </>
            ) : (
              "—"
            )}
          </p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <h2 className="text-sm font-semibold text-gray-900 mb-3">QR codes</h2>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
          {qrs.map((q) => (
            <Link
              key={q.id}
              href={`/qrcodes/${q.id}`}
              className="flex items-center gap-3 border border-gray-200 hover:border-indigo-300 rounded-lg p-3"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qrcodes/${q.id}/image?size=128`}
                alt={q.name}
                className="w-14 h-14 rounded border border-gray-100 shrink-0"
              />
              <div className="min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">{q.name}</p>
                <p className="text-xs text-gray-500 flex items-center gap-1 mt-0.5">
                  <TypeIcon type={q.type} className="w-3 h-3" />
                  {ROLE_LABEL[q.role ?? ""] ?? q.type} · {q.scanCount} scans
                </p>
              </div>
            </Link>
          ))}
        </div>
      </div>

      {feedbackQrIds.length > 0 && (
        <div className="bg-white rounded-xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Recent feedback ({feedbackEntries.length})
          </h2>
          {feedbackEntries.length === 0 ? (
            <p className="text-sm text-gray-400">
              No feedback yet — the feedback QR works best on tables and bills.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {feedbackEntries.map((f) => (
                <li key={f.id} className="py-3">
                  <div className="flex items-center justify-between">
                    <span className="flex items-center gap-0.5">
                      {[1, 2, 3, 4, 5].map((n) => (
                        <Star
                          key={n}
                          className={`w-3.5 h-3.5 ${
                            f.rating >= n
                              ? "fill-amber-400 text-amber-400"
                              : "text-gray-200"
                          }`}
                        />
                      ))}
                    </span>
                    <span className="text-xs text-gray-400">
                      {f.createdAt.toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {f.comment && <p className="text-sm text-gray-700 mt-1.5">{f.comment}</p>}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
