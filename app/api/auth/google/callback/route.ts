import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { eq } from "drizzle-orm";
import { db, users } from "@/db";
import { createSession } from "@/lib/auth";
import { appUrl } from "@/lib/qr-image";

export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
  if (!clientId || !clientSecret) {
    return NextResponse.redirect(new URL("/login?error=google-not-configured", req.url));
  }

  const url = new URL(req.url);
  const code = url.searchParams.get("code");
  const state = url.searchParams.get("state");
  const store = await cookies();
  const expectedState = store.get("oauth_state")?.value;
  store.delete("oauth_state");

  if (!code || !state || state !== expectedState) {
    return NextResponse.redirect(new URL("/login?error=oauth-failed", req.url));
  }

  const tokenRes = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      code,
      client_id: clientId,
      client_secret: clientSecret,
      redirect_uri: `${appUrl()}/api/auth/google/callback`,
      grant_type: "authorization_code",
    }),
  });
  if (!tokenRes.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth-failed", req.url));
  }
  const tokens = (await tokenRes.json()) as { access_token: string };

  const infoRes = await fetch("https://www.googleapis.com/oauth2/v2/userinfo", {
    headers: { Authorization: `Bearer ${tokens.access_token}` },
  });
  if (!infoRes.ok) {
    return NextResponse.redirect(new URL("/login?error=oauth-failed", req.url));
  }
  const info = (await infoRes.json()) as {
    id: string;
    email: string;
    name?: string;
  };

  const email = info.email.toLowerCase();
  let [user] = await db.select().from(users).where(eq(users.googleId, info.id)).limit(1);
  if (!user) {
    // Link by email if the user signed up with a password first.
    const [byEmail] = await db.select().from(users).where(eq(users.email, email)).limit(1);
    if (byEmail) {
      [user] = await db
        .update(users)
        .set({ googleId: info.id })
        .where(eq(users.id, byEmail.id))
        .returning();
    } else {
      [user] = await db
        .insert(users)
        .values({ email, name: info.name ?? email.split("@")[0], googleId: info.id })
        .returning();
    }
  }

  await createSession(user.id);
  return NextResponse.redirect(new URL("/dashboard", req.url));
}
