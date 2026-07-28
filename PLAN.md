# Dynamic QR Platform — Revised Business & Build Plan

**Working name:** QRVeda — qrveda.com registered (BigRock) and live behind Cloudflare
**Author:** Sagar
**Date:** July 2026
**Status:** Core app built and deployed at qrveda.com · Razorpay live (INR) · Validation pending

---

## Build Status — updated 28 July 2026

The core product from Phase 1 is **built, running and verified end-to-end** (✅ = done, 🔲 = not yet):
Next.js 15 full-stack app · Postgres 16 (embedded for dev, `DATABASE_URL` for prod) · Drizzle ORM.

Working today: signup/login → create any of 11 QR types → download PNG/SVG →
scan hits `/{code}` → 302 redirect in ~10ms → scan logged (device/OS/browser/geo-headers)
→ dashboard charts. Editing a QR's destination updates every printed copy instantly;
pausing a QR serves a 410 "paused" page.

Also shipped (second pass, same day):
- **Restaurant Suite** — 4-question wizard → per-table menu QRs, feedback QR,
  Google-review QR, suite dashboard (busiest table, avg rating), A4 print sticker sheet.
- **Feedback funnel (compliant)** — hosted star-rating page at `/f/{code}`, private
  feedback storage, Google-review nudge shown to *every* respondent (no gating),
  per-IP rate limiting.
- **Razorpay billing** — subscriptions (monthly/annual), lazy plan creation, checkout +
  signature verification, webhook lifecycle (charged/halted/cancelled), cancel-at-cycle-end,
  plan limits enforced on QR creation (402 + upgrade prompt). Dormant until
  `RAZORPAY_*` keys are set in `.env` — until then the app runs in free pilot mode.

Also shipped (25 July 2026):
- **Smart redirects** — per-QR "Advanced" section on create + edit: day/time schedule
  rules (day-of-week pills, start/end time, per-rule URL, IANA timezone; end ≤ start
  rolls past midnight, e.g. 18:00 → 02:00) and device targeting
  (Android/iOS/tablet/desktop → different URLs; iPad falls back to the iOS rule).
  Priority: device rule → first matching schedule rule → default destination.
  Stored in `qr_codes.redirect_rules` (jsonb), evaluated in `lib/redirect-rules.ts`;
  `javascript:`/`data:` schemes blocked. Verified end-to-end with real UAs.
- **UI refresh** — sidebar with active nav states + gradient brand/avatar/plan badge,
  mobile bottom tab bar, modernized dashboard/list/detail cards, "smart" badges on
  QRs with rules.
- **SEO & content site** (25 July 2026) — `/docs` (10 detailed guides: getting started,
  dynamic vs static, all QR types, design/branding, smart redirects, analytics,
  restaurant suite, feedback/reviews, billing, FAQ) and `/blog` (7 industry playbooks:
  restaurants, retail, real estate, salons/clinics, events, agencies, app-download QRs).
  Content lives in `src/lib/marketing/*-content.ts` (typed blocks, no MDX), rendered by
  `components/marketing/Prose`. Plus: `sitemap.xml` + `robots.txt` (app pages
  disallowed), metadataBase/OG/Twitter metadata with title template, JSON-LD
  (Organization/SoftwareApplication/WebSite on landing, TechArticle+Breadcrumb on docs,
  FAQPage on /docs/faq, Article on posts), noindex on app//f//print pages, docs+blog
  links in landing nav and a 3-column footer. All docs/blog pages statically generated.

Also shipped (27–28 July 2026):
- **Global payments architecture** — billing rewritten behind a `BillingProvider`
  interface (`src/lib/billing/`). Razorpay handles INR; a Paddle adapter (merchant of
  record, so VAT/sales tax is theirs) covers USD/EUR/GBP/AUD/CAD. Six-currency price
  table, geo-resolved currency clamped to what a configured provider can actually
  settle, per-provider webhook routes with event-id idempotency, `users.plan`
  recomputed from live subscriptions rather than written from the event, hosted
  customer portal where the provider offers one. Razorpay subscriptions carry an
  `app` note so one Razorpay account can serve several products without cross-talk.
  Schema migrated (`drizzle/0001`) off Razorpay-specific column names.
- **Migration runner** — `npm run db:migrate` applies `drizzle/*.sql` in order,
  tracked in `_migrations`; safe on every deploy. Renames must live here, not in
  `drizzle-kit push`, which treats a rename as drop + add.
