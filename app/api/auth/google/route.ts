import { NextResponse } from "next/server";
import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { appUrl } from "@/lib/qr-image";

// Google OAuth entry point. Works as soon as GOOGLE_CLIENT_ID and
// GOOGLE_CLIENT_SECRET are set in .env; until then the login page hides
// the button and this route bounces back with an explanatory error.
export async function GET(req: Request) {
  const clientId = process.env.GOOGLE_CLIENT_ID;
  if (!clientId) {
    return NextResponse.redirect(
      new URL("/login?error=google-not-configured", req.url)
    );
  }

  const state = randomBytes(16).toString("hex");
  const store = await cookies();
  store.set("oauth_state", state, {
    httpOnly: true,
    sameSite: "lax",
    maxAge: 600,
    path: "/",
  });

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: `${appUrl()}/api/auth/google/callback`,
    response_type: "code",
    scope: "openid email profile",
    state,
    prompt: "select_account",
  });

  return NextResponse.redirect(
    `https://accounts.google.com/o/oauth2/v2/auth?${params.toString()}`
  );
}
