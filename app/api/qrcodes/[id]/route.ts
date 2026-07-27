import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, qrCodes } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { QR_TYPES, buildDestination, validatePayload } from "@/lib/qr-types";
import { parseRedirectRules } from "@/lib/redirect-rules";

async function ownedQr(id: string, userId: string) {
  const [qr] = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, userId)))
    .limit(1);
  return qr ?? null;
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const qr = await ownedQr(id, user.id);
  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const updates: Partial<typeof qrCodes.$inferInsert> = { updatedAt: new Date() };

  if (typeof body.name === "string" && body.name.trim()) {
    updates.name = body.name.trim();
  }
  if (typeof body.active === "boolean") {
    updates.active = body.active;
  }
  const shapes = ["square", "rounded", "dots", "classy", "classy-rounded", "extra-rounded"];
  if (typeof body.shape === "string" && shapes.includes(body.shape)) {
    updates.shape = body.shape;
  }
  if (body.logoUrl === null) {
    updates.logoUrl = null;
  } else if (
    typeof body.logoUrl === "string" &&
    /^(\/files\/|https?:\/\/)/.test(body.logoUrl)
  ) {
    updates.logoUrl = body.logoUrl;
  }

  // Smart redirects: explicit null clears rules; an object replaces them.
  if ("redirectRules" in body && qr.isDynamic) {
    const parsed = parseRedirectRules(body.redirectRules);
    if (parsed.error) {
      return NextResponse.json({ error: parsed.error }, { status: 400 });
    }
    updates.redirectRules = parsed.rules;
  }

  // Editing the payload re-resolves the destination — the whole point of
  // dynamic QRs. Static QRs (wifi/vcard) can also update payload, but the
  // printed image won't change; the UI warns about that.
  if (body.payload && typeof body.payload === "object") {
    const def = QR_TYPES[qr.type];
    const payload: Record<string, string> = {};
    for (const field of def.fields) {
      const v = body.payload[field.key];
      if (typeof v === "string" && v.trim()) payload[field.key] = v.trim();
    }
    const validationError = validatePayload(qr.type, payload);
    if (validationError) {
      return NextResponse.json({ error: validationError }, { status: 400 });
    }
    updates.payload = payload;
    if (qr.isDynamic && qr.type !== "feedback") {
      updates.destination = buildDestination(qr.type, payload) ?? "";
    }
  }

  await db.update(qrCodes).set(updates).where(eq(qrCodes.id, qr.id));
  return NextResponse.json({ ok: true });
}

export async function DELETE(
  _req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const qr = await ownedQr(id, user.id);
  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  await db.delete(qrCodes).where(eq(qrCodes.id, qr.id));
  return NextResponse.json({ ok: true });
}