- **Admin panel** (`/admin`, `drizzle/0002`) — Overview (MRR/ARR/ARPU, activation,
  growth), Users (searchable, filterable), Revenue (by tier/currency/provider/period),
  Content (QR types, top codes, geo, devices, feedback), System (provider config,
  webhook deliveries, entitlement drift). Access via `users.role` or `ADMIN_EMAILS`;
  non-admins get a 404. Multi-currency revenue normalised to INR at overridable rates.
- **Legal pages** — `/terms`, `/privacy`, `/refund`, `/contact`, generated from
  `src/lib/legal/business.ts`. Required for payment-gateway review.
- **Cloudflare** — DNS + proxy live on qrveda.com. Fixes country/city capture (was
  always NULL on a bare VPS) and therefore currency routing. `cf-ipcountry` is the
  single trusted geo header; the fallbacks were removed because a client could forge
  them to buy at Indian prices.
- **Auth hardening** (`drizzle/0003`) — email verification on signup (gates QR
  creation, fails open when SMTP is unset), password reset, password-changed notices,
  all over nodemailer/SMTP. Tokens stored as SHA-256 hashes, single-use, expiring.
  Fixed-window rate limiting on every auth and write endpoint, keyed on
  `CF-Connecting-IP`; the redirect hot path is deliberately exempt.
- **Checkout intent** — pricing CTAs carry the chosen plan through signup (and the
  Google round trip) straight into checkout, instead of dropping people on the
  dashboard having forgotten what they clicked.

Run it: `npm run db:start && npm run dev` → http://localhost:3003
Individual done/pending items are marked ✅ / 🔲 throughout §3.1 below.
**Outstanding work is tracked in §3.4 — read that before starting anything new.**

---

## 0. The One-Line Change From the Original Plan

The original plan was **feature-first**: build 50+ features, launch, wait for signups.
This plan is **distribution-first**: validate with real money in hand, launch with one wedge, sell through channels you control, and let paying customers pull features out of you.

**The product is not the risk. Distribution is the risk.** Every decision below is ordered around that.

---

## 1. Positioning

### What we do NOT sell
- "QR code generator" — free everywhere, unwinnable SEO, zero willingness to pay.
- "All-in-one offline marketing platform" — too vague to sell to anyone specific.

### What we DO sell (two motions, one platform)

**Motion A — Vertical wedge (direct):**
> "Restaurant QR Suite — menu, table ordering info, feedback, and review QRs. One dashboard. Change anything without reprinting. ₹499/mo, we set it up for you."

**Motion B — White-label (channel):**
> "Your agency's own QR & tracking platform. Your domain, your logo, your pricing. You sell it to your clients; we run the infrastructure."

Motion B is the sleeper. Agencies and print shops already have the customer relationships we'd otherwise spend years building. One agency = 20–100 QRs, low churn, and *they* handle support and selling. White-label is not a "premium feature" — it is a core product from day one.

### Why this can win despite crowded competition
- Uniqode, QR Tiger, Bitly, Scanova, QRCodeChimp compete on features and global SEO. None of them do **high-touch, India-priced, vertical-specific onboarding** or aggressively court **Indian agencies/print shops as resellers**.
- The durable moat is not software — it's **printed lock-in** (once 50 table stickers point at our domain, switching costs are physical) plus **channel relationships**.

---

## 2. Phase 0 — Validation (Weeks 1–2, ₹0 spent on code)

**Do not write code until this phase produces money or firm commitments.**

### Actions
1. **Mock, don't build.** Design 5–6 dashboard/landing screens (Figma or even slides). A clickable mock of: create QR → print → scan analytics → edit destination.
2. **Restaurant track:** Visit 15–20 restaurants/cafés in person. Pitch the Restaurant Suite at ₹499/mo (or ₹4,999/yr). Goal: **5 advance commitments** (₹500–1,000 token payment or signed LOI for a free 30-day pilot converting to paid).
3. **Agency track:** Call/meet 10–15 agency owners and print shops (start with the gsharp.media network). Pitch white-label at ₹2,999–4,999/mo flat. Goal: **2 committed pilot agencies**.
4. **Log every objection verbatim.** These become the real feature list and the sales script.

### Go / Kill criteria (be honest here — this is where you avoid losing a year)
| Result | Decision |
|---|---|
| ≥5 restaurant commits OR ≥2 agency commits | **GO** — build Phase 1 |
| Interest but no money ("looks nice, come back later") | Reposition/re-price, run one more 2-week cycle. Max 2 cycles. |
| Flat rejection / "PhonePe gives this free" everywhere | **KILL or pivot.** You just saved 6 months. |

