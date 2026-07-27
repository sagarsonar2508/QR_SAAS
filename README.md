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

## Billing (Razorpay)

Dormant until `RAZORPAY_KEY_ID`, `RAZORPAY_KEY_SECRET` and `RAZORPAY_WEBHOOK_SECRET` are set in `.env` — until then the app runs in **free pilot mode** with no plan limits. Once configured:

- Plans: Free (3 QRs) / Starter ₹299 (25) / Business ₹699 (100) / Agency ₹2,999 (1,000), monthly or annual.
- Razorpay Plans are created lazily via the API on first subscribe (no dashboard setup needed).
- Checkout runs client-side; `/api/billing/verify` confirms the payment signature for instant activation; the webhook (`/api/billing/webhook`, configure in the Razorpay dashboard) is the source of truth for renewals, failures and cancellations.
- QR creation returns 402 with an upgrade prompt when the plan limit is hit.

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
