import type { Block } from "./blocks";

export type BlogPost = {
  slug: string;
  title: string;
  /** Meta description and card excerpt. */
  excerpt: string;
  /** ISO date, used for display and Article schema. */
  date: string;
  readMinutes: number;
  tag: string;
  blocks: Block[];
};

export const POSTS: BlogPost[] = [
  // ────────────────────────────────────────────────────────────────
  {
    slug: "qr-codes-for-restaurants",
    title: "QR codes for restaurants: menus, tables, feedback and reviews",
    excerpt:
      "The complete playbook for restaurant QR codes — digital menus that update themselves, per-table analytics, a feedback funnel that protects your Google rating, and time-based menus from one sticker.",
    date: "2026-07-20",
    readMinutes: 8,
    tag: "Restaurants",
    blocks: [
      {
        t: "p",
        text: "Restaurants were the first industry to make QR codes normal — every diner has scanned a menu since 2020. But most restaurants stopped at “PDF on a table sticker” and left the real value on the table. Here's the full playbook.",
      },
      { t: "h2", text: "1. The menu QR that never goes stale" },
      {
        t: "p",
        text: "The naive approach is a static QR pointing at a PDF's URL. The problem arrives with the first price change: the URL changes, the printed stickers don't. With a **dynamic QR**, the printed code points at a short link you control — upload a new menu and every table sticker updates on the next scan. New seasonal menu? Ten seconds, zero reprinting.",
      },
      {
        t: "ul",
        items: [
          "Upload the menu as a **PDF QR** — no website needed.",
          "Or point a **Website QR** at your menu page / Zomato listing.",
          "Laminate the stickers; matte lamination scans better than glossy under warm restaurant lighting.",
        ],
      },
      { t: "h2", text: "2. Different menus at different hours — same sticker" },
      {
        t: "p",
        text: "This is where scheduling changes the game. With time-based redirect rules, one printed code serves your **breakfast menu 7:00–11:30**, the **lunch specials 11:30–15:00**, and the **dinner menu from 18:00 until 2 AM** (overnight windows work — the rule rolls past midnight). Outside those windows, scanners see your regular menu. Bars use the same trick for happy-hour pricing that appears at 5 PM sharp and disappears at 8.",
      },
      { t: "h2", text: "3. One QR per table, not one QR everywhere" },
      {
        t: "p",
        text: "Printing the *same* code on every table works, but you learn nothing. Give each table its own code and your dashboard shows **scans per table**: which sections are busiest, whether the window seats out-earn the back room, and which sticker has peeled off (a table at zero scans for a week is a maintenance alert, not a slow table).",
      },
      { t: "h2", text: "4. The feedback funnel that saves your Google rating" },
      {
        t: "p",
        text: "An unhappy diner with no outlet becomes a public one-star review. A **feedback QR** on the bill folder gives them a private outlet first: they rate 1–5 stars and vent to *you*. Every respondent then sees your Google review link — happy guests take the one-tap path to a public review, unhappy ones have already been heard. (Showing the link to everyone keeps you compliant with Google's no-review-gating policy; tools that filter by rating risk getting a business's reviews purged.)",
      },
      { t: "h2", text: "5. WhatsApp ordering for delivery and takeaway" },
      {
        t: "p",
        text: "A **WhatsApp QR** on your takeaway packaging and storefront opens a chat with a prefilled “Hi! I'd like to place an order”. No app to install, no commission to a delivery platform for repeat customers who already know you.",
      },
      { t: "h2", text: "6. UPI at the counter" },
      {
        t: "p",
        text: "A **UPI QR** with your VPA opens any payment app with your name prefilled. Add one to home-delivery bills so customers can pay before the rider arrives.",
      },
      { t: "h2", text: "Placement checklist" },
      {
        t: "ul",
        items: [
          "Table: menu QR (front) + feedback QR (small, corner).",
          "Bill folder: feedback QR — the moment of maximum opinion.",
          "Entrance/window: menu QR so passers-by can browse before entering.",
          "Counter: UPI QR + Google-review QR.",
          "Delivery bags: WhatsApp ordering QR + feedback QR.",
        ],
      },
      {
        t: "tip",
        text: "QRVeda's Restaurant Suite builds all of this — per-table QRs, feedback and review codes, plus a print-ready A4 sheet — from four questions.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "qr-codes-for-retail-stores",
    title: "QR codes for retail stores: catalogues, offers, payments and repeat customers",
    excerpt:
      "How shops use dynamic QR codes — shelf-edge product info, time-limited offers that expire themselves, UPI payments, WhatsApp catalogues and window shopping after hours.",
    date: "2026-07-17",
    readMinutes: 7,
    tag: "Retail",
    blocks: [
      {
        t: "p",
        text: "A retail store has something restaurants don't: shelves, windows, counters and packaging — square centimetres of space that can each earn their keep with the right QR code. Here's how shops of every size use them.",
      },
      { t: "h2", text: "Shelf-edge product QRs" },
      {
        t: "p",
        text: "A small QR next to a product answers the questions a label can't: full specs, size charts, demo videos, reviews. Because the code is dynamic, the same shelf strip can point to this month's featured product page — **update the destination when the shelf changes**, not the printing.",
      },
      { t: "h2", text: "Offers that expire themselves" },
      {
        t: "p",
        text: "The classic retail failure: a poster promoting a sale that ended last Tuesday. With **scheduled redirects**, a “Scan for today's offer” QR can point at your weekend-sale page only Fri–Sun, and fall back to your regular catalogue the rest of the week. When the campaign ends, the same printed poster automatically stops advertising it. One evergreen poster, endless campaigns.",
      },
      { t: "h2", text: "Window shopping after closing time" },
      {
        t: "p",
        text: "Your window display works 24 hours; your door doesn't. A window QR pointing at your catalogue or WhatsApp lets the 9 PM window-shopper browse and order. With a time rule, the same code can even show “we're open, come in!” during hours and the catalogue after hours.",
      },
      { t: "h2", text: "UPI payments anywhere" },
      {
        t: "p",
        text: "Beyond the counter soundbox: put a **UPI QR** on invoices, delivery challans and home-delivery packages. Fixed-amount UPI QRs work well for standard items (gift cards, delivery charges).",
      },
      { t: "h2", text: "The WhatsApp catalogue loop" },
      {
        t: "p",
        text: "A **WhatsApp QR** on the bag or bill (“Scan to get new-arrival updates”) turns a one-time walk-in into a contact you can re-engage. Prefill the first message — “Hi! Add me to the new arrivals list” — so the customer sends it with one tap.",
      },
      { t: "h2", text: "Packaging that keeps selling" },
      {
        t: "p",
        text: "On product packaging, a QR can host care instructions, warranty registration or a reorder link. Dynamic codes matter here most of all: packaging is printed in bulk months ahead, and the destination can evolve after the boxes are in the warehouse.",
      },
      { t: "h2", text: "What the analytics tell a shopkeeper" },
      {
        t: "ul",
        items: [
          "**Scans per placement** — the window QR out-scanning the counter QR tells you where attention lives.",
          "**Scan times** — evening scan spikes justify later hours or an after-hours catalogue.",
          "**Device split** — 95% mobile means your catalogue page must load fast on a phone.",
        ],
      },
      {
        t: "tip",
        text: "Start with three codes: window (catalogue), counter (UPI + reviews), packaging (WhatsApp). Measure for a month, then expand what works.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "qr-codes-for-real-estate",
    title: "QR codes for real estate: site boards, brochures and virtual tours",
    excerpt:
      "How builders and brokers use dynamic QR codes — site boards that stay current for years, brochure downloads, virtual tours, WhatsApp lead capture and scan analytics per project.",
    date: "2026-07-14",
    readMinutes: 6,
    tag: "Real estate",
    blocks: [
      {
        t: "p",
        text: "Real estate marketing lives on printed material with a long shelf life — site boards, hoardings, brochures, newspaper ads. That's exactly where dynamic QR codes shine: **the print stays up for years while the information behind it stays current**.",
      },
      { t: "h2", text: "The site board that updates itself" },
      {
        t: "p",
        text: "A hoarding at the project site is often the single biggest lead source — and the most expensive thing to reprint. Put a dynamic QR on it pointing at the project page. As the project moves from **launch → under construction → possession → resale**, the destination evolves; the board doesn't. Sold out? Point the same code at your next project instead of wasting the traffic.",
      },
      { t: "h2", text: "Brochures without the printing bill" },
      {
        t: "p",
        text: "A **PDF QR** on the one-page flyer serves the full 30-page brochure with floor plans and price lists. When prices revise (they always do), upload the new PDF — every flyer already distributed now serves the new price list. No more “please ignore the rates on page 12”.",
      },
      { t: "h2", text: "Virtual tours from print" },
      {
        t: "p",
        text: "Point a QR at your walkthrough video or 3D tour. A buyer standing outside a locked site office at 8 PM can tour the sample flat from the pavement. Track scans to see which locations' boards actually generate interest.",
      },
      { t: "h2", text: "WhatsApp lead capture" },
      {
        t: "p",
        text: "The highest-converting real-estate QR is the simplest: **WhatsApp with a prefilled message** — “Hi, I'm interested in [project name], please share details.” The prospect taps send and you have their number — no form, no drop-off. Put it on every board, ad and brochure.",
      },
      { t: "h2", text: "One code per channel = attribution" },
      {
        t: "p",
        text: "Create separate QRs for the site board, the newspaper ad, the brochure and the broker network — all pointing at the same page. Your dashboard now shows **which channel produces scans**, which is the closest thing print gets to click-through analytics. That's how you decide whether the ₹2 lakh hoarding earned its keep.",
      },
      {
        t: "ul",
        items: [
          "Site board → “Site Board — Whitefield” QR",
          "Times of India ad → “TOI July” QR",
          "Brochure → “Brochure v3” QR",
          "Broker kit → “Channel partners” QR",
        ],
      },
      {
        t: "tip",
        text: "Scan locations and times are useful too: weekend scan spikes tell you when to staff the site office.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "qr-codes-for-salons-and-clinics",
    title: "QR codes for salons, spas and clinics: bookings, reviews and repeat visits",
    excerpt:
      "Appointment booking from a poster, a feedback funnel that fills your Google profile, price lists that update without reprinting, and WhatsApp reminders — QR codes for service businesses.",
    date: "2026-07-10",
    readMinutes: 6,
    tag: "Services",
    blocks: [
      {
        t: "p",
        text: "Salons, spas, dental clinics and diagnostics centres share one economic truth: the **empty slot is pure loss** and the **repeat customer is pure profit**. QR codes attack both.",
      },
      { t: "h2", text: "Booking from the poster" },
      {
        t: "p",
        text: "A “Scan to book” QR — on the door, the mirror, the receipt — pointing at your booking page or WhatsApp removes the friction between “I should book” and “I booked”. With a **WhatsApp QR**, prefill the message: “Hi! I'd like to book an appointment for ___” so the customer only fills the blank.",
      },
      { t: "h2", text: "The mirror is prime real estate" },
      {
        t: "p",
        text: "A client in the chair spends 30–60 minutes looking at the mirror. A small, elegant QR in the corner — “Scan for our full service menu & offers” — reaches them at peak attention. Because it's dynamic, this month's offer is always behind it without re-stickering.",
      },
      { t: "h2", text: "Reviews while the experience is fresh" },
      {
        t: "p",
        text: "The best moment to ask for a review is at checkout, post-service glow included. A **feedback QR** at the counter collects a private star rating first, then shows your Google review link to every respondent. Unhappy clients tell you privately (and you can fix it); delighted ones are one tap from a public five-star review. Over months this compounds into the strongest local-SEO asset a service business can own.",
      },
      { t: "h2", text: "Price lists that update without reprints" },
      {
        t: "p",
        text: "Point a **PDF QR** at your rate card. Festival packages, seasonal pricing, a new treatment — update the PDF and the framed QR at reception serves it instantly.",
      },
      { t: "h2", text: "For clinics specifically" },
      {
        t: "ul",
        items: [
          "**Registration forms:** a waiting-room QR to your intake form saves front-desk time.",
          "**Reports:** a QR on the bill pointing at your patient portal for downloading reports.",
          "**Post-procedure care:** care-instruction PDFs behind a QR on discharge papers — updateable as protocols change.",
          "**WiFi QR** in the waiting room — a small kindness patients remember.",
        ],
      },
      { t: "h2", text: "Measure what matters" },
      {
        t: "p",
        text: "Scans-per-placement tell you where clients actually engage: if the mirror QR out-scans the door QR five to one, your next campaign belongs on the mirror. Scan-time patterns (lunch hours? weekends?) tell you when demand looks — staff accordingly.",
      },
      {
        t: "tip",
        text: "Keep it to two or three codes with distinct jobs (book / review / menu). A wall of QR codes gets zero scans.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "qr-codes-for-events-and-weddings",
    title: "QR codes for events and weddings: invites, check-in, schedules and photo sharing",
    excerpt:
      "Digital invitations, live schedules that survive last-minute changes, photo-sharing walls, feedback collection — how one printed QR runs an entire event.",
    date: "2026-07-06",
    readMinutes: 6,
    tag: "Events",
    blocks: [
      {
        t: "p",
        text: "Events are where dynamic QR codes are almost unfair: everything is printed weeks early, everything changes at the last minute, and after the event the printed material becomes garbage. Unless the QR on it is dynamic — then it becomes whatever you need next.",
      },
      { t: "h2", text: "The invitation QR" },
      {
        t: "p",
        text: "On a wedding card or event invite, one elegant QR carries everything paper can't: venue map link, RSVP form, dress code, gift registry, live-stream link for remote relatives. Print the cards months early; keep editing the page behind the QR until the day itself.",
      },
      { t: "h2", text: "A schedule that survives reality" },
      {
        t: "p",
        text: "Every event schedule changes. When the sangeet moves from 7 to 8, the printed programme is wrong — but the QR on it isn't, because you updated the destination in ten seconds from your phone. For multi-day events, **time-based rules** can even point the same code at each day's programme automatically: day one's schedule on Friday, day two's on Saturday.",
      },
      { t: "h2", text: "Photo sharing without an app" },
      {
        t: "p",
        text: "Table-tent QRs pointing at a shared album (Google Photos, a wedding-photo service) turn every guest into a photographer. After the event, **repoint the same code** at the official album so late scanners land on the good photos.",
      },
      { t: "h2", text: "Check-in and passes" },
      {
        t: "p",
        text: "For ticketed events, a QR on the pass pointing at your check-in list or form beats paper lists. Scan counts double as an attendance proxy per gate.",
      },
      { t: "h2", text: "For event planners: the afterlife of print" },
      {
        t: "p",
        text: "This is the professional's trick: after the event, every banner and standee you printed still has a working QR on it. Repoint them at your portfolio or enquiry form before the venue tears them down — banners in storage become lead generators at the next venue visit.",
      },
      { t: "h2", text: "Feedback while the glow lasts" },
      {
        t: "p",
        text: "A feedback QR shown on the exit standee (or the thank-you message) collects ratings while the experience is fresh — for corporate events, that's your testimonial pipeline.",
      },
      {
        t: "ul",
        items: [
          "Invite → everything page (map, RSVP, registry)",
          "Venue entrance → schedule (time-ruled per day)",
          "Tables → photo-sharing album",
          "Exit → feedback + planner's portfolio",
        ],
      },
      {
        t: "tip",
        text: "Create the QRs before the stationery goes to print, even if the pages behind them aren't ready — the destinations can be filled in later. The print deadline stops being your content deadline.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "qr-codes-for-marketing-agencies",
    title: "QR codes for marketing agencies: campaign attribution and client reporting",
    excerpt:
      "How agencies use dynamic QR codes to make print campaigns measurable — per-channel attribution, A/B testing creatives, scan-time insights and client-ready analytics.",
    date: "2026-07-02",
    readMinutes: 7,
    tag: "Agencies",
    blocks: [
      {
        t: "p",
        text: "Digital campaigns report clicks; print campaigns traditionally report… vibes. Dynamic QR codes close that gap: every hoarding, flyer and newspaper ad becomes a **measurable channel with its own scan analytics**. For agencies, that's not a feature — it's the difference between “trust us” and a monthly report.",
      },
      { t: "h2", text: "One code per placement = real attribution" },
      {
        t: "p",
        text: "The cardinal rule: **never reuse a QR across channels.** Create one code per placement — the mall standee, the newspaper ad, the flyer batch, the auto-rickshaw backs — all pointing at the same landing page. The dashboard then reads like ad-platform reporting: scans per channel, per day, per city. Kill the underperformers, double down on the winners, and show the client exactly why.",
      },
      { t: "h2", text: "A/B testing print creative" },
      {
        t: "p",
        text: "Split a flyer run between two designs, each with its own QR. Two weeks later you have scan counts per creative — actual data on which design pulls. No focus group required.",
      },
      { t: "h2", text: "Campaigns that phase themselves" },
      {
        t: "p",
        text: "With scheduled redirects, one printed code can run a whole campaign arc: teaser page until launch day, offer page during the campaign, and a “campaign over — see what's next” page after. The client's expensive print placement never advertises a dead promotion.",
      },
      { t: "h2", text: "Never lose a printed link again" },
      {
        t: "p",
        text: "Agencies inherit the risk of printed URLs: the client changes their website, the campaign page moves, the microsite expires — and the printed material breaks. Dynamic codes make that a 10-second dashboard fix instead of a reprint conversation nobody wants to have.",
      },
      { t: "h2", text: "What goes in the client report" },
      {
        t: "ul",
        items: [
          "**Scans per channel** — the attribution table print never had.",
          "**Daily trend** — campaign momentum, launch spikes, weekend patterns.",
          "**Locations** — city-level reach for multi-city campaigns.",
          "**Device split** — evidence for the mobile-first landing page you recommended.",
          "**Scan times** — when the audience engages; feeds media-planning decisions.",
        ],
      },
      { t: "h2", text: "Operational tips for agency accounts" },
      {
        t: "ul",
        items: [
          "Name codes with a convention: `CLIENT — Campaign — Channel — Month`. Fifty codes later you'll thank yourself.",
          "Pause codes when campaigns end (scanners see a graceful page, not a dead promo).",
          "Test-scan every code on the final printed proof — colour shifts and lamination can affect scannability.",
        ],
      },
      {
        t: "tip",
        text: "Time-based and device-based redirects are agency superpowers: a “download the app” hoarding that routes Android to Play Store and iPhone to App Store outperforms a landing page in between.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "app-download-qr-device-targeting",
    title: "The perfect app-download QR: one code, both app stores",
    excerpt:
      "Why app-download QRs fail with a single link, and how device targeting routes Android scanners to the Play Store and iPhones to the App Store — from one printed code.",
    date: "2026-06-28",
    readMinutes: 5,
    tag: "Apps",
    blocks: [
      {
        t: "p",
        text: "You've seen the bad version everywhere: a poster with **two QR codes** side by side — “Download on the App Store” and “Get it on Google Play”. Half your poster space, twice the visual noise, and the user has to figure out which square is theirs. There's a better way.",
      },
      { t: "h2", text: "Why one plain link doesn't work either" },
      {
        t: "p",
        text: "Pointing a single QR at your Play Store page loses every iPhone scanner; a landing page with two store buttons adds a tap and a page load between intent and install. Every extra step costs conversions — mobile funnels routinely lose double-digit percentages per step.",
      },
      { t: "h2", text: "Device targeting: the one-code solution" },
      {
        t: "p",
        text: "A dynamic QR with **device rules** reads the scanner's device at redirect time and routes it instantly:",
      },
      {
        t: "ul",
        items: [
          "**Android** → your Play Store listing",
          "**iPhone** → your App Store listing",
          "**iPad** → the tablet rule if you set one, otherwise the iOS rule",
          "**Desktop** → your website (people do scan posters with webcams, and some QR readers open on desktop) — or leave it to the default destination",
        ],
      },
      {
        t: "p",
        text: "The scanner never sees a chooser page. Android users land on Google Play, iPhone users land on the App Store, in one hop.",
      },
      { t: "h2", text: "Setting it up in QRVeda" },
      {
        t: "ol",
        items: [
          "Create a **Website QR** with your website as the default destination.",
          "Open **Smart redirects → Device targeting**.",
          "Paste your Play Store URL in Android and your App Store URL in iPhone/iOS.",
          "Test with one Android phone and one iPhone before printing.",
        ],
      },
      { t: "h2", text: "Bonus: what the analytics tell you" },
      {
        t: "p",
        text: "Your scan log now doubles as platform research: the Android/iOS split of real-world scanners tells you where install demand actually lives — useful the next time someone asks why the iOS build should (or shouldn't) ship first.",
      },
      {
        t: "tip",
        text: "Campaign trick: pair device rules with a time rule for launch day — before launch, everyone sees the “coming soon” page; from launch morning, the store routing takes over automatically.",
      },
    ],
  },
];

export const postBySlug = (slug: string) => POSTS.find((p) => p.slug === slug);