---

## 3. Phase 1 — Sellable MVP (Weeks 3–10, realistic 6–8 weeks)

Everything in this phase exists to serve the customers from Phase 0. If a feature isn't needed to onboard them, it's cut.

### 3.1 Core (must-have)

**Auth & Accounts**
- ✅ Email + password with email verification and password reset (nodemailer/SMTP). ✅ Google OAuth (activates when `GOOGLE_CLIENT_ID`/`SECRET` are set).
- 🔲 Organizations with owner/member roles (agencies need this immediately; keep roles simple: owner, member).

**Dynamic QR engine (the heart)**
- ✅ Short URL redirect: `{domain}/{code}` with 7-char unambiguous codes.
- ✅ Redirect target editable any time — this is the entire value prop. (Verified: edit → next scan follows new destination instantly.)
- ✅ Thin 302 redirect endpoint with scan logging moved off the hot path (`after()`). 🔲 Redis cache for active codes (add when traffic justifies; single indexed Postgres lookup for now).
- ✅ QR generation fully local (`qrcode` matrix + custom SVG renderer — no third-party API). Styling: foreground/background color, error-correction level, six module shapes (square/rounded/dots/classy/classy-rounded/extra-rounded), styled finder eyes, ✅ centered logo overlay with auto EC-H and background knockout. Scannability verified with ZXing.
- ✅ **Photo QR (halftone blend)** — user's photo/dish/storefront rendered *inside* the QR pattern (deterministic halftone, no AI API, zero marginal cost). Function patterns kept full-strength; ZXing-verified. Differentiator vs. basic generators.
- ✅ Exports: **PNG (128–4096px) and SVG.** PDF/EPS ship later; SVG covers every print shop.
- ✅ **Smart redirects**: day/time schedule rules (overnight windows supported, per-QR timezone) + device targeting (Android/iOS/tablet/desktop). Evaluated on the hot path from the same row — no extra query.

**QR types (10 shipped)**
✅ Website, WhatsApp (`wa.me` with prefilled text), Phone, Email, SMS, UPI (`upi://` deep link — table stakes, never a paid pitch), PDF upload, Image upload, WiFi (static), vCard/contact (static).
🔲 Uploads go to local disk for dev — swap to GCS behind the same `/files/` URL for production.
*Menu, Instagram, Google Review, etc. are just Website/PDF QRs with templates — add as presets, not as engineering work.*

**Scan analytics**
- ✅ Per scan: timestamp, device type, OS, browser, referrer, hashed IP. ✅ Country/city from Cloudflare (`cf-ipcountry`/`cf-ipcity`) — verified capturing e.g. "Mumbai, IN". MaxMind no longer needed.
- ✅ Written after the response is sent (`after()`) — never in the redirect hot path. 🔲 Move to a real queue (BullMQ) at scale.
- ✅ Dashboard: total QRs, total scans, scans today, top QR, daily chart (30 days), per-QR breakdown with recent-scans table, top cities, device split (ECharts). 🔲 CSV export. 🔲 90-day view.

**Restaurant Suite (the wedge, mostly templates + packaging)** — ✅ built
- ✅ Guided 4-question setup (name, menu PDF/URL, table count, feedback/review extras).
- ✅ Per-table QRs with per-table scan analytics ("busiest table").
- ✅ Print-ready A4 sticker sheet (browser print → PDF for any print shop).
- Guided setup: menu QR (PDF/image upload or simple hosted menu page), per-table QRs (bulk "Table 1–20" generation), feedback QR, review QR.
- One print-ready sheet (A4 PDF of table stickers) — small feature, huge onboarding win.

**Hosted pages (mini landing pages)** — partial: ✅ feedback page; 🔲 menu page & link-in-bio templates
- Menu page, feedback form, link-in-bio style page. Simple templates, mobile-first, fast. This is the seed of "AI landing pages" later — no AI needed yet.

