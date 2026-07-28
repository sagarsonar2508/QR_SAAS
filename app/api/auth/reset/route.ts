import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { hashPassword } from "@/lib/auth";
import { consumeToken, resolveToken, revokeAllSessions } from "@/lib/auth-tokens";
import { passwordChangedEmail, sendMail } from "@/lib/mailer";
import { POLICIES, enforce } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const limited = enforce(req, "reset", POLICIES.reset);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const token = (body?.token ?? "").trim();
  const password = body?.password ?? "";

  // Validate the new password *before* spending the token, so a too-short
  // password doesn't burn the link and force another email.
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters" },
      { status: 400 }
    );
  }

  const resolved = await resolveToken(token, "reset");
  if (!resolved) {
    return NextResponse.json(
      { error: "This reset link is invalid or has expired. Request a new one." },
      { status: 400 }
    );
  }

  // Consume first: if two submissions race, only one gets past this point.
  if (!(await consumeToken(resolved.id))) {
    return NextResponse.json(
      { error: "This reset link has already been used." },
      { status: 400 }
    );
  }

  const passwordHash = await hashPassword(password);
  await db
    .update(users)
    .set({
      passwordHash,
      // Completing a reset proves control of the inbox, so the address is
      // verified by the same act.
      emailVerifiedAt: resolved.user.emailVerifiedAt ?? new Date(),
    })
    .where(eq(users.id, resolved.user.id));

  // Whoever held this account before — legitimately or not — is signed out.
  await revokeAllSessions(resolved.user.id);

  const mail = passwordChangedEmail(resolved.user.name);
  await sendMail({ ...mail, to: resolved.user.email });

  return NextResponse.json({ ok: true });
}
