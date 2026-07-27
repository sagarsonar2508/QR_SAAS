# Billing

QRVeda charges through **two providers, split by the customer's currency**:

| Currency | Provider | Why |
|---|---|---|
| INR | Razorpay | UPI Autopay and netbanking, settles to an Indian bank account. Razorpay cannot hold a recurring mandate in any other currency. |
| USD, EUR, GBP, AUD, CAD | Paddle | Merchant of record — Paddle is the legal seller, so it registers, collects and remits VAT/sales tax worldwide and issues the invoices. |

Either can be configured independently. With neither configured the app runs in
**free pilot mode**: no plan limits are enforced and nothing is ever charged.

## Architecture

Everything provider-specific lives behind one interface, `BillingProvider` in
[`src/lib/billing/provider.ts`](../src/lib/billing/provider.ts). Adding a third
provider means writing one adapter file and adding one line to the registry.

```
src/lib/billing/
  tiers.ts          Tier/Period/Currency types, the price table, formatMoney
  countries.ts      COUNTRY_CURRENCY — the single source of truth for geo → money
  currency.ts       Request-scoped resolution (geo headers + cookie override)
  provider.ts       The BillingProvider interface and its normalised types
  apply.ts          Folds provider events into our tables; webhook idempotency
  index.ts          Registry, routing, quota checks
  providers/
    razorpay.ts
    paddle.ts
```

Three invariants hold the design together:

1. **Displayed currency is clamped to what we can charge.** `availableCurrencies()`
   intersects our currency list with the configured providers'
   `supportedCurrencies`. A visitor is never quoted a price no provider can settle.
2. **Currency is resolved server-side**, from the CDN geo header or the
   `currency` cookie — never from the request body. Otherwise a client could pick
   whichever price is cheapest.
3. **The webhook is the source of truth.** Client callbacks only accelerate the
   UI, and they still apply provider-signed state through the same code path.

### Currency and country

`COUNTRY_CURRENCY` in `countries.ts` maps country → currency, and
`DEFAULT_CURRENCY` (USD) catches everything unlisted. The Paddle adapter derives
its per-country `unit_price_overrides` from the *same* map, so the price a
visitor is quoted and the price Paddle charges cannot drift apart.

Adding a currency: extend the `Currency` union in `tiers.ts`. TypeScript then
requires a price for every tier, so a half-filled currency can't ship.

### Webhooks

One route per provider, because each signs deliveries differently:

| Provider | Endpoint | Signature |
|---|---|---|
| Razorpay | `/api/billing/webhook/razorpay` | `x-razorpay-signature`, HMAC-SHA256 of the raw body |
| Paddle | `/api/billing/webhook/paddle` | `Paddle-Signature: ts=…;h1=…`, HMAC-SHA256 of `` `${ts}:${rawBody}` `` |

`/api/billing/webhook` (no provider segment) still works and delegates to
Razorpay, so any endpoint already registered in the Razorpay dashboard keeps
functioning.

Every delivery is recorded in `webhook_events` (PK `provider, event_id`) before
being applied, so retries are no-ops. Paddle deliveries older than 5 minutes are
rejected as replays.

`users.plan` is **recomputed** from all live subscriptions rather than written
straight from the event — otherwise a late "cancelled" webhook for an old
subscription would downgrade a user who has already resubscribed.

## Setup

### Database

Run the migration **once per environment, before `npm run db:push`**:

```bash
psql "$DATABASE_URL" -f drizzle/0001_multi_provider_billing.sql
npm run db:push
```

The migration renames `razorpay_plan_id` → `provider_plan_id` and
`razorpay_subscription_id` → `provider_subscription_id`. It must not be left to
`drizzle-kit push`, which treats a rename as drop + add and would lose the
provider ids. It is idempotent, so re-running is harmless.

### Razorpay

1. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
2. Add a webhook in the Razorpay dashboard pointing at
   `<APP_URL>/api/billing/webhook/razorpay`, subscribed to `subscription.*`.
3. Put its secret in `RAZORPAY_WEBHOOK_SECRET`.

Plans are created lazily via the API on first subscribe — no dashboard setup.

### Paddle

1. Create a Paddle account and complete their business verification (this is a
   review process, not instant — start it early).
2. Set `PADDLE_API_KEY`, and `PADDLE_ENV=live` for production. Anything other
   than `live` uses the sandbox.
3. Under **Checkout settings**, set a default payment link — Paddle only returns
   a hosted checkout URL when one is configured.
4. Add a notification destination pointing at
   `<APP_URL>/api/billing/webhook/paddle`, subscribed to `subscription.*`.
5. Put its secret (`pdl_ntfset_…`) in `PADDLE_WEBHOOK_SECRET`.

Products and prices are created lazily on first checkout. Because plan objects
are cached in `billing_plans`, **changing a price in `tiers.ts` does not update
an already-created provider price.** To reprice, either create the new price in
the provider dashboard and update the cached row, or delete the `billing_plans`
row so the next checkout creates a fresh one. Existing subscribers stay on the
price they signed up at either way.

## Go-live checklist

These are business prerequisites, not code. Most have lead time — start them in
parallel with development.

### Before taking any real money

- [ ] **Registered entity and bank account** that Razorpay and Paddle will each
      accept. Paddle pays out to your entity; confirm they support your country
      and currency.
- [ ] **Paddle business verification approved.** They review what you sell and
      how you sell it. Have a live site, clear pricing and working policy pages
      ready before applying, and expect a few days.
- [ ] **Razorpay KYC complete** and subscriptions enabled on the account (UPI
      Autopay and e-mandate registration are separate toggles).
- [ ] **Policy pages published and linked in the footer:** terms of service,
      privacy policy, refund/cancellation policy, and contact details. Both
      providers check for these; Indian payment rules require them.
- [ ] **Pricing decided.** The non-INR numbers in `tiers.ts` are placeholders
      chosen for plausibility, not researched against your market. Every one of
      them is a business decision.
- [ ] **GST on the INR side.** Razorpay is *not* a merchant of record — you
      invoice the customer and handle GST yourself. Confirm your registration
      status and whether prices are GST-inclusive, then say so on the pricing
      page.
- [ ] **Confirm current provider terms.** Fees, supported countries, and payout
      schedules change. Verify against each provider's live docs rather than
      trusting the figures in this repo.

### Before announcing

- [ ] **Sandbox end-to-end run per provider:** subscribe → webhook activates the
      plan → quota enforced → cancel → webhook downgrades at period end.
- [ ] **Webhook endpoints registered in both dashboards** and reachable from the
      public internet (they will not reach `localhost`; use a tunnel for local
      testing).
- [ ] **Failure path tested:** a declined renewal should move the subscription to
      `past_due` and keep the user on-plan while the provider dunns, then
      downgrade on final cancellation.
- [ ] **A real card charged once per provider in live mode**, then refunded.
- [ ] **Monitoring on unattributable webhooks.** `apply.ts` logs
      `[billing] unattributable webhook` when it can't tie an event to a user;
      that line means someone paid and did not get their plan. Alert on it.

### Known gaps

- **Plan changes** (upgrade/downgrade mid-cycle) aren't implemented. Today a user
  subscribes to a new tier and the old subscription must be cancelled. Paddle
  supports proration via its update-subscription endpoint if you need it.
- **Razorpay has no hosted portal**, so Indian customers get the app's own cancel
  button while Paddle customers get Paddle's full portal. The billing page
  branches on `provider.hasPortal`.
