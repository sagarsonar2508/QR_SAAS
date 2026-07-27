import type { Block, Faq } from "./blocks";

export type DocPage = {
  slug: string;
  title: string;
  /** Meta description (~150 chars) and index-card summary. */
  description: string;
  group: string;
  blocks: Block[];
  faqs?: Faq[];
};

export const DOC_GROUPS = [
  "Getting started",
  "Creating QR codes",
  "Smart features",
  "For restaurants",
  "Account & billing",
] as const;

export const DOCS: DocPage[] = [
  // ────────────────────────────────────────────────────────────────
  {
    slug: "getting-started",
    title: "Getting started with QRVeda",
    description:
      "Create your first dynamic QR code in under two minutes — from signup to a print-ready download, step by step.",
    group: "Getting started",
    blocks: [
      {
        t: "p",
        text: "QRVeda is a **dynamic QR code platform**: the QR image you print stays the same forever, while where it sends people can be changed anytime from your dashboard. This guide takes you from a fresh account to a print-ready QR code.",
      },
      { t: "h2", text: "1. Create your account" },
      {
        t: "p",
        text: "Sign up with your email and a password — no credit card required. Every account starts on the **Free plan**, which is enough to create and test your first QR codes before putting them on anything printed.",
      },
      { t: "h2", text: "2. Create your first QR code" },
      {
        t: "ol",
        items: [
          "Click **New QR Code** in the sidebar.",
          "Pick a type — **Website** is the most common; see the full list in [QR types](/docs/qr-types).",
          "Give it a name only you will see, like “Menu — front counter”. Good names matter once you have twenty codes.",
          "Fill in the destination (for a Website QR, just the URL).",
          "Optionally customise colours, shape and logo — see [Design & branding](/docs/design-and-branding).",
          "Click **Create QR code**.",
        ],
      },
      {
        t: "tip",
        text: "The live preview on the right updates as you type. What you see is exactly what you download.",
      },
      { t: "h2", text: "3. Test it before printing" },
      {
        t: "p",
        text: "Open your phone camera and point it at the preview on screen. It should open your destination within a second. Test with at least one Android and one iPhone if you can — and always test again on the **printed** material at final size before a big print run.",
      },
      { t: "h2", text: "4. Download and print" },
      {
        t: "p",
        text: "From the QR detail page you can download **PNG at 512, 1024 or 2048 pixels** and **SVG (vector)**. For anything printed, prefer SVG or the 2048px PNG — print shops can scale vectors to any size without quality loss.",
      },
      {
        t: "ul",
        items: [
          "**Table tents / stickers:** 3×3 cm minimum, 512px PNG is fine.",
          "**Posters:** SVG or 2048px PNG; keep the QR at least 5×5 cm.",
          "**Billboards / banners:** always SVG. Rule of thumb — scanning distance ÷ 10 = minimum QR width.",
        ],
      },
      { t: "h2", text: "5. Change the destination anytime" },
      {
        t: "p",
        text: "This is the whole point of dynamic QR codes: open the QR in your dashboard, edit the destination, hit save — and **every printed copy instantly points to the new destination**. No reprinting, ever. You can also pause a QR (scanners see a polite “paused” page) and resume it later.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "dynamic-vs-static",
    title: "Dynamic vs static QR codes",
    description:
      "What the difference between dynamic and static QR codes actually means — and when each one is the right choice.",
    group: "Getting started",
    blocks: [
      {
        t: "p",
        text: "Every QR code you create in QRVeda is either **dynamic** or **static**. Understanding the difference saves you from the most expensive QR mistake there is: printing thousands of copies of something you can never change.",
      },
      { t: "h2", text: "Dynamic QR codes" },
      {
        t: "p",
        text: "A dynamic QR encodes a **short link** (like `qrveda.com/Ab8K29x`), not your final destination. When someone scans it, our server looks up where that short link currently points and redirects them — typically in a few milliseconds. Because the lookup happens on our side, you can:",
      },
      {
        t: "ul",
        items: [
          "**Change the destination anytime** without touching the printed code.",
          "**Track every scan** — when, what device, which city (see [Analytics](/docs/analytics)).",
          "**Pause and resume** the code — useful for expired offers.",
          "Use **smart redirects** — different destinations by time of day or device (see [Smart redirects](/docs/smart-redirects)).",
        ],
      },
      { t: "h2", text: "Static QR codes" },
      {
        t: "p",
        text: "A static QR encodes the data **directly in the image itself** — there is no link and no server involved. QRVeda uses static codes for two types where this is the right behaviour: **WiFi** (the network name and password are in the code, so it works even with no internet) and **Contact Card / vCard** (the contact saves straight into the phone).",
      },
      {
        t: "warn",
        text: "Static QR codes cannot be edited after printing and don't produce scan analytics. The QRVeda editor marks them with a STATIC badge so you always know what you're creating.",
      },
      { t: "h2", text: "Which should you use?" },
      {
        t: "table",
        headers: ["You want to…", "Use"],
        rows: [
          ["Send people to a website, menu, form or payment", "Dynamic"],
          ["Update the destination later without reprinting", "Dynamic"],
          ["See how many people scanned, where and on what device", "Dynamic"],
          ["Share WiFi in a café or office", "Static (WiFi)"],
          ["Put your contact details on a business card", "Static (vCard)"],
        ],
      },
      {
        t: "tip",
        text: "When in doubt, choose dynamic. The ability to fix a typo'd URL after 5,000 flyers are printed pays for itself the first time you need it.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "qr-types",
    title: "All QR code types explained",
    description:
      "Every QR type in QRVeda — Website, WhatsApp, UPI, PDF, Feedback and more — what each does, its fields, and when to use it.",
    group: "Creating QR codes",
    blocks: [
      {
        t: "p",
        text: "QRVeda ships **11 QR types**. Nine are dynamic (editable, tracked) and two are static (WiFi, Contact Card). Here's what each one does and when to reach for it.",
      },
      { t: "h2", text: "Website" },
      {
        t: "p",
        text: "The workhorse. Opens any URL — your site, a Google Form, an Instagram profile, a catalogue. **Fields:** the URL. **Use it for:** almost everything that has a web address. Combined with [Smart redirects](/docs/smart-redirects) it can point somewhere different by time of day or device.",
      },
      { t: "h2", text: "WhatsApp" },
      {
        t: "p",
        text: "Opens a WhatsApp chat with your business number, optionally with a **prefilled message** like “Hi! I'd like to book a table”. **Fields:** phone number with country code, optional message. **Use it for:** order taking, enquiries, support — in India, WhatsApp converts better than any contact form.",
      },
      { t: "h2", text: "Phone Call" },
      {
        t: "p",
        text: "Dials your number the moment it's scanned (the phone shows the number and a call button). **Fields:** phone number. **Use it for:** service businesses where a call is the conversion — plumbers, clinics, delivery menus.",
      },
      { t: "h2", text: "Email" },
      {
        t: "p",
        text: "Opens the scanner's mail app with your address, and optionally a prefilled subject and body. **Fields:** email, optional subject and message. **Use it for:** B2B enquiries, CV submissions, support.",
      },
      { t: "h2", text: "SMS" },
      {
        t: "p",
        text: "Opens the SMS composer with your number and an optional prefilled text. **Fields:** phone number, optional message. **Use it for:** keyword-based campaigns (“Text WIN to enter”) and audiences with patchy data connectivity.",
      },
      { t: "h2", text: "UPI Payment" },
      {
        t: "p",
        text: "Opens the scanner's UPI app (GPay, PhonePe, Paytm — whichever they use) with your **VPA and name prefilled**, and optionally a fixed amount and note. **Fields:** UPI ID, payee name, optional amount and note. **Use it for:** accepting payments at the counter, on invoices, at market stalls. The deep link uses the standard `upi://pay` format, so it works with every UPI app.",
      },
      { t: "h2", text: "PDF / Menu" },
      {
        t: "p",
        text: "Upload a PDF and the QR opens it directly — no website needed. **Fields:** the PDF file (up to 10 MB). **Use it for:** restaurant menus, brochures, price lists, manuals. Because it's dynamic, uploading a new PDF updates every printed code instantly — the classic “new season's menu” move.",
      },
      { t: "h2", text: "Image" },
      {
        t: "p",
        text: "Same as PDF but for a single image (poster, map, certificate). **Fields:** PNG/JPG/WebP/GIF file. **Use it for:** event maps, seating charts, offer posters.",
      },
      { t: "h2", text: "Feedback" },
      {
        t: "p",
        text: "Opens a **hosted star-rating page** we run for you. Customers rate 1–5 and can leave a private comment; afterwards every respondent is shown your Google review link. Ratings stay private to your dashboard. **Fields:** optional question text, optional Google review URL. **Use it for:** collecting honest feedback and growing Google reviews the policy-compliant way — see [Feedback & reviews](/docs/feedback-and-reviews).",
      },
      { t: "h2", text: "WiFi (static)" },
      {
        t: "p",
        text: "Scanning connects the phone to your network — no typing the password. **Fields:** network name, password, security type. **Use it for:** cafés, hotels, offices, waiting rooms. Works entirely offline; cannot be tracked or edited after printing.",
      },
      { t: "h2", text: "Contact Card / vCard (static)" },
      {
        t: "p",
        text: "Scanning offers to save a full contact — name, phone, email, company, website — straight into the phone. **Fields:** all optional except first name. **Use it for:** business cards, email signatures, conference badges.",
      },
      {
        t: "tip",
        text: "Menu, Instagram, Google Review or “link in bio” QRs are just Website / PDF types pointed at the right URL — you don't need a special type for them.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "design-and-branding",
    title: "Design & branding your QR codes",
    description:
      "Colours, module shapes, logos, Photo QR and error correction — how to make a branded QR that still scans perfectly.",
    group: "Creating QR codes",
    blocks: [
      {
        t: "p",
        text: "A QR code doesn't have to be a black-and-white square. QRVeda renders every code locally with full styling control — and warns you before a design choice hurts scannability.",
      },
      { t: "h2", text: "Colours" },
      {
        t: "p",
        text: "Set any foreground and background colour. Two rules keep codes scannable: **keep strong contrast** (dark modules on a light background — aim for the foreground to be much darker) and **never invert** (light modules on dark backgrounds confuse many scanners). Brand-dark-blue on white: great. Yellow on white: will fail.",
      },
      { t: "h2", text: "Module shapes" },
      {
        t: "p",
        text: "Six styles — **Square** (classic), **Rounded**, **Dots**, **Classy**, **Classy Rounded** and **Extra Rounded** — plus styled corner “eyes”. Shape is pure aesthetics and doesn't affect scanning; pick what matches your brand's feel.",
      },
      { t: "h2", text: "Logo overlay" },
      {
        t: "p",
        text: "Upload a PNG/JPG logo and it's placed in the centre with a clean background knockout. QRVeda **automatically raises error correction to level H** when a logo is present, so the code stays scannable even with the middle covered.",
      },
      { t: "h2", text: "Photo QR (halftone blend)" },
      {
        t: "p",
        text: "Our signature feature: blend an actual photo — your best-selling dish, your storefront, a product shot — **into the QR pattern itself**. The photo becomes the texture of the code while the functional patterns stay full-strength. Photo QRs use maximum error correction and override the shape setting.",
      },
      {
        t: "warn",
        text: "Photo QRs are verified with a scanner before download, but always test-scan a printed proof at final size before a large run — paper, ink and lighting all matter.",
      },
      { t: "h2", text: "Error correction levels" },
      {
        t: "p",
        text: "QR codes carry redundant data so they still scan when partially damaged or obscured. Higher levels mean denser codes but more tolerance:",
      },
      {
        t: "table",
        headers: ["Level", "Damage tolerance", "Use when"],
        rows: [
          ["L", "~7%", "Clean digital display, size is at a premium"],
          ["M", "~15%", "Default — fine for most print"],
          ["Q", "~25%", "Outdoor, laminated, likely to get scuffed"],
          ["H", "~30%", "Logos, Photo QR, anything on rough surfaces"],
        ],
      },
      { t: "h2", text: "Print checklist" },
      {
        t: "ul",
        items: [
          "Leave a **quiet zone** — white margin around the code at least 4 modules wide (downloads include it; don't crop it off).",
          "Minimum size 2×2 cm for arm's-length scanning; bigger for posters.",
          "Matte finishes scan better than glossy under shop lighting.",
          "Download **SVG** for professional printing — it scales infinitely.",
        ],
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "smart-redirects",
    title: "Smart redirects: scheduling & device targeting",
    description:
      "Send scanners to different destinations by day, time of day (including overnight windows) or device — Android, iPhone, tablet, desktop.",
    group: "Smart features",
    blocks: [
      {
        t: "p",
        text: "By default a dynamic QR sends everyone to one destination. **Smart redirects** let a single printed code behave differently depending on **when** it's scanned and **what device** scans it. You'll find them under **Smart redirects → Advanced** when creating or editing any dynamic QR.",
      },
      { t: "h2", text: "Day & time schedule" },
      {
        t: "p",
        text: "Add up to 20 rules. Each rule has: the **days of the week** it applies to, a **start** and **end** time, and the **URL** to send scanners to while the rule is active. Outside every rule's window, scans go to the QR's normal destination — you never have to define a “default” rule.",
      },
      { t: "h3", text: "Example: a restaurant menu QR" },
      {
        t: "table",
        headers: ["Rule", "Days", "Time", "Destination"],
        rows: [
          ["Breakfast menu", "Every day", "07:00 → 11:30", "/breakfast.pdf"],
          ["Lunch specials", "Mon–Fri", "11:30 → 15:00", "/lunch.pdf"],
          ["Weekend brunch", "Sat–Sun", "11:30 → 15:00", "/brunch.pdf"],
          ["(no rule matches)", "—", "all other times", "regular menu (default)"],
        ],
      },
      { t: "h3", text: "Overnight windows (past midnight)" },
      {
        t: "p",
        text: "If a rule's end time is **earlier than or equal to its start time, the window rolls into the next day**. A rule set to Friday 18:00 → 02:00 is active Friday evening all the way until 2 AM Saturday. Setting start and end to the same time makes the rule cover the full 24 hours of the selected days. The editor shows a “runs past midnight” note whenever a rule wraps.",
      },
      { t: "h3", text: "Timezone" },
      {
        t: "p",
        text: "Every QR's schedule runs in a timezone you choose (auto-detected from your browser, `Asia/Kolkata` by default). Your customers' location doesn't matter — “6 PM” means 6 PM **where your business is**.",
      },
      { t: "h2", text: "Device targeting" },
      {
        t: "p",
        text: "Set different destinations for **Android**, **iPhone/iOS**, **Tablet/iPad** and **Desktop** scanners. Leave any of them empty to fall back to the normal destination. The classic use: one printed “Download our app” QR that sends Android phones to the Play Store and iPhones to the App Store.",
      },
      {
        t: "ul",
        items: [
          "iPads use the **Tablet** rule if set, otherwise the **iOS** rule.",
          "Android tablets use **Tablet**, otherwise **Android**.",
          "Laptops and desktops (someone scanning from a webcam or opening the short link directly) use **Desktop**.",
        ],
      },
      { t: "h2", text: "Priority: which rule wins?" },
      {
        t: "ol",
        items: [
          "**Device rule** — if the scanner's device has a URL set, it wins.",
          "**Schedule rule** — otherwise, the first schedule rule whose window covers the current moment.",
          "**Default destination** — otherwise, the QR's normal destination.",
        ],
      },
      {
        t: "tip",
        text: "Rules take effect on the very next scan — like every edit in QRVeda, nothing needs reprinting. QRs with active rules show a violet “smart” badge in your list.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "analytics",
    title: "Scan analytics explained",
    description:
      "Every metric on your QRVeda dashboard — total scans, daily trends, devices, locations, recent scans — what it means and how it's measured.",
    group: "Smart features",
    blocks: [
      {
        t: "p",
        text: "Every scan of a dynamic QR is recorded — after the visitor has already been redirected, so tracking never slows the scan down. Here's what each number on your dashboard means and how to read it.",
      },
      { t: "h2", text: "The dashboard at a glance" },
      {
        t: "ul",
        items: [
          "**Total QR Codes** — how many codes exist in your account (active and paused).",
          "**Total Scans** — all-time scans across every dynamic QR.",
          "**Scans Today** — scans since midnight, your local time.",
          "**Top QR (30 days)** — your best performer this month; a quick health check on your most important placement.",
        ],
      },
      { t: "h2", text: "The 30-day scan chart" },
      {
        t: "p",
        text: "The line chart shows scans per day for the last 30 days — account-wide on the dashboard, per-code on each QR's page. What to look for: **spikes** (a campaign, a busy weekend), **decay** (a placement losing visibility — move the sticker), and **flat zeros** (the code may be damaged or the placement removed; test-scan it).",
      },
      { t: "h2", text: "Device, OS & browser split" },
      {
        t: "p",
        text: "Each scan records the device type (mobile / tablet / desktop), operating system (Android, iOS…) and browser. The pie chart on your dashboard shows the split. **How to use it:** if 95% of your scanners are on mobile, make sure the destination page is mobile-friendly; if Android dominates, prioritise the Play Store link in your [Smart redirects](/docs/smart-redirects) device rules.",
      },
      { t: "h2", text: "Locations" },
      {
        t: "p",
        text: "Country and city come from network-level geo headers supplied by the CDN/proxy in front of the app. They're accurate to the **city level, not GPS** — we never access the scanner's actual location. If you self-host or run without a CDN, location may show as “—” until geo headers are available.",
      },
      { t: "h2", text: "Recent scans table" },
      {
        t: "p",
        text: "Each QR's page lists its latest scans: timestamp, device, OS, browser and location. Use it to verify a placement is live (“did anyone scan the new poster yet?”) and to spot-check after changing a destination.",
      },
      { t: "h2", text: "Feedback analytics" },
      {
        t: "p",
        text: "Feedback QRs additionally show every rating and comment, plus the average score. Ratings are private to you — see [Feedback & reviews](/docs/feedback-and-reviews).",
      },
      { t: "h2", text: "Privacy: what we do and don't store" },
      {
        t: "ul",
        items: [
          "**Stored:** timestamp, device type, OS, browser, city/country (from headers), referrer.",
          "**Hashed:** the scanner's IP is one-way hashed — we can count unique-ish visitors but can't identify anyone.",
          "**Never collected:** names, phone numbers, GPS location, or anything typed on the destination page.",
        ],
      },
      {
        t: "warn",
        text: "Static QR codes (WiFi, Contact Card) are scanned entirely offline and produce no analytics — the scan never touches a server. If tracking matters, use a dynamic type.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "restaurant-suite",
    title: "Restaurant Suite",
    description:
      "Set up per-table menu QRs, a feedback funnel and a Google-review QR for your restaurant in four questions — with a print-ready A4 sheet.",
    group: "For restaurants",
    blocks: [
      {
        t: "p",
        text: "The Restaurant Suite packages everything a restaurant needs into one guided setup: per-table menu QRs, a private feedback QR and a Google-review QR — plus a print-ready sticker sheet. Four questions, about two minutes.",
      },
      { t: "h2", text: "What the wizard asks" },
      {
        t: "ol",
        items: [
          "**Restaurant name** — used to label everything.",
          "**Your menu** — upload a PDF or paste a link to an existing online menu.",
          "**Number of tables** — one QR per table is generated automatically.",
          "**Extras** — whether to include the feedback QR and Google-review QR.",
        ],
      },
      { t: "h2", text: "What you get" },
      {
        t: "ul",
        items: [
          "**Per-table menu QRs** (“Table 1”, “Table 2”…) — all pointing at your menu, each tracked separately.",
          "**Feedback QR** — a hosted star-rating page; unhappy guests tell *you*, not Google. See [Feedback & reviews](/docs/feedback-and-reviews).",
          "**Google review QR** — straight to your review form for counters and bills.",
          "**A4 print sheet** at `/print` — every QR laid out with labels, ready for any print shop. Print → laminate → stick.",
        ],
      },
      { t: "h2", text: "Why per-table QRs (not one QR everywhere)" },
      {
        t: "p",
        text: "Because each table's code is tracked separately, your suite dashboard shows the **busiest tables** — which sections get traffic, whether window seats out-perform the back room, and whether that corner table's sticker has peeled off (zero scans for a week is a signal).",
      },
      { t: "h2", text: "Updating the menu" },
      {
        t: "p",
        text: "Upload a new PDF (or change the URL) once — **every table's QR updates instantly**. Seasonal menu, price change, out-of-stock items: none of it requires touching the printed stickers.",
      },
      {
        t: "tip",
        text: "Pair the suite with [Smart redirects](/docs/smart-redirects) to serve a different menu PDF at breakfast, lunch and dinner from the same table stickers.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "feedback-and-reviews",
    title: "Feedback & Google reviews",
    description:
      "How QRVeda's feedback funnel collects honest private ratings and grows your Google reviews — without violating Google's review-gating policy.",
    group: "For restaurants",
    blocks: [
      {
        t: "p",
        text: "The Feedback QR opens a hosted page where customers rate their experience 1–5 stars and can leave a comment. It solves two problems at once: **hearing about problems privately** before they become public one-star reviews, and **making it effortless** for happy customers to review you on Google.",
      },
      { t: "h2", text: "How the funnel works" },
      {
        t: "ol",
        items: [
          "Customer scans the QR on the table, bill or counter.",
          "They pick a star rating and optionally write a comment — takes ten seconds, no login.",
          "The rating and comment are saved **privately** to your dashboard.",
          "On the thank-you screen, **every** respondent sees your Google review link (if you've added one).",
        ],
      },
      { t: "h2", text: "Why everyone sees the review link (important)" },
      {
        t: "p",
        text: "Some tools show the Google link only to 4–5 star raters. That's called **review gating, and Google's policy explicitly prohibits it** — businesses have had review profiles purged for it. QRVeda shows the link to every respondent. You still win: unhappy customers have already vented privately to you and rarely go on to Google, while happy ones get a one-tap path to a public review.",
      },
      { t: "h2", text: "Reading your feedback" },
      {
        t: "p",
        text: "The QR's detail page lists every rating with its comment and timestamp, plus your average score. Watch for **patterns, not individual scores** — three “slow service” comments on Saturday nights is an operations insight, not bad luck.",
      },
      { t: "h2", text: "Where to place feedback QRs" },
      {
        t: "ul",
        items: [
          "On the bill folder — the moment of maximum opinion.",
          "Table tents, next to (not instead of) the menu QR.",
          "At the exit / billing counter.",
          "On delivery packaging — feedback from customers you never see.",
        ],
      },
      {
        t: "tip",
        text: "Rate-limiting is built in: the same visitor can't spam ratings. Getting your Google review link: search your business on Google Maps → Reviews → Share — or use the link Google Business Profile gives you under “Ask for reviews”.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "plans-and-billing",
    title: "Plans & billing",
    description:
      "How QRVeda plans, QR quotas, upgrades, renewals and cancellation work — including what happens to your QR codes if you downgrade.",
    group: "Account & billing",
    blocks: [
      {
        t: "p",
        text: "QRVeda plans differ mainly in **how many QR codes you can have** and access to advanced features. Every plan includes unlimited scans — we never charge you for being successful.",
      },
      { t: "h2", text: "How quotas work" },
      {
        t: "p",
        text: "Your plan sets the number of QR codes your account can hold. When you hit the limit, creating another code prompts an upgrade — **existing codes keep working and keep tracking scans no matter what**. Deleting a code frees a slot.",
      },
      { t: "h2", text: "Upgrading" },
      {
        t: "p",
        text: "Go to **Billing**, pick a plan and pay. In India you can pay by UPI Autopay, card or netbanking (processed by Razorpay); everywhere else, card and local methods are handled by Paddle, our merchant of record, and prices are shown in your local currency. Monthly and annual billing are available — annual saves roughly two months. Your new quota applies immediately.",
      },
      { t: "h2", text: "Cancelling & downgrading" },
      {
        t: "ul",
        items: [
          "Cancel anytime from the Billing page — your plan stays active until the end of the period you've paid for.",
          "After that you move to the Free plan. **No QR codes are deleted** and every code keeps redirecting; you just can't create new ones beyond the Free quota.",
          "If a renewal payment fails, we retry; if it keeps failing the subscription pauses and you drop to Free the same way.",
        ],
      },
      { t: "h2", text: "Invoices & GST" },
      {
        t: "p",
        text: "Payment receipts are emailed by the payment provider after each charge. For GST invoices or billing questions, contact support with your registered email.",
      },
      {
        t: "warn",
        text: "Deleting a QR code is permanent: anyone scanning a printed copy will hit a dead link. If you might use it again, **pause** it instead — paused codes show a friendly “paused” page and can be resumed anytime.",
      },
    ],
  },
  // ────────────────────────────────────────────────────────────────
  {
    slug: "faq",
    title: "Frequently asked questions",
    description:
      "Quick answers about QRVeda: expiry, scan limits, changing destinations after printing, offline use, privacy and more.",
    group: "Account & billing",
    blocks: [
      {
        t: "p",
        text: "Short answers to the questions we hear most. If yours isn't here, the detailed guides in the sidebar go deeper on every feature.",
      },
    ],
    faqs: [
      {
        q: "Do QRVeda QR codes expire?",
        a: "No. Dynamic QR codes keep working as long as your account exists — including on the Free plan. Paused codes show a “paused” page until you resume them.",
      },
      {
        q: "Is there a limit on scans?",
        a: "No. Every plan, including Free, has unlimited scans. Plans differ in the number of QR codes you can create, not how much they're used.",
      },
      {
        q: "Can I really change where a printed QR code points?",
        a: "Yes — that's the core of a dynamic QR. Edit the destination in your dashboard and every printed copy follows the new destination on the very next scan. Nothing is reprinted.",
      },
      {
        q: "Can one QR code go to different places at different times?",
        a: "Yes. Smart redirects let you add day-and-time rules (e.g. a lunch menu 11:30–15:00, a dinner menu 18:00–02:00 — overnight windows are supported) and device rules (Android → Play Store, iPhone → App Store). Outside every rule, scans go to the normal destination.",
      },
      {
        q: "Do the QR codes work without internet?",
        a: "Static types (WiFi, Contact Card) work fully offline. Dynamic types need the scanner to have a connection, since a redirect happens — that's what makes them editable and trackable.",
      },
      {
        q: "What analytics do I get?",
        a: "Per scan: time, device type, OS, browser, and city/country from network headers. Dashboards show totals, a 30-day trend, device split, top locations and per-QR breakdowns. IPs are hashed; we never collect personal data or GPS locations.",
      },
      {
        q: "Can I put my logo or a photo in the QR?",
        a: "Yes — upload a logo for a centred overlay (error correction is raised automatically), or use Photo QR to blend a full photo into the code pattern itself.",
      },
      {
        q: "What file formats can I download?",
        a: "PNG at 512 / 1024 / 2048 pixels, and SVG vector. Use SVG or 2048px PNG for professional printing.",
      },
      {
        q: "Is the feedback feature compliant with Google's review policy?",
        a: "Yes. Every respondent sees your Google review link regardless of their rating — there is no review gating, which Google prohibits.",
      },
      {
        q: "What happens to my QR codes if I stop paying?",
        a: "Nothing breaks. You drop to the Free plan, all existing codes keep redirecting and tracking; you just can't create new codes beyond the Free quota.",
      },
    ],
  },
];

export const docBySlug = (slug: string) => DOCS.find((d) => d.slug === slug);
