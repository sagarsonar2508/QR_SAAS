/**
 * Manage admin access to /admin.
 *
 *   npm run admin -- list                    show all users and their roles
 *   npm run admin -- grant  you@example.com  make someone an admin
 *   npm run admin -- revoke them@example.com take it away
 *
 * Note the `--`: npm needs it to pass arguments through to the script.
 *
 * Access is granted by users.role = 'admin' OR by listing the address in
 * ADMIN_EMAILS. This script only touches the role column; ADMIN_EMAILS is read
 * from the environment at runtime and always wins, which is what makes it a
 * recovery path if a role is revoked by mistake.
 */
import postgres from "postgres";
import { databaseUrl, redact } from "./db-url.mjs";

const [command, email] = process.argv.slice(2);

const USAGE = `Usage:
  npm run admin -- list
  npm run admin -- grant  <email>
  npm run admin -- revoke <email>`;

if (!command || !["list", "grant", "revoke"].includes(command)) {
  console.log(USAGE);
  process.exit(command ? 1 : 0);
}
if (command !== "list" && !email) {
  console.error(`"${command}" needs an email address.\n\n${USAGE}`);
  process.exit(1);
}

const url = databaseUrl();
console.log(`Database: ${redact(url)}`);

const sql = postgres(url, { max: 1, connect_timeout: 15, onnotice: () => {} });

const envAdmins = (process.env.ADMIN_EMAILS ?? "")
  .split(",")
  .map((e) => e.trim().toLowerCase())
  .filter(Boolean);

try {
  if (command === "list") {
    const rows = await sql`
      SELECT email, name, role, plan, created_at FROM users ORDER BY role DESC, created_at`;

    if (rows.length === 0) {
      console.log("\nNo users yet — sign up in the app first, then grant admin.");
    } else {
      console.log(`\n${rows.length} user(s):\n`);
      for (const r of rows) {
        const viaEnv = envAdmins.includes(r.email.toLowerCase());
        const marks = [
          r.role === "admin" ? "role=admin" : null,
          viaEnv ? "ADMIN_EMAILS" : null,
        ].filter(Boolean);
        console.log(
          `  ${marks.length ? "★" : " "} ${r.email.padEnd(34)} ${String(r.plan).padEnd(9)} ${
            marks.join(" + ") || "—"
          }`
        );
      }
    }

    console.log(
      envAdmins.length
        ? `\nADMIN_EMAILS currently grants: ${envAdmins.join(", ")}`
        : "\nADMIN_EMAILS is not set in this shell. If it's set where the app runs, " +
            "those addresses have access too — this listing can't see them."
    );
  } else {
    const role = command === "grant" ? "admin" : "user";
    const updated = await sql`
      UPDATE users SET role = ${role} WHERE lower(email) = ${email.toLowerCase()}
      RETURNING email, role`;

    if (updated.length === 0) {
      console.error(
        `\nNo user with email "${email}". They must sign up in the app first.`
      );
      process.exit(1);
    }

    console.log(`\n✓ ${updated[0].email} is now role="${updated[0].role}"`);

    if (command === "revoke" && envAdmins.includes(email.toLowerCase())) {
      console.log(
        `\n⚠ ${email} is still listed in ADMIN_EMAILS, so they keep admin access.\n` +
          `  Remove them from that variable too if you meant to lock them out.`
      );
    }
    if (command === "grant") {
      console.log("  No restart needed — the role is read from the database per request.");
    }
  }
} catch (err) {
  const detail = [err.message, err.code].filter(Boolean).join(" | ");
  console.error("\nFailed:", detail || String(err));
  process.exit(1);
} finally {
  await sql.end({ timeout: 5 });
}
