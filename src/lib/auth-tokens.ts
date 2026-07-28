import { createHash, randomBytes, timingSafeEqual } from "node:crypto";
import { and, eq, isNull, lt, or } from "drizzle-orm";
import { db, authTokens, users, sessions, type User } from "@/db";

export type TokenKind = "verify" | "reset";

const TTL_MS: Record<TokenKind, number> = {
  verify: 24 * 60 * 60 * 1000, // 24 hours
  reset: 60 * 60 * 1000, //  1 hour — shorter, it's the higher-value target
};

/** Tokens are compared by hash, so only the hash is ever stored. */
function hash(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

/**
 * Mint a single-use token and return the plaintext, which is only ever seen
 * here and in the email. 32 random bytes is far beyond guessable.
 *
 * Any outstanding token of the same kind is invalidated first: requesting a new
 * reset link must retire the previous one, otherwise an old email forwarded or
 * leaked later still works.
 */
export async function issueToken(userId: string, kind: TokenKind): Promise<string> {
  await db
    .delete(authTokens)
    .where(and(eq(authTokens.userId, userId), eq(authTokens.kind, kind)));

  const token = randomBytes(32).toString("base64url");
  await db.insert(authTokens).values({
    userId,
    kind,
    tokenHash: hash(token),
    expiresAt: new Date(Date.now() + TTL_MS[kind]),
  });
  return token;
}

/**
 * Look up an unused, unexpired token and return its owner.
 *
 * Does not consume it — callers validate first (so a bad new password doesn't
 * burn the link), then call `consumeToken` once the action succeeds.
 */
export async function resolveToken(
  token: string,
  kind: TokenKind
): Promise<{ id: string; user: User } | null> {
  if (!token || token.length < 20) return null;

  const [row] = await db
    .select({ id: authTokens.id, expiresAt: authTokens.expiresAt, usedAt: authTokens.usedAt, user: users })
    .from(authTokens)
    .innerJoin(users, eq(authTokens.userId, users.id))
    .where(and(eq(authTokens.tokenHash, hash(token)), eq(authTokens.kind, kind)))
    .limit(1);

  if (!row || row.usedAt || row.expiresAt.getTime() < Date.now()) return null;
  return { id: row.id, user: row.user };
}

/** Mark a token spent. Returns false if something else already used it, which
 *  is how a double-submitted reset form is prevented from running twice. */
export async function consumeToken(id: string): Promise<boolean> {
  const rows = await db
    .update(authTokens)
    .set({ usedAt: new Date() })
    .where(and(eq(authTokens.id, id), isNull(authTokens.usedAt)))
    .returning({ id: authTokens.id });
  return rows.length > 0;
}

/** Sign the user out everywhere. Called after a password reset: whoever had the
 *  account before, legitimately or not, loses their sessions. */
export async function revokeAllSessions(userId: string): Promise<void> {
  await db.delete(sessions).where(eq(sessions.userId, userId));
}

/** Housekeeping so the table doesn't grow without bound. Cheap enough to run
 *  opportunistically whenever a token is issued. */
export async function pruneExpiredTokens(): Promise<void> {
  await db
    .delete(authTokens)
    .where(or(lt(authTokens.expiresAt, new Date()), lt(authTokens.usedAt, new Date())));
}

/** Constant-time compare, for anywhere a secret is checked directly. */
export function safeEqual(a: string, b: string): boolean {
  const ba = Buffer.from(a);
  const bb = Buffer.from(b);
  return ba.length === bb.length && timingSafeEqual(ba, bb);
}
