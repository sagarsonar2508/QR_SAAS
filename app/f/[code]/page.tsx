import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { db, qrCodes, suites } from "@/db";
import FeedbackForm from "@/components/FeedbackForm";

// Customer-facing feedback form — not for search indexes.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export const dynamic = "force-dynamic";

// Public feedback page — the destination of "feedback" QR codes.
export default async function FeedbackPage({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { code } = await params;
  const [qr] = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.code, code), eq(qrCodes.type, "feedback")))
    .limit(1);
  if (!qr || !qr.active) notFound();

  let businessName: string | undefined;
  if (qr.suiteId) {
    const [suite] = await db
      .select({ name: suites.name })
      .from(suites)
      .where(eq(suites.id, qr.suiteId))
      .limit(1);
    businessName = suite?.name;
  }

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 py-10">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
        <FeedbackForm
          code={qr.code}
          question={qr.payload.question || "How was your experience?"}
          googleReviewUrl={qr.payload.googleReviewUrl}
          businessName={businessName}
        />
      </div>
    </div>
  );
}
