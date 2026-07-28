import { NextResponse } from "next/server";
import { createHash } from "node:crypto";
import { and, count, eq, gte } from "drizzle-orm";
import { db, feedback, qrCodes } from "@/db";
import { POLICIES, enforce } from "@/lib/rate-limit";

// Public endpoint — receives ratings from the hosted feedback page.
export async function POST(req: Request) {
  // Unauthenticated and public, so this is the easiest endpoint to flood.
  const limited = enforce(req, "feedback", POLICIES.feedback);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const code = String(body?.code ?? "");
  const rating = Number(body?.rating);
  const comment = typeof body?.comment === "string" ? body.comment.slice(0, 1000).trim() : null;

  if (!/^[2-9A-Za-z]{6,10}$/.test(code) || !Number.isInteger(rating) || rating < 1 || rating > 5) {
    return NextResponse.json({ error: "Invalid submission" }, { status: 400 });
  }

  const [qr] = await db
    .select({ id: qrCodes.id, active: qrCodes.active })
    .from(qrCodes)
    .where(and(eq(qrCodes.code, code), eq(qrCodes.type, "feedback")))
    .limit(1);
  if (!qr || !qr.active) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const ip = (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  const ipHash = ip
    ? createHash("sha256")
        .update(ip + (process.env.SESSION_SECRET ?? ""))
        .digest("hex")
        .slice(0, 32)
    : null;

  // Light abuse guard: max 5 submissions per QR per IP per hour.
  if (ipHash) {
    const hourAgo = new Date(Date.now() - 3_600_000);
    const [recent] = await db
      .select({ n: count() })
      .from(feedback)
      .where(
        and(
          eq(feedback.qrId, qr.id),
          eq(feedback.ipHash, ipHash),
          gte(feedback.createdAt, hourAgo)
        )
      );
    if (Number(recent?.n ?? 0) >= 5) {
      return NextResponse.json({ error: "Too many submissions — try later" }, { status: 429 });
    }
  }

  await db.insert(feedback).values({
    qrId: qr.id,
    rating,
    comment: comment || null,
    ipHash,
  });

  return NextResponse.json({ ok: true });
}
