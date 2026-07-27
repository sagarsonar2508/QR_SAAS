import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** DATABASE_URL from the environment, falling back to env files.
 *
 *  `.env.local` is checked before `.env`, matching Next.js' own precedence — so
 *  these scripts and the app always agree on which database they're talking to.
 *  Keeping them in sync matters: a migration run against the wrong database is
 *  hard to notice and worse to undo. */
export function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  for (const file of [".env.local", ".env"]) {
    const path = join(projectRoot, file);
    if (!existsSync(path)) continue;
    const match = readFileSync(path, "utf8").match(/^DATABASE_URL=(.*)$/m);
    if (match?.[1].trim()) return match[1].trim();
  }

  console.error("DATABASE_URL is not set (checked env, .env.local, .env).");
  process.exit(1);
}

/** Password-free rendering, safe to print in logs. */
export function redact(url) {
  return url.replace(/:\/\/([^:]+):[^@]*@/, "://$1:***@");
}
