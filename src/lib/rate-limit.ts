import { NextResponse } from "next/server";

/**
 * Fixed-window rate limiting, in process memory.
 *
 * Scope: this app runs as a single Node process, so an in-memory counter is
 * accurate and costs nothing. If it is ever scaled to multiple instances each
 * one keeps its own counters and the effective limit multiplies by the instance
 * count — at that point move the store to Postgres or Redis. The interface here
 * stays the same.
 *
 * Deliberately not applied to the /<code> redirect path: a popular QR code is
 * *supposed* to be hit hard, and throttling scans would break printed material.
 * Cloudflare handles volumetric abuse there.
 */

type Bucket = { count: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Hard cap on tracked keys so a flood of unique IPs can't exhaust memory.
 *  When exceeded, expired entries are dropped first, then the oldest. */
const MAX_KEYS = 50_000;

export type Policy = {
  /** Requests permitted per window. */
  limit: number;
  /** Window length in seconds. */
  windowSec: number;
  /** Shown to the client when the limit is hit. */
  message?: string;
};

/** Per-route policies. Auth endpoints are strict because they guard credentials;
 *  write endpoints are looser but still bounded; reads are generous. */
export const POLICIES = {
  login: { limit: 8, windowSec: 300, message: "Too many sign-in attempts. Try again in a few minutes." },
  signup: { limit: 5, windowSec: 3600, message: "Too many accounts created from this network. Try again later." },
  forgot: { limit: 5, windowSec: 3600, message: "Too many reset requests. Try again later." },
  reset: { limit: 10, windowSec: 3600, message: "Too many attempts. Try again later." },
  verifyResend: { limit: 5, windowSec: 3600, message: "Too many verification emails requested. Try again later." },
  write: { limit: 60, windowSec: 60, message: "You're going too fast. Please slow down." },
  feedback: { limit: 15, windowSec: 3600, message: "Too many submissions. Please try again later." },
  billing: { limit: 20, windowSec: 300, message: "Too many billing requests. Try again shortly." },
} satisfies Record<string, Policy>;

function sweep(now: number) {
  for (const [key, b] of buckets) {
    if (b.resetAt <= now) buckets.delete(key);
  }
  // Still oversized after dropping expired entries: evict oldest-first. Map
  // preserves insertion order, so the first keys are the least recently created.
  if (buckets.size > MAX_KEYS) {
    const excess = buckets.size - MAX_KEYS;
    let i = 0;
    for (const key of buckets.keys()) {
      if (i++ >= excess) break;
      buckets.delete(key);
    }
  }
}

/**
 * The identity being limited. Behind Cloudflare, CF-Connecting-IP is set by the
 * edge and cannot be forged; X-Forwarded-For is client-appendable so it is only
 * a fallback for deployments with no CDN in front.
 */
export function clientKey(req: Request): string {
  const ip =
    req.headers.get("cf-connecting-ip") ??
    (req.headers.get("x-forwarded-for") ?? "").split(",")[0].trim();
  return ip || "unknown";
}

export type RateResult = {
  ok: boolean;
  remaining: number;
  retryAfterSec: number;
};

/** Count a hit against `name:id` and report whether it is allowed. */
export function rateLimit(name: string, id: string, policy: Policy): RateResult {
  const now = Date.now();
  if (buckets.size > 1000 && Math.random() < 0.01) sweep(now);

  const key = `${name}:${id}`;
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + policy.windowSec * 1000 });
    return { ok: true, remaining: policy.limit - 1, retryAfterSec: policy.windowSec };
  }

  existing.count += 1;
  const retryAfterSec = Math.max(1, Math.ceil((existing.resetAt - now) / 1000));
  return {
    ok: existing.count <= policy.limit,
    remaining: Math.max(0, policy.limit - existing.count),
    retryAfterSec,
  };
}

/**
 * Guard a route handler. Returns a 429 response to return early, or null when
 * the request may proceed.
 *
 *   const limited = enforce(req, "login", POLICIES.login);
 *   if (limited) return limited;
 *
 * `extraKey` narrows the bucket beyond the IP — e.g. the email being targeted,
 * so one attacker cycling IPs still can't grind a single account.
 */
export function enforce(
  req: Request,
  name: string,
  policy: Policy,
  extraKey?: string
): NextResponse | null {
  const id = extraKey ? `${clientKey(req)}|${extraKey}` : clientKey(req);
  const result = rateLimit(name, id, policy);
  if (result.ok) return null;

  return NextResponse.json(
    { error: policy.message ?? "Too many requests. Please try again later." },
    {
      status: 429,
      headers: {
        "Retry-After": String(result.retryAfterSec),
        "X-RateLimit-Limit": String(policy.limit),
        "X-RateLimit-Remaining": "0",
      },
    }
  );
}

/** Test-only: drop all counters. */
export function __resetRateLimits() {
  buckets.clear();
}