**Feedback & review funnel — compliant version** — ✅ built (star rating + private comments; Google-review link shown to every respondent — no gating)
- Feedback QR → rating form → all feedback stored privately → *after submission*, every respondent sees a "Review us on Google" link.
- **We do NOT gate** (i.e., we don't show the Google link only to happy customers). Gating violates Google review policy and can get customers' listings penalized and our domain flagged. Sell it as "feedback capture + review nudge" — 90% of the value, none of the risk. Document this stance; customers will ask for gating.

**Billing** — ✅ built, live on Razorpay (INR); Paddle adapter written but not yet enabled
- ✅ Provider-agnostic (`BillingProvider`), six currencies, geo-routed and clamped to
  what a configured provider can settle. ✅ Webhooks idempotent per event id.
- 🔲 End-to-end test against real Razorpay (subscribe → webhook → cancel → downgrade).
- 🔲 Paddle: business verification, one sandbox run, real non-INR prices (the numbers
  in `tiers.ts` are placeholders).
- 🔲 Mid-cycle upgrades/downgrades with proration — today you cancel and resubscribe.

**Abuse & trust (non-negotiable, most plans forget this)**
- ✅ Signup throttling + email verification (gates QR creation; fails open with no SMTP).
- ✅ Rate limiting on auth and all write endpoints (per IP, and per email on login).
- 🔲 Destination URL checks against phishing patterns; block URL shorteners as destinations. (Basic URL-shape validation ✅.)
- ✅ Kill switch per QR (pause → 410 page). 🔲 Per-account kill switch + abuse-report page on the redirect domain.
- 🔲 **Separate domains:** app on one domain, redirects on another. If the redirect domain is ever blacklisted (Safe Browsing), the business survives. (Deploy-time decision — code already treats the redirect path as standalone.)
- ⛔ Rate limiting on the redirect endpoint — **deliberately not done.** A popular QR
  code is supposed to be hit hard; throttling scans breaks printed material. Cloudflare
  absorbs volumetric abuse instead.

**Ops** — 🔲 at deploy time
- 🔲 **Daily Postgres backups, off the box.** Highest-value item left — nothing else on
  this list matters if the database is lost.
- 🔲 Error tracking (self-hosted GlitchTip or Sentry free tier). Errors currently reach
  server logs only, so a broken redirect is reported by a customer, not by monitoring.
- 🔲 Uptime monitoring on the redirect endpoint.
- 🔲 Uploads still on local disk (`uploads/`) — not backed up, lost on server rebuild.
  Swap to object storage behind the same `/files/` URL.
- ✅ Cloudflare in front (proxy, TLS, geo headers, DDoS absorption).

### 3.4 Outstanding — ranked (as of 28 July 2026)

**Blocking real users**
1. 🔲 **Postgres backups.** Unrecoverable if skipped. `pg_dump` nightly, off-server, with a tested restore.
2. 🔲 **SMTP credentials on the server.** Verification and reset emails are built but send nothing without them. The verification gate fails open meanwhile, so signup still works — but nobody can reset a forgotten password.
3. 🔲 **Error monitoring.**
4. 🔲 **Payment flow tested end to end** on live Razorpay.

**Before meaningful revenue**
5. 🔲 **Tests.** None exist. Billing and `redirect-rules` first — both were verified by hand and nothing prevents regression.
6. 🔲 **Uploads to object storage.**
7. 🔲 **Self-serve account deletion** — the privacy policy promises deletion on request; today it's manual.
8. 🔲 **Paddle enablement** (verification, sandbox run, real prices) before selling outside India.

**Housekeeping**
9. 🔲 Delete the dead `GEOIP_DB_PATH` env var — Cloudflare supplies geo now.
10. 🔲 Rename one of the two `drizzle/0003_*.sql` files to `0004_` so ordering is unambiguous.
11. 🔲 2FA on the Cloudflare account (it controls production DNS).
12. 🔲 `deploy/nginx-cloudflare.conf` not yet installed — optional; only affects nginx's own logs now that the app reads `CF-Connecting-IP` directly.

### 3.2 Explicitly cut from MVP
Password-protected QRs, expiring QRs, scheduled/geo/language/device redirects, A/B testing, UTM builder, bulk Excel upload, campaigns, heatmaps, notifications, health checks, digital business cards, API, webhooks, SSO, audit logs, EPS/PDF export, "AI" anything. **All of it waits for paying-customer pull.**

### 3.3 Success criteria for Phase 1
- Phase 0 committers onboarded and **actually charged**.
- Target at end of week 10: **10–15 paying accounts** (mix of restaurants + 1–2 agencies), ≥₹8–10k MRR.
- Redirect uptime effectively 100%; zero abuse incidents.

---

## 4. Phase 2 — Retention & Channel Growth (Months 3–5)

Prioritize strictly by what paying customers ask for. Expected order:

1. **White-label & custom domains** (`go.agency.com` via CNAME + automated TLS) — unlocks the agency channel fully. Agency admin can manage client sub-accounts.
2. **Smart redirect rules — one engine, many features.** Build a single condition→action rule evaluator (conditions: time/day, geo, device, language, scan count, date range; actions: redirect, show page, show "expired"). This ONE engine ships as: scheduled redirects, geo redirect, device redirect, language redirect, expiring QRs, A/B split. Market them as six features; build one system.
3. **Bulk generation** (CSV/Excel → N QRs → ZIP) — asked for by manufacturers, events, print shops; also a lead magnet.
4. **Campaigns** (group QRs: poster vs. billboard vs. flyer, compare sources) — genuinely under-served, natural for agencies.
5. **Notifications** (email first, WhatsApp later): scan milestones, expiry warnings, destination health (404/SSL/down checks — cheap cron job, high perceived value).
6. **Password-protected QRs, PDF/EPS export, UTM auto-append** — small items, batch them.

### Phase 2 targets
- 40–60 paying accounts, 3–5 active agencies, ₹40–60k MRR.
- Monthly logo churn <7% (printed lock-in should be doing its job — if churn is higher, fix onboarding before building anything new).

---

## 5. Phase 3 — Differentiators (Month 6+, only if Phase 2 metrics hold)

- **Offline conversion tracking** (store owner marks sales against scans → "800 scans, 120 purchases, 15%") — genuinely rare, retailers love it, simple to build.
- **Visual rule builder UI** on the Phase 2 rules engine ("Zapier for QR" positioning).
- **AI-assisted landing pages** (answer 5 questions → hosted business page). Real need — most target SMBs have no website.
- **Digital business card** vertical (second wedge; sells to freelancers/sales teams, annual pricing).
- **API + webhooks + Zapier/n8n** — needed for bigger agencies and enterprise conversations.
- Second vertical suite (clinics/salons: appointment + feedback + review) — reuse the restaurant playbook.

---

## 6. Pricing

| Plan | Price | For | Includes |
|---|---|---|---|
| Free | ₹0 | Lead gen only | 3 dynamic QRs, basic analytics, our branding on pages |
| Starter | ₹299/mo or ₹2,499/yr | Freelancers, single shop | 25 QRs, full analytics, all QR types |
| Business | ₹699/mo or ₹5,999/yr | Restaurants, retailers | 100 QRs, Restaurant Suite, hosted pages, rules (Phase 2), 3 team members |
| Agency | ₹2,999/mo or ₹24,999/yr | Agencies, print shops | White-label, custom domain, client sub-accounts, bulk, priority support |
| Enterprise | Custom (₹10k+/mo) | Chains, brands | SSO, API, SLA, audit logs |

**Pricing rules:**
- Push **annual hard** (2 months free) — annual prepay is the single best churn defense in this category.
- Price slightly above the original plan (₹299 vs ₹199): high-touch onboarding justifies it, and at these volumes 100 extra rupees matters more than conversion-rate vanity.
- In-person pilot deals: first month free, card/mandate collected upfront.

### Unit economics sanity check
- Infra at <1,000 customers: one small GCP VM or Cloud Run + Cloud SQL + Redis + GCS ≈ **₹8–15k/mo**. Gross margin ~90%.
- ₹1L MRR ≈ ~35 Agency accounts, or ~150 Business accounts, or a mix. With the channel model, that's **realistic in 9–12 months**; purely self-serve it would take 2+ years.

---

## 7. Distribution Plan (as important as the product)

**Channel 1 — Direct field sales (Motion A):** Founder-led, in person, restaurants/cafés in one city area. Scripted 10-minute pitch + on-the-spot setup ("scan this — that's your menu, I just made it"). Target: 2–3 closes/week initially. This is unglamorous and it is the plan.

**Channel 2 — Agencies & print shops (Motion B):** The scale lever. Print shops are gold: every customer printing a flyer/menu/standee is a QR prospect at the exact right moment. Offer print shops 20–30% recurring commission or wholesale pricing. Target: 1 new channel partner/month.

**Channel 3 — Existing network:** gsharp.media clients and contacts first — warmest possible leads, use them for pilots and testimonials.

**Channel 4 — Content/SEO (slow burn, don't depend on it):** India-specific long-tail only ("restaurant menu QR code India", "UPI QR with analytics", "WhatsApp QR for business"). Hindi + English. Free bulk-QR tool as a lead magnet. Expect nothing for 6+ months.

**Anti-goals:** No Google Ads on "QR generator" keywords (CAC > LTV, guaranteed). No Product Hunt-style global launch (wrong audience). No freemium-led growth strategy (free users in this category convert terribly; Free plan exists only as a demo).

---

## 8. Tech Stack & Architecture

Unchanged from original where sensible — it was the strongest part of the plan.

- **Backend:** Node.js + Fastify (TypeScript)
- **DB:** PostgreSQL (Cloud SQL). Scan events in a partitioned append-only table; pre-aggregated daily rollups for dashboards.
- **Cache:** Redis — active redirect map + rate limiting.
- **Queue:** BullMQ — scan-event ingestion, exports, notifications, health checks.
- **Storage/CDN:** GCS + Cloud CDN (PDFs, images, logos).
- **Frontend:** Next.js; ECharts for dashboards.
- **QR generation:** local libraries only (`qrcode`, `sharp`).
- **Geo-IP:** self-hosted MaxMind GeoLite2 (no per-lookup API costs).
- **Payments:** Razorpay (the one unavoidable third-party dependency; wrap it behind an interface).
- **Hosting:** Cloud Run or a single Compute Engine VM to start. Do not over-architect — this fits on one box for the first several thousand customers, **except** the redirect service, which deploys separately (own service, own domain) so app deploys can never take redirects down.

**Architecture principle:** the redirect path is sacred. Thin service: Redis lookup → 302 → enqueue event. Everything else can break; this cannot.

---

## 9. Risks & Mitigations

| Risk | Severity | Mitigation |
|---|---|---|
| No distribution / no one shows up | **Fatal** | Phase 0 validation gate; field sales + channel model; kill criteria honored |
| Redirect domain blacklisted (phishing abuse) | **Fatal** | Separate domains, URL scanning, throttling, kill switch, abuse page — from day one |
| Churn after campaigns end | High | Annual plans, printed lock-in, vertical suites (menus/tables are permanent, not campaigns) |
| Review-gating policy violation | High | Compliant funnel only; documented stance |
| Incumbent copies features | Medium | Compete on channel + onboarding + India pricing, not features |
| Founder burnout on 50-feature roadmap | High | This plan. Phase discipline. Customer pull, not roadmap push. |
| UPI/payment compliance creep | Medium | Generate standard `upi://` deep links only; we never touch funds; revisit if positioning changes |
| Free-rider abuse of Free plan | Low | 3 QR cap, branding, throttles |

---

## 10. Milestones & Kill Gates

| When | Milestone | Kill/Go gate |
|---|---|---|
| Week 2 | Validation done | ≥5 SMB or ≥2 agency commitments, else re-cycle (max 2) or kill |
| Week 10 | MVP live, pilots charged | 10+ paying accounts, ₹8k+ MRR |
| Month 5 | Phase 2 shipped, channel live | 40+ accounts, ₹40k+ MRR, churn <7%/mo, 3+ agencies |
| Month 9 | Differentiators + 2nd vertical | ₹1L MRR in sight; if MRR <₹25k at month 9, stop adding features and fix sales — or wind down deliberately |
| Month 12 | Decision point | ₹1L+ MRR → invest/hire. Below → hard review. |

---

## 11. First 14 Days — Concrete Checklist

- [ ] Buy domains (name decided: **QRVeda**, app renamed 13 Jul 2026): qrveda.com (home), qrveda.in (India SEO/brand redirect), trackqr.in (QR redirect domain — abuse isolation). One order, auto-renew ON for all three, no upsells. Namecheap or Hostinger (UPI); avoid GoDaddy renewals.
- [ ] Build clickable mock (5–6 screens)
- [ ] Write the restaurant pitch script + one-page leave-behind (Hindi + English)
- [ ] Write the agency white-label pitch (deck, 6 slides max)
- [ ] List 30 target restaurants (one locality) + 15 agencies/print shops
- [ ] 20 restaurant visits, 10 agency calls — log every objection
- [ ] Collect commitments (token payment / signed LOI)
- [ ] Week-2 review against the gate in §2 — **write the honest verdict down before deciding**

---

*The original feature list isn't wrong — it's just year-2 material compressed into a launch plan. Sequence beats scope. Sell first, build second, and let revenue pull the roadmap.*
