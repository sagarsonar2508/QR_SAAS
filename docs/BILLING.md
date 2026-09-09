# Billing

QRVeda charges through **providers split by the customer's currency**:

| Currency | Provider | Why |
|---|---|---|
| INR | Razorpay | UPI Autopay and netbanking, settles to an Indian bank account. Razorpay cannot hold a recurring mandate in any other currency. |
| USD | PayPal | PayPal Subscriptions — the live foreign rail. Real recurring billing, settles to the PayPal balance. |
| USD | Paddle *(not configured)* | Merchant of record — Paddle would be the legal seller, so it registers, collects and remits VAT/sales tax worldwide and issues the invoices. PayPal does none of that. |

Any can be configured independently. With none configured the app runs in
**free pilot mode**: no plan limits are enforced and nothing is ever charged.

### Why not "Razorpay international"

Razorpay does support foreign currencies — for **one-time Orders**, not for
recurring mandates, which are INR-only for Indian merchants. QRVeda sells
subscriptions, so enabling international payments on the Razorpay account would
not make a single foreign plan chargeable.

Separately, this Razorpay account (`rzp_live_SunBY…`) is **shared with
daredate.in and cheekydeck.com** and carries an account-level international-card
block — probed with a real payment, `pay_TPRw54u9Tt8jwr`, which failed
`international_transaction_not_allowed`. That block follows the account, not the
product, so QRVeda inherits it. `RAZORPAY_APP_TAG` is what keeps the three
products' webhooks apart on that shared account; it is load-bearing.

### Why USD only

The PayPal account holds USD. A subscription charged in a currency the account
does not hold lands `PENDING` with
`RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION` unless auto-convert is switched on
— the failure mode that silently killed every EUR sale on daredate.in. EUR, GBP,
AUD and CAD used to be priced in `tiers.ts` while no provider could settle them,
so visitors in those countries were quoted a fallback currency anyway. They were
removed rather than left as dead prices.

To widen later: turn on auto-convert in PayPal, extend the `Currency` union in
`tiers.ts` (TypeScript then demands a price per tier), add the countries to
`COUNTRY_CURRENCY`, and add the currency to `PAYPAL_CURRENCIES`. A PayPal
billing plan holds exactly one currency, so each new currency mints its own plan
object — that is already handled by the `billing_plans` cache being keyed on
currency.

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
    paypal.ts
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

#### The geolocation header is a trust boundary

Which country we think a visitor is in decides **which currency they are
charged**, so the header carrying it is security-relevant, not just analytics.

`countryFromHeaders()` trusts exactly **one** header — `cf-ipcountry` by default,
overridable with `GEO_COUNTRY_HEADER` — and accepts only a bare two-letter code.
Fallback headers were removed deliberately: accepting several means accepting the
weakest, and a client that sends `x-country-code: IN` would otherwise buy at
Indian prices from anywhere.

**Code alone is not sufficient.** A CDN will happily forward a client-supplied
`cf-ipcountry` unless told otherwise — verified against production. The CDN must
overwrite it:

> Cloudflare → **Rules → Transform Rules → Modify Request Header**
> - *Remove*: `x-country-code`, `x-vercel-ip-country`, `x-vercel-ip-city`
> - *Set dynamic*: `cf-ipcountry` = `ip.src.country`

`deploy/nginx-cloudflare.conf` adds the same stripping at the origin, plus
`real_ip_header CF-Connecting-IP` so scan analytics record real visitor IPs
instead of Cloudflare's edge.

To confirm the boundary holds, from outside:

```bash
curl -s -H 'x-country-code: IN' https://qrveda.com | grep -oE '[₹$][0-9,]+' | head -2
```

Indian prices coming back means the boundary is open.

### Webhooks

One route per provider, because each signs deliveries differently:

| Provider | Endpoint | Signature |
|---|---|---|
| Razorpay | `/api/billing/webhook/razorpay` | `x-razorpay-signature`, HMAC-SHA256 of the raw body |
| PayPal | `/api/billing/webhook/paypal` | `paypal-transmission-*` headers, verified by **calling PayPal back** — there is no local HMAC, because PayPal signs with a rotating cert |
| Paddle | `/api/billing/webhook/paddle` | `Paddle-Signature: ts=…;h1=…`, HMAC-SHA256 of `` `${ts}:${rawBody}` `` |

PayPal's round-trip verification is why `BillingProvider.parseWebhook` may return
a promise and the route awaits it. If `PAYPAL_WEBHOOK_ID` is unset, every PayPal
delivery is rejected as unverified — the endpoint fails closed, not open.

`/api/billing/webhook` (no provider segment) still works and delegates to
Razorpay, so any endpoint already registered in the Razorpay dashboard keeps
functioning.

Every delivery is recorded in `webhook_events` (PK `provider, event_id`) before
being applied, so retries are no-ops. Paddle deliveries older than 5 minutes are
rejected as replays.

`users.plan` is **recomputed** from all live subscriptions rather than written
straight from the event — otherwise a late "cancelled" webhook for an old
subscription would downgrade a user who has already resubscribed.

#### Cancellation, and the one status that expires by the clock

Razorpay and Paddle both cancel **at cycle end** and send a terminal event when
it arrives, so a webhook does the downgrade. PayPal has no cancel-at-cycle-end:
`/cancel` stops billing immediately and PayPal sends nothing further — even
though the customer has paid through the current period.

