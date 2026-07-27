-- Admin role.
--
-- Adds users.role so the admin panel has a durable notion of who may see it.
-- ADMIN_EMAILS in the environment can also grant access, which is how the very
-- first admin gets in on a fresh database without hand-editing rows.
--
-- Idempotent; run via `npm run db:migrate`.

BEGIN;

ALTER TABLE users ADD COLUMN IF NOT EXISTS role text NOT NULL DEFAULT 'user';

-- Lets the users list filter admins without a sequential scan once the table grows.
CREATE INDEX IF NOT EXISTS users_role_idx ON users (role);

COMMIT;
