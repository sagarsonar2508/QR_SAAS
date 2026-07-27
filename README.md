# QRVeda — Dynamic QR Platform

Dynamic QR codes for Indian businesses: print once, change the destination anytime, track every scan. See `PLAN.md` for the full business & build plan.

## Stack

Next.js 15 (App Router, full-stack) · PostgreSQL 16 · Drizzle ORM · Tailwind CSS v4 · ECharts · local `qrcode` generation (no third-party APIs).

## Run locally

```bash
npm install
npm run db:start     # embedded Postgres 16 on port 5433 (data in .pgdata/)
npm run db:push      # sync schema (first run / after schema changes)
npm run dev          # http://localhost:3003
```

`npm run db:stop` stops the database. Docker users can run `docker compose up -d` instead (same port/credentials) — the app only cares about `DATABASE_URL` in `.env`.

There is a seeded test account from the verification run: `test@example.com` / `password123`.

## How it works

- Every dynamic QR encodes a short URL (`{APP_URL}/{code}`). The route handler at `app/[code]/route.ts` does one indexed lookup and 302-redirects; scan logging (device, OS, browser, geo headers, hashed IP) happens after the response via `after()`.
- Editing a QR re-resolves its destination — printed codes never change.
- WiFi and Contact Card QRs are **static** (payload encoded into the image): they work offline but can't be edited after printing and don't track scans.
- QR images are generated locally as PNG (128–4096px) or SVG at `app/api/qrcodes/[id]/image`.
- PDF/image uploads land on local disk (`uploads/`), served via `/files/[name]` — swap the storage layer for GCS in production without changing URLs.

## Restaurant Suite

`/restaurant/new` asks four questions (name, menu PDF/URL, table count, feedback/review extras) and generates the whole set: per-table menu QRs, a feedback QR, a Google-review QR, grouped under one suite with per-table scan analytics and an average rating. `/print/{suiteId}` renders an A4 sticker sheet — use the browser's Print → Save as PDF.

The feedback QR redirects to a hosted star-rating page (`/f/{code}`). Feedback is stored privately; **every** respondent then sees the Google-review link (no rating-based gating — that would violate Google's review policy).

## Billing

Two providers behind one interface, split by the customer's currency: **Razorpay** for INR (UPI Autopay, Indian settlement) and **Paddle** for USD/EUR/GBP/AUD/CAD (merchant of record, so VAT/sales tax is Paddle's problem, not ours). Configure either, both or neither — with neither, the app runs in **free pilot mode** with no plan limits.

- Plans: Free (3 QRs) / Starter (25) / Business (100) / Agency (1,000), monthly or annual, priced per market in each currency.
- Currency is resolved server-side from the CDN geo header, overridable by the visitor, and always clamped to what a configured provider can actually settle.
- Provider plans/prices are created lazily on first checkout — no dashboard setup.
- Webhooks are the source of truth for renewals, failures and cancellations, one route per provider, deduplicated by event id.
- QR creation returns 402 with an upgrade prompt when the plan limit is hit.

Setup, architecture and the go-live checklist: **[docs/BILLING.md](docs/BILLING.md)**.

## Admin panel

`/admin` — an internal, consolidated view of the business. Five pages:

| Page | What it answers |
|---|---|
| **Overview** | MRR/ARR, paying customers, ARPU, activation rate, signup and scan trends, plan mix |
| **Users** | Every account with plan, subscription state, QR and scan counts; searchable and filterable |
| **Revenue** | MRR by tier, currency, provider and period; subscription states; recent subscriptions |
| **Content** | QR types, top QR codes, scan geography, devices, OS, referrers, suites, feedback ratings |
| **System** | Provider configuration, currencies you can actually charge, webhook deliveries, subscriptions needing attention |

Access is granted by `users.role = 'admin'` **or** by listing an address in
`ADMIN_EMAILS`. Non-admins get a 404 rather than a redirect, so the panel isn't
discoverable by URL. Grant the first admin with `ADMIN_EMAILS=you@example.com`,
or directly:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

Revenue spans six currencies, so the panel normalises to INR using estimated
rates (override with `FX_RATES_INR`). Those figures are for steering, not
accounting — they read prices from the code, and ignore discounts, refunds,
taxes and provider fees. Payout statements are the authority on earnings.

## Google login

Wired but dormant. Create an OAuth client in Google Cloud Console (redirect URI: `{APP_URL}/api/auth/google/callback`), fill `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in `.env`, and the button appears on the login/signup pages.

## Layout

```
app/                 routes (landing, auth pages, dashboard, API, /[code] redirect)
src/db/              Drizzle schema + client
src/lib/             auth/sessions, QR type registry, image generation, scan logging, stats
src/components/      client components (wizard, charts, actions)
```

## Production notes (from PLAN.md)

- Serve redirects from a **separate domain** from the app.
- Add rate limiting, email verification, and destination URL scanning before public launch.
- Point `DATABASE_URL` at Cloud SQL; move uploads to GCS; add GeoLite2 for city-level geo.
