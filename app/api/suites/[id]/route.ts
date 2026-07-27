import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, qrCodes, suites } from "@/db";
import { getSessionUser } from "@/lib/auth";

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [suite] = await db
    .select()
    .from(suites)
    .where(and(eq(suites.id, id), eq(suites.userId, user.id)))
    .limit(1);
  if (!suite) return NextResponse.json({ error: "Not found" }, { status: 404 });

  // Deleting a suite deletes its QRs — printed copies will stop working,
  // which the UI warns about before calling this.
  await db.delete(qrCodes).where(eq(qrCodes.suiteId, suite.id));
  await db.delete(suites).where(eq(suites.id, suite.id));

  return NextResponse.json({ ok: true });
}
