-- Google OAuth sign-in.
--
-- users.google_id was added to schema.ts when the Google login route landed but
-- never shipped as SQL, so databases created by the original `drizzle-kit push`
-- are missing it — the callback's `WHERE google_id = $1` lookup errors out and
-- the route 500s after the user picks their account.
--
-- password_hash also has to be nullable: a Google-only user never sets one.
--
-- Idempotent; run via `npm run db:migrate`.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS google_id text;
ALTER TABLE users ALTER COLUMN password_hash DROP NOT NULL;

-- Matches the .unique() on schema.ts's googleId. Partial so that the many
-- password-only users (google_id IS NULL) don't collide with each other.
CREATE UNIQUE INDEX IF NOT EXISTS users_google_id_unique
  ON users (google_id) WHERE google_id IS NOT NULL;

COMMIT;
