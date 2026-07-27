import Link from "next/link";
import { desc, eq, count } from "drizzle-orm";
import { Plus, QrCode, Sparkles } from "lucide-react";
import { db, qrCodes, scans } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { QR_TYPES } from "@/lib/qr-types";
import { appUrl } from "@/lib/qr-image";
import TypeIcon from "@/components/qr/TypeIcon";
import CopyButton from "@/components/CopyButton";

export const dynamic = "force-dynamic";

export default async function QrListPage() {
  const user = (await getSessionUser())!;

  const rows = await db
    .select({
      id: qrCodes.id,
      name: qrCodes.name,
      type: qrCodes.type,
      code: qrCodes.code,
      active: qrCodes.active,
      isDynamic: qrCodes.isDynamic,
      redirectRules: qrCodes.redirectRules,
      createdAt: qrCodes.createdAt,
      scanCount: count(scans.id),
    })
    .from(qrCodes)
    .leftJoin(scans, eq(scans.qrId, qrCodes.id))
    .where(eq(qrCodes.userId, user.id))
    .groupBy(qrCodes.id)
    .orderBy(desc(qrCodes.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">QR Codes</h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {rows.length} {rows.length === 1 ? "code" : "codes"} ·{" "}
            {rows.reduce((s, r) => s + r.scanCount, 0)} scans all-time
          </p>
        </div>
        <Link
          href="/qrcodes/new"
          className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold rounded-xl px-4 py-2 shadow-sm shadow-indigo-500/30"
        >
          <Plus className="w-4 h-4" /> New QR Code
        </Link>
      </div>

      {rows.length === 0 ? (
        <div className="bg-white rounded-2xl border border-dashed border-gray-300 p-14 text-center">
          <span className="inline-flex bg-indigo-50 text-indigo-500 rounded-2xl p-4 mb-4">
            <QrCode className="w-8 h-8" />
          </span>
          <p className="text-gray-900 font-semibold mb-1">No QR codes yet</p>
          <p className="text-sm text-gray-500 mb-5">
            Create your first dynamic QR — you can change where it points anytime.
          </p>
          <Link
            href="/qrcodes/new"
            className="inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-sm font-semibold rounded-xl px-4 py-2 shadow-sm shadow-indigo-500/30"
          >
            <Plus className="w-4 h-4" /> Create your first QR code
          </Link>
        </div>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {rows.map((qr) => (
            <div
              key={qr.id}
              className="group bg-white rounded-2xl border border-gray-200 p-4 hover:shadow-md hover:shadow-gray-200/60 hover:-translate-y-0.5 hover:border-indigo-200 transition-all"
            >
              <Link href={`/qrcodes/${qr.id}`} className="flex gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={`/api/qrcodes/${qr.id}/image?size=128`}
                  alt={qr.name}
                  className="w-20 h-20 rounded-xl border border-gray-100 shrink-0 group-hover:scale-105 transition-transform"
                />
                <div className="min-w-0">
                  <p className="font-semibold text-gray-900 truncate flex items-center gap-1.5">
                    <span
                      className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                        qr.active ? "bg-emerald-500" : "bg-gray-300"
                      }`}
                      title={qr.active ? "Active" : "Paused"}
                    />
                    <span className="truncate">{qr.name}</span>
                  </p>
                  <p className="flex flex-wrap items-center gap-1.5 text-xs text-gray-500 mt-1">
                    <TypeIcon type={qr.type} className="w-3.5 h-3.5" />
                    {QR_TYPES[qr.type]?.label ?? qr.type}
                    {!qr.isDynamic && (
                      <span className="bg-amber-50 text-amber-700 rounded px-1.5 py-0.5">
                        static
                      </span>
                    )}
                    {!qr.active && (
                      <span className="bg-gray-100 text-gray-500 rounded px-1.5 py-0.5">
                        paused
                      </span>
                    )}
                    {qr.redirectRules && (
                      <span
                        className="inline-flex items-center gap-0.5 bg-violet-50 text-violet-700 rounded px-1.5 py-0.5"
                        title="Smart redirects active (schedule / device targeting)"
                      >
                        <Sparkles className="w-3 h-3" /> smart
                      </span>
                    )}
                  </p>
                  <p className="text-sm text-gray-700 mt-2 font-medium">
                    {qr.scanCount} scans
                  </p>
                </div>
              </Link>
              {qr.isDynamic && (
                <div className="flex items-center justify-between mt-3 pt-3 border-t border-gray-100">
                  <code className="text-xs text-gray-500 truncate">
                    {appUrl().replace(/^https?:\/\//, "")}/{qr.code}
                  </code>
                  <CopyButton text={`${appUrl()}/${qr.code}`} />
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
