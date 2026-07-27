import type { Metadata } from "next";
import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { ArrowLeft } from "lucide-react";
import { db, qrCodes, suites } from "@/db";
import { getSessionUser } from "@/lib/auth";
import PrintButton from "@/components/restaurant/PrintButton";

// Private print sheet — not for search indexes.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

const ROLE_CAPTION: Record<string, string> = {
  table: "Scan for menu",
  menu: "Scan for menu",
  feedback: "Rate your experience",
  review: "Review us on Google",
};

// A4 print sheet of QR stickers — use the browser's Print → Save as PDF.
export default async function PrintSheetPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

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
      role: qrCodes.role,
    })
    .from(qrCodes)
    .where(eq(qrCodes.suiteId, suite.id))
    .orderBy(qrCodes.createdAt);

  return (
    <div className="min-h-screen bg-white text-gray-900 p-8 print:p-0">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8 print:hidden">
          <Link
            href={`/restaurant/${suite.id}`}
            className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900"
          >
            <ArrowLeft className="w-4 h-4" /> Back to {suite.name}
          </Link>
          <PrintButton />
        </div>

        <div className="grid grid-cols-3 gap-4">
          {qrs.map((q) => (
            <div
              key={q.id}
              className="border-2 border-dashed border-gray-300 rounded-xl p-4 text-center break-inside-avoid"
            >
              <p className="font-bold text-sm truncate">{suite.name}</p>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={`/api/qrcodes/${q.id}/image?size=512`}
                alt={q.name}
                className="w-full aspect-square my-2"
              />
              <p className="font-bold text-lg leading-tight">{q.name}</p>
              <p className="text-xs text-gray-500 mt-0.5">
                {ROLE_CAPTION[q.role ?? ""] ?? "Scan me"}
              </p>
            </div>
          ))}
        </div>

        <p className="text-center text-xs text-gray-400 mt-8 print:hidden">
          Tip: print on A4 sticker paper, or save as PDF and send to your print shop.
          Cut along the dashed lines.
        </p>
      </div>
    </div>
  );
}