So a PayPal cancellation is stored as `cancelling` with the paid-through date,
and `cancelling` entitles the user **only until `current_period_end`**. Since no
event fires when a date passes, `settlePlan()` re-derives the plan on the quota
check (which already queries the database) and corrects `users.plan` if it has
lapsed. That is deliberately lazy: it costs one indexed SELECT and writes only
when a period has actually expired. No cron job is involved — if you later add
one, it should call `recomputeUserPlan` and nothing else.

## Setup

### Database

Run the migration **once per environment, before `npm run db:push`**:

```bash
DATABASE_URL=... npm run db:migrate
DATABASE_URL=... npm run db:push
```

`db:migrate` applies every `drizzle/*.sql` file in filename order that this
database hasn't seen yet, tracked in the `_migrations` table. It's safe to run on
every deploy — applied files are skipped. Use `npm run db:migrate -- --dry` to
see what would run without changing anything. It uses the `postgres` package
from `dependencies`, so no `psql` binary is required.

The migration renames `razorpay_plan_id` → `provider_plan_id` and
`razorpay_subscription_id` → `provider_subscription_id`. It must not be left to
`drizzle-kit push`, which treats a rename as drop + add and would lose the
cached provider ids.

Migrations must be **idempotent**: the runner marks a file applied only after it
succeeds, so a crash in between leaves it to be re-run.

#### Running it against a remote database

The runner only needs Node, this repo and a reachable `DATABASE_URL`.

```bash
# From your machine, if the database accepts external connections
DATABASE_URL='postgres://user:pass@db-host:5432/qrveda' npm run db:migrate

# On the server, in the deployed checkout
cd /srv/qrveda && npm run db:migrate

# Cloud SQL / RDS / any database that isn't publicly reachable — tunnel first
cloud-sql-proxy PROJECT:REGION:INSTANCE --port 5433 &
DATABASE_URL='postgres://user:pass@localhost:5433/qrveda' npm run db:migrate
```

If the database enforces TLS, append `?sslmode=require` to the URL.

Order matters on a deploy: **migrate before the new code starts serving.** The
migration is additive plus two renames, so old code would break on the renamed
columns — take the brief window, or deploy during low traffic.

### Razorpay

1. Set `RAZORPAY_KEY_ID` and `RAZORPAY_KEY_SECRET`.
2. Add a webhook in the Razorpay dashboard pointing at
   `<APP_URL>/api/billing/webhook/razorpay`, subscribed to `subscription.*`.
3. Put its secret in `RAZORPAY_WEBHOOK_SECRET`.

Plans are created lazily via the API on first subscribe — no dashboard setup.

**This account is shared** with daredate.in and cheekydeck.com. `RAZORPAY_APP_TAG`
(default `qrveda`) tags every subscription this app creates; the webhook handler
drops any event whose subscription is not tagged as ours. Changing that tag
orphans existing subscriptions — their renewals would arrive and be ignored.

### PayPal

1. Create a **PayPal REST app of QRVeda's own** under Apps & Credentials. Do not
   reuse the daredate.in or cheekydeck.com credentials — webhook ids are
   per-app, and sharing one makes the three products' events indistinguishable.
2. Set `PAYPAL_CLIENT_ID`, `PAYPAL_CLIENT_SECRET`, and `PAYPAL_ENV=live` for
   production. Anything other than `live` uses the sandbox, so a missing value
   can never charge a real card.
3. Add a webhook on that app pointing at `<APP_URL>/api/billing/webhook/paypal`,
   subscribed to:
   `BILLING.SUBSCRIPTION.ACTIVATED`, `.CANCELLED`, `.SUSPENDED`, `.EXPIRED`,
   `.UPDATED`, and `PAYMENT.SALE.COMPLETED`.
4. Put the webhook's id (not a secret) in `PAYPAL_WEBHOOK_ID`. **Without it every
   delivery is rejected** and no subscription will ever activate.
5. Turn on **auto-convert** for received currencies in PayPal account settings,
   even though we only sell USD — it costs nothing and removes the
   `RECEIVING_PREFERENCE_MANDATES_MANUAL_ACTION` trap if a currency is ever added.

Catalog products and billing plans are created lazily on first subscribe.
`PAYMENT.SALE.COMPLETED` (a renewal) re-reads the subscription from PayPal,
because the sale payload carries no `next_billing_time`.

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

- [ ] **Registered entity and bank account** that each provider will accept.
- [ ] **PayPal business account verified**, with a QRVeda-specific REST app and
      its webhook id. Confirm the account can receive USD subscription payments
      from your country.
- [ ] **VAT/sales-tax position decided for the USD side.** PayPal is *not* a
      merchant of record — selling SaaS to EU/UK businesses makes the tax
      liability yours, not PayPal's. At Agency pricing ($79/mo) this is a real
      exposure, and it is the main argument for finishing the Paddle adapter.
- [ ] **Paddle business verification approved** *(only if enabling Paddle).*
      They review what you sell and how you sell it. Have a live site, clear
      pricing and working policy pages ready before applying, and expect a few
      days.
- [ ] **Razorpay KYC complete** and subscriptions enabled on the account (UPI
      Autopay and e-mandate registration are separate toggles).
- [ ] **Policy pages published and linked in the footer:** terms of service,
      privacy policy, refund/cancellation policy, and contact details. Both
      providers check for these; Indian payment rules require them.
- [ ] **USD pricing decided.** The USD numbers in `tiers.ts` are placeholders
      chosen for plausibility, not researched against the market. They are now
      the *only* foreign prices, so each one is a business decision with nothing
      behind it.
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
