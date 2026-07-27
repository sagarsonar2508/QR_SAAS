import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth";
import { applySubscriptionState, defaultProvider, getProvider, isProviderId } from "@/lib/billing";

// Called by the client right after a modal checkout succeeds, purely so the UI
// can activate immediately. The webhook remains the source of truth — this only
// ever applies state the provider itself signed.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "Missing payment details" }, { status: 400 });
  }

  const requested = typeof body.provider === "string" ? body.provider : null;
  const provider =
    requested && isProviderId(requested) ? getProvider(requested) : defaultProvider();
  if (!provider || !provider.isConfigured()) {
    return NextResponse.json({ error: "Billing not configured" }, { status: 400 });
  }

  const state = provider.verifyClientCallback(body as Record<string, string>);
  if (!state) {
    return NextResponse.json({ error: "Signature verification failed" }, { status: 400 });
  }

  const result = await applySubscriptionState(provider.id, state);
  if (!result.ok) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }
  if (result.userId !== user.id) {
    return NextResponse.json({ error: "Subscription not found" }, { status: 404 });
  }

  return NextResponse.json({ ok: true, plan: result.plan });
}
