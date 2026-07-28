/**
 * Validates a post-login redirect target.
 *
 * A `?next=` parameter is attacker-controllable, so it is never used as given.
 * Only a same-site absolute path is allowed: anything protocol-relative
 * ("//evil.com"), absolute ("https://evil.com") or backslash-obfuscated
 * ("/\\evil.com") is rejected and the caller falls back to its default.
 */
export function safeNextPath(value: string | null | undefined, fallback = "/dashboard"): string {
  if (!value) return fallback;

  const path = value.trim();
  if (!path.startsWith("/")) return fallback;
  // "//host" and "/\host" are both read as protocol-relative by browsers.
  if (path.startsWith("//") || path.startsWith("/\\")) return fallback;
  if (path.includes("://")) return fallback;

  return path;
}

/** Where a pricing CTA should send someone, preserving which plan they picked
 *  so they don't have to choose it again after signing up. */
export function checkoutPath(tier: string, period: "monthly" | "yearly" = "monthly") {
  return `/billing?plan=${encodeURIComponent(tier)}&period=${period}`;
}

/** The CTA target for a plan card: straight to checkout when signed in,
 *  otherwise sign up first and carry the intent through. */
export function planCtaHref(tier: string, signedIn: boolean, period: "monthly" | "yearly" = "monthly") {
  if (tier === "free") return signedIn ? "/dashboard" : "/signup";
  const next = checkoutPath(tier, period);
  return signedIn ? next : `/signup?next=${encodeURIComponent(next)}`;
}
