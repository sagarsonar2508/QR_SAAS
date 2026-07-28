import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { issueToken, pruneExpiredTokens } from "@/lib/auth-tokens";
import { passwordResetEmail, sendMail } from "@/lib/mailer";
import { POLICIES, enforce } from "@/lib/rate-limit";

/**
 * Start a password reset.
 *
 * Always answers the same way, whether or not the address has an account. A
 * differing response would turn this endpoint into a way to test which emails
 * are registered.
 */
export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = (body?.email ?? "").trim().toLowerCase();

  const limited =
    enforce(req, "forgot", POLICIES.forgot) ??
    (email ? enforce(req, "forgot-email", POLICIES.forgot, email) : null);
  if (limited) return limited;

  const ok = NextResponse.json({
    ok: true,
    message: "If that email has an account, a reset link is on its way.",
  });

  if (!/^\S+@\S+\.\S+$/.test(email)) return ok;

  const [user] = await db
    .select({ id: users.id, name: users.name, email: users.email, passwordHash: users.passwordHash })
    .from(users)
    .where(eq(users.email, email))
    .limit(1);

  // Google-only accounts have no password to reset; sending a link would be
  // confusing and pointless. Silent, for the same enumeration reason.
  if (!user || !user.passwordHash) return ok;

  const token = await issueToken(user.id, "reset");
  const mail = passwordResetEmail(user.name, token);
  await sendMail({ ...mail, to: user.email });
  void pruneExpiredTokens();

  return ok;
}
