import Link from "next/link";
import { notFound } from "next/navigation";
import { and, desc, eq } from "drizzle-orm";
import { ArrowLeft, Download, Sparkles, Star } from "lucide-react";
import { db, feedback, qrCodes } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { qrStats } from "@/lib/stats";
import { QR_TYPES } from "@/lib/qr-types";
import { appUrl } from "@/lib/qr-image";
import Chart from "@/components/Chart";
import TypeIcon from "@/components/qr/TypeIcon";
import CopyButton from "@/components/CopyButton";
import QrActions from "@/components/qr/QrActions";

export const dynamic = "force-dynamic";

export default async function QrDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = (await getSessionUser())!;
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/.test(id)) notFound();

  const [qr] = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, user.id)))
    .limit(1);
  if (!qr) notFound();

  const stats = await qrStats(qr.id);
  const shortUrl = `${appUrl()}/${qr.code}`;

  const feedbackEntries =
    qr.type === "feedback"
      ? await db
          .select()
          .from(feedback)
          .where(eq(feedback.qrId, qr.id))
          .orderBy(desc(feedback.createdAt))
          .limit(50)
      : [];
  const avgRating = feedbackEntries.length
    ? feedbackEntries.reduce((s, f) => s + f.rating, 0) / feedbackEntries.length
    : 0;

  const lineOption = {
    grid: { left: 40, right: 16, top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: stats.daily.map((d) => d.day.slice(5)),
      axisLine: { lineStyle: { color: "#e5e7eb" } },
      axisLabel: { color: "#6b7280", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: "#f3f4f6" } },
      axisLabel: { color: "#6b7280", fontSize: 11 },
    },
    tooltip: { trigger: "axis" },
    series: [
      {
        type: "line",
        data: stats.daily.map((d) => d.count),
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#4f46e5", width: 2.5 },
        areaStyle: { color: "rgba(79,70,229,0.08)" },
      },
    ],
  };

  const downloads = [
    { label: "PNG · 512", href: `/api/qrcodes/${qr.id}/image?size=512&download=1` },
    { label: "PNG · 1024", href: `/api/qrcodes/${qr.id}/image?size=1024&download=1` },
    { label: "PNG · 2048 (print)", href: `/api/qrcodes/${qr.id}/image?size=2048&download=1` },
    { label: "SVG (vector)", href: `/api/qrcodes/${qr.id}/image?format=svg&download=1` },
  ];

  return (
    <div className="space-y-6">
      <Link
        href="/qrcodes"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
      >
        <ArrowLeft className="w-4 h-4" /> All QR codes
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2.5">
            <span className="bg-indigo-50 text-indigo-600 rounded-lg p-2">
              <TypeIcon type={qr.type} className="w-5 h-5" />
            </span>
            {qr.name}
            {!qr.active && (
              <span className="bg-gray-100 text-gray-500 text-xs font-medium rounded px-2 py-1">
                paused
              </span>
            )}
            {qr.redirectRules && (
              <span
                className="inline-flex items-center gap-1 bg-violet-50 text-violet-700 text-xs font-medium rounded px-2 py-1"
                title="Schedule / device rules decide where scans go"
              >
                <Sparkles className="w-3 h-3" /> smart redirects
              </span>
            )}
          </h1>
          <p className="text-sm text-gray-500 mt-1">
            {QR_TYPES[qr.type]?.label ?? qr.type}
            {qr.isDynamic ? " · dynamic" : " · static"} · created{" "}
            {qr.createdAt.toLocaleDateString("en-IN", {
              day: "numeric",
              month: "short",
              year: "numeric",
            })}
          </p>
        </div>
        {qr.isDynamic && (
          <div className="bg-white border border-gray-200 rounded-lg px-3 py-2 flex items-center gap-3">
            <code className="text-sm text-gray-700">{shortUrl.replace(/^https?:\/\//, "")}</code>
            <CopyButton text={shortUrl} />
          </div>
        )}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5 text-center">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={`/api/qrcodes/${qr.id}/image?size=512`}
            alt={qr.name}
            className="w-48 h-48 mx-auto rounded-lg border border-gray-100"
          />
          <div className="grid grid-cols-2 gap-2 mt-4">
            {downloads.map((d) => (
              <a
                key={d.label}
                href={d.href}
                className="inline-flex items-center justify-center gap-1.5 border border-gray-300 hover:border-indigo-400 hover:text-indigo-600 text-gray-700 rounded-lg px-2 py-1.5 text-xs font-medium"
              >
                <Download className="w-3.5 h-3.5" /> {d.label}
              </a>
            ))}
          </div>
          {qr.isDynamic && qr.destination && (
            <p className="text-xs text-gray-400 mt-4 break-all">
              {qr.redirectRules ? "Default destination: " : "Currently points to: "}
              <span className="text-gray-600">{qr.destination}</span>
              {qr.redirectRules && (
                <span className="block mt-1 text-violet-500">
                  Smart rules can send each scan somewhere else — see below.
                </span>
              )}
            </p>
          )}
        </div>

        <div className="lg:col-span-2 space-y-4">
          <div className="grid grid-cols-2 gap-4">
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Total scans
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.totalScans}</p>
            </div>
            <div className="bg-white rounded-2xl border border-gray-200 p-5">
              <p className="text-xs font-medium uppercase tracking-wide text-gray-500">
                Scans today
              </p>
              <p className="text-3xl font-bold text-gray-900 mt-1">{stats.scansToday}</p>
            </div>
          </div>
          <div className="bg-white rounded-2xl border border-gray-200 p-5">
            <h2 className="text-sm font-semibold text-gray-900 mb-2">
              Scans — last 30 days
            </h2>
            {qr.isDynamic ? (
              <Chart option={lineOption} className="h-52 w-full" />
            ) : (
              <p className="text-sm text-gray-400 py-8 text-center">
                Static QR codes are scanned offline — analytics aren&apos;t available.
              </p>
            )}
          </div>
        </div>
      </div>

      <QrActions
        qr={{
          id: qr.id,
          name: qr.name,
          type: qr.type,
          payload: qr.payload,
          active: qr.active,
          isDynamic: qr.isDynamic,
          shape: qr.shape,
          redirectRules: qr.redirectRules ?? null,
        }}
      />

      {qr.type === "feedback" && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900">
              Customer feedback ({feedbackEntries.length})
            </h2>
            {feedbackEntries.length > 0 && (
              <span className="flex items-center gap-1 text-sm font-medium text-gray-700">
                <Star className="w-4 h-4 fill-amber-400 text-amber-400" />
                {avgRating.toFixed(1)} average
              </span>
            )}
          </div>
          {feedbackEntries.length === 0 ? (
            <p className="text-sm text-gray-400">
              No feedback yet — put this QR on tables, bills, or the counter.
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
                  {f.comment && (
                    <p className="text-sm text-gray-700 mt-1.5">{f.comment}</p>
                  )}
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

      {qr.isDynamic && stats.recent.length > 0 && (
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Recent scans</h2>
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-gray-500 uppercase tracking-wide">
                  <th className="py-2 pr-4">Time</th>
                  <th className="py-2 pr-4">Device</th>
                  <th className="py-2 pr-4">OS</th>
                  <th className="py-2 pr-4">Browser</th>
                  <th className="py-2">Location</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {stats.recent.map((s) => (
                  <tr key={s.id} className="text-gray-700">
                    <td className="py-2 pr-4 whitespace-nowrap">
                      {s.ts.toLocaleString("en-IN", {
                        day: "numeric",
                        month: "short",
                        hour: "2-digit",
                        minute: "2-digit",
                      })}
                    </td>
                    <td className="py-2 pr-4 capitalize">{s.device ?? "—"}</td>
                    <td className="py-2 pr-4">{s.os ?? "—"}</td>
                    <td className="py-2 pr-4">{s.browser ?? "—"}</td>
                    <td className="py-2">
                      {[s.city, s.country].filter(Boolean).join(", ") || "—"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
