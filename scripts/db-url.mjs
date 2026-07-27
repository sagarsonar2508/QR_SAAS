import { readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

export const projectRoot = join(dirname(fileURLToPath(import.meta.url)), "..");

/** DATABASE_URL from the environment, falling back to the local .env file.
 *  On a server the environment should supply it; the .env fallback is a local
 *  development convenience. */
export function databaseUrl() {
  if (process.env.DATABASE_URL) return process.env.DATABASE_URL;

  const envFile = join(projectRoot, ".env");
  if (existsSync(envFile)) {
    const match = readFileSync(envFile, "utf8").match(/^DATABASE_URL=(.*)$/m);
    if (match) return match[1].trim();
  }

  console.error("DATABASE_URL is not set.");
  process.exit(1);
}

/** Password-free rendering, safe to print in logs. */
export function redact(url) {
  return url.replace(/:\/\/([^:]+):[^@]*@/, "://$1:***@");
}
