-- Multi-provider billing migration.
--
-- Moves the billing tables off Razorpay-specific column names and onto a
-- provider-agnostic shape, then adds the customer-mapping and webhook-idempotency
-- tables. Existing rows are backfilled as (provider='razorpay', currency='INR'),
-- which is what they were.
--
-- Run this ONCE against each environment BEFORE `npm run db:push`. Renames must
-- happen here: drizzle-kit push sees a rename as a drop + add and would lose the
-- provider ids. The script is idempotent, so re-running it is harmless.

BEGIN;

-- ---------------------------------------------------------------- billing_plans
ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS provider text;
ALTER TABLE billing_plans ADD COLUMN IF NOT EXISTS currency text;
ALTER TABLE billing_plans
  ADD COLUMN IF NOT EXISTS created_at timestamptz NOT NULL DEFAULT now();

UPDATE billing_plans SET provider = 'razorpay' WHERE provider IS NULL;
UPDATE billing_plans SET currency = 'INR' WHERE currency IS NULL;

ALTER TABLE billing_plans ALTER COLUMN provider SET NOT NULL;
ALTER TABLE billing_plans ALTER COLUMN currency SET NOT NULL;

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'billing_plans' AND column_name = 'razorpay_plan_id'
  ) THEN
    ALTER TABLE billing_plans RENAME COLUMN razorpay_plan_id TO provider_plan_id;
  END IF;
END $$;

-- Repoint the primary key at (provider, tier, period, currency).
DO $$
DECLARE cname text;
BEGIN
  SELECT constraint_name INTO cname
  FROM information_schema.table_constraints
  WHERE table_name = 'billing_plans' AND constraint_type = 'PRIMARY KEY';

  IF cname IS NOT NULL AND cname <> 'billing_plans_provider_tier_period_currency_pk' THEN
    EXECUTE format('ALTER TABLE billing_plans DROP CONSTRAINT %I', cname);
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE table_name = 'billing_plans' AND constraint_type = 'PRIMARY KEY'
  ) THEN
    ALTER TABLE billing_plans
      ADD CONSTRAINT billing_plans_provider_tier_period_currency_pk
      PRIMARY KEY (provider, tier, period, currency);
  END IF;
END $$;

-- --------------------------------------------------------------- subscriptions
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS provider text NOT NULL DEFAULT 'razorpay';
ALTER TABLE subscriptions
  ADD COLUMN IF NOT EXISTS currency text NOT NULL DEFAULT 'INR';

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'subscriptions' AND column_name = 'razorpay_subscription_id'
  ) THEN
    ALTER TABLE subscriptions
      RENAME COLUMN razorpay_subscription_id TO provider_subscription_id;
  END IF;
END $$;

-- A provider subscription id is only unique within that provider.
DO $$
DECLARE cname text;
BEGIN
  SELECT tc.constraint_name INTO cname
  FROM information_schema.table_constraints tc
  JOIN information_schema.key_column_usage kcu
    ON kcu.constraint_name = tc.constraint_name
  WHERE tc.table_name = 'subscriptions'
    AND tc.constraint_type = 'UNIQUE'
    AND kcu.column_name = 'provider_subscription_id'
  LIMIT 1;

  IF cname IS NOT NULL THEN
    EXECUTE format('ALTER TABLE subscriptions DROP CONSTRAINT %I', cname);
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS subscriptions_provider_sub_idx
  ON subscriptions (provider, provider_subscription_id);

-- ----------------------------------------------------------- billing_customers
CREATE TABLE IF NOT EXISTS billing_customers (
  user_id uuid NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  provider text NOT NULL,
  provider_customer_id text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT billing_customers_user_id_provider_pk PRIMARY KEY (user_id, provider)
);

CREATE INDEX IF NOT EXISTS billing_customers_provider_idx
  ON billing_customers (provider, provider_customer_id);

-- -------------------------------------------------------------- webhook_events
CREATE TABLE IF NOT EXISTS webhook_events (
  provider text NOT NULL,
  event_id text NOT NULL,
  event_type text NOT NULL,
  received_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT webhook_events_provider_event_id_pk PRIMARY KEY (provider, event_id)
);

COMMIT;
