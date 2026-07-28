-- Email verification and password reset.
--
-- Adds users.email_verified_at and a single-use token table serving both flows.
-- Tokens are stored as SHA-256 hashes, never in plaintext: a leaked database
-- backup must not hand someone the ability to take over accounts.
--
-- Idempotent; run via `npm run db:migrate`.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS email_verified_at timestamptz;

-- Accounts that existed before verification was introduced are grandfathered in.
-- They were created when no verification was required, so locking them out now
-- would be a regression for real users rather than a security improvement.
UPDATE users SET email_verified_at = created_at WHERE email_verified_at IS NULL;

-- Google accounts are verified by Google; nothing further to prove.
UPDATE users SET email_verified_at = COALESCE(email_verified_at, now())
WHERE google_id IS NOT NULL;

CREATE TABLE IF NOT EXISTS auth_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  -- 'verify' | 'reset'
  kind text NOT NULL,
  token_hash text NOT NULL,
  expires_at timestamptz NOT NULL,
  used_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now()
);

-- Lookup is always by hash; unique so a hash collision can't yield two rows.
CREATE UNIQUE INDEX IF NOT EXISTS auth_tokens_hash_idx ON auth_tokens (token_hash);
-- Used when invalidating a user's outstanding tokens of a given kind.
CREATE INDEX IF NOT EXISTS auth_tokens_user_kind_idx ON auth_tokens (user_id, kind);

COMMIT;
