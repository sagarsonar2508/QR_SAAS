import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { consumeToken, issueToken, resolveToken } from "@/lib/auth-tokens";
import { mailConfigured, sendMail, verificationEmail } from "@/lib/mailer";
import { POLICIES, enforce } from "@/lib/rate-limit";

/** Confirm an email address from the link in the verification mail. */
export async function POST(req: Request) {
  const limited = enforce(req, "verify", POLICIES.reset);
  if (limited) return limited;

  const body = await req.json().catch(() => null);
  const token = (body?.token ?? "").trim();

  const resolved = await resolveToken(token, "verify");
  if (!resolved) {
    return NextResponse.json(
      { error: "This confirmation link is invalid or has expired." },
      { status: 400 }
    );
  }
  if (!(await consumeToken(resolved.id))) {
    return NextResponse.json({ error: "This link has already been used." }, { status: 400 });
  }

  // Already-verified accounts keep their original timestamp; re-verifying is a
  // no-op rather than an error, since a user clicking an old link twice hasn't
  // done anything wrong.
  if (!resolved.user.emailVerifiedAt) {
    await db
      .update(users)
      .set({ emailVerifiedAt: new Date() })
      .where(eq(users.id, resolved.user.id));
  }

  return NextResponse.json({ ok: true });
}

/** Re-send the verification email to the signed-in user. */
export async function PUT(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited =
    enforce(req, "verify-resend", POLICIES.verifyResend) ??
    enforce(req, "verify-resend-user", POLICIES.verifyResend, user.id);
  if (limited) return limited;

  if (user.emailVerifiedAt) {
    return NextResponse.json({ ok: true, alreadyVerified: true });
  }
  if (!mailConfigured()) {
    return NextResponse.json(
      { error: "Email isn't configured on this server yet — contact support." },
      { status: 503 }
    );
  }

  const token = await issueToken(user.id, "verify");
  const mail = verificationEmail(user.name, token);
  const sent = await sendMail({ ...mail, to: user.email });

  if (!sent) {
    return NextResponse.json(
      { error: "We couldn't send the email just now. Please try again shortly." },
      { status: 502 }
    );
  }
  return NextResponse.json({ ok: true });
}
