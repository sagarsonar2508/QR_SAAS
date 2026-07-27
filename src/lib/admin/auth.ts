import { notFound } from "next/navigation";
import { getSessionUser } from "@/lib/auth";
import type { User } from "@/db";

/** Emails granted admin regardless of their row's role. This is the bootstrap
 *  path: it lets the first admin in on a fresh database without hand-editing
 *  rows, and it is a recovery path if someone revokes their own role. */
function bootstrapEmails(): string[] {
  return (process.env.ADMIN_EMAILS ?? "")
    .split(",")
    .map((e) => e.trim().toLowerCase())
    .filter(Boolean);
}

export function isAdminUser(user: Pick<User, "email" | "role">): boolean {
  return (
    user.role === "admin" || bootstrapEmails().includes(user.email.toLowerCase())
  );
}

/**
 * Gate for every admin surface. Returns the user, or renders 404.
 *
 * 404 rather than 403 on purpose: a signed-in non-admin who pokes at /admin
 * learns nothing about whether the panel exists. Redirecting to /dashboard would
 * confirm it does.
 */
export async function requireAdmin(): Promise<User> {
  const user = await getSessionUser();
  if (!user || !isAdminUser(user)) notFound();
  return user;
}

/** Whether anyone can reach the panel at all. Surfaced on the system page so a
 *  misconfigured deploy is visible rather than silently locking everyone out. */
export function adminBootstrapConfigured(): boolean {
  return bootstrapEmails().length > 0;
}
