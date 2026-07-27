/**
 * SQL migration runner.
 *
 * Applies every drizzle/*.sql file, in filename order, that hasn't been applied
 * to this database yet — tracked in the `_migrations` table. Safe to run on
 * every deploy: already-applied files are skipped.
 *
 *   npm run db:migrate            # uses DATABASE_URL, falling back to .env
 *   npm run db:migrate -- --dry   # list what would run, change nothing
 *
 * Uses the `postgres` package from dependencies, so no psql binary is needed.
 *
 * Convention: migrations must be idempotent. The runner records a file as
 * applied only after it succeeds, so a crash between the two leaves the file to
 * be re-run on the next invocation.
 */
import postgres from "postgres";
import { readFileSync, readdirSync, existsSync } from "node:fs";
import { join } from "node:path";
import { databaseUrl, projectRoot, redact } from "./db-url.mjs";

const dir = join(projectRoot, "drizzle");
const dryRun = process.argv.includes("--dry");

const url = databaseUrl();
console.log(`Database: ${redact(url)}`);

const files = existsSync(dir)
  ? readdirSync(dir)
      .filter((f) => f.endsWith(".sql"))
      .sort()
  : [];

if (files.length === 0) {
  console.log("No .sql migrations found in drizzle/.");
  process.exit(0);
}

const sql = postgres(url, { max: 1, connect_timeout: 15, onnotice: () => {} });

try {
  await sql`
    CREATE TABLE IF NOT EXISTS _migrations (
      name text PRIMARY KEY,
      applied_at timestamptz NOT NULL DEFAULT now()
    )`;

  const applied = new Set(
    (await sql`SELECT name FROM _migrations`).map((r) => r.name)
  );

  const pending = files.filter((f) => !applied.has(f));
  if (pending.length === 0) {
    console.log(`Up to date — ${files.length} migration(s) already applied.`);
    process.exit(0);
  }

  console.log(`Pending: ${pending.join(", ")}`);
  if (dryRun) {
    console.log("Dry run — nothing was changed.");
    process.exit(0);
  }

  for (const file of pending) {
    process.stdout.write(`  applying ${file} ... `);
    // The file manages its own BEGIN/COMMIT.
    await sql.unsafe(readFileSync(join(dir, file), "utf8"));
    await sql`INSERT INTO _migrations (name) VALUES (${file})
              ON CONFLICT (name) DO NOTHING`;
    console.log("ok");
  }

  console.log(`Applied ${pending.length} migration(s).`);
} catch (err) {
  // Connection errors from postgres.js often carry an empty message, so fall
  // back to the error code — a silent failure in CI is worse than a terse one.
  const detail = [err.message, err.code, err.detail, err.hint]
    .filter(Boolean)
    .join(" | ");
  console.error("\nMigration failed:", detail || String(err));
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
