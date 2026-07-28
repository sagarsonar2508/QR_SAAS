import { NextResponse } from "next/server";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { createSession, verifyPassword } from "@/lib/auth";
import { POLICIES, enforce } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const body = await req.json().catch(() => null);
  const email = (body?.email ?? "").trim().toLowerCase();
  const password = body?.password ?? "";

  // Limited per IP *and* per target address, so rotating IPs can't grind one
  // account and a single IP can't spray many accounts.
  const limited =
    enforce(req, "login", POLICIES.login) ??
    (email ? enforce(req, "login-email", POLICIES.login, email) : null);
  if (limited) return limited;

  const [user] = await db.select().from(users).where(eq(users.email, email)).limit(1);
  if (!user?.passwordHash || !(await verifyPassword(password, user.passwordHash))) {
    // Identical message either way — saying which half was wrong would reveal
    // which addresses have accounts.
    return NextResponse.json({ error: "Invalid email or password" }, { status: 401 });
  }

  await createSession(user.id);
  return NextResponse.json({ ok: true });
}
