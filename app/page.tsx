import Link from "next/link";
import {
  QrCode,
  RefreshCw,
  BarChart3,
  MessageCircle,
  IndianRupee,
  UtensilsCrossed,
  Download,
  Globe,
  Phone,
  Mail,
  Wifi,
  Contact,
  FileText,
  Image as ImageIcon,
  MessageSquare,
  Star,
  Check,
  ArrowRight,
  ChevronDown,
} from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { TIERS, billingCurrency, formatMoney } from "@/lib/billing";
import { planCtaHref } from "@/lib/next-path";
import HeroDemo from "@/components/landing/HeroDemo";
import Reveal from "@/components/landing/Reveal";

const FEATURES = [
  {
    icon: RefreshCw,
    tile: "bg-indigo-100 text-indigo-600",
    title: "Change the destination anytime",
    body: "Every QR gets a short link. Point it at your menu today, a festival offer tomorrow — without reprinting a single sticker.",
  },
  {
    icon: BarChart3,
    tile: "bg-sky-100 text-sky-600",
    title: "Know every scan",
    body: "Time, device, browser, OS and location for every scan. Daily trends, top performers, busiest tables.",
  },
  {
    icon: MessageCircle,
    tile: "bg-emerald-100 text-emerald-600",
    title: "WhatsApp-first",
    body: "One scan opens a WhatsApp chat with your business — with the message pre-typed. Built for how India talks.",
  },
  {
    icon: IndianRupee,
    tile: "bg-amber-100 text-amber-600",
    title: "UPI payments built in",
    body: "Generate UPI payment QRs with your VPA, amount and note. Works with GPay, PhonePe, Paytm and every UPI app.",
  },
  {
    icon: UtensilsCrossed,
    tile: "bg-rose-100 text-rose-600",
    title: "Restaurant suite",
    body: "Per-table menu QRs, a private feedback funnel, a Google review QR and a print-ready sticker sheet — set up in four questions.",
  },
  {
    icon: ImageIcon,
    tile: "bg-violet-100 text-violet-600",
    title: "Photo QR codes",
    body: "Blend your dish, product or storefront photo into the QR itself — a code people actually want to scan. Print-ready PNG & vector SVG export.",
  },
];

const TYPES = [
  { icon: Globe, label: "Website" },
  { icon: MessageCircle, label: "WhatsApp" },
  { icon: IndianRupee, label: "UPI Payment" },
  { icon: FileText, label: "PDF / Menu" },
  { icon: Star, label: "Feedback" },
  { icon: Phone, label: "Phone" },
  { icon: Mail, label: "Email" },
  { icon: MessageSquare, label: "SMS" },
  { icon: ImageIcon, label: "Image" },
  { icon: Wifi, label: "WiFi" },
  { icon: Contact, label: "Contact Card" },
];

// Prices come from TIERS at render time in the visitor's currency; only the
// marketing copy lives here.
const PLANS = [
  {
    key: "free" as const,
    name: "Free",
    period: "forever",
    tagline: "Try it out",
    features: ["3 dynamic QR codes", "Scan analytics", "All QR types", "PNG & SVG export"],
    cta: "Start free",
    highlight: false,
    contactSales: false,
  },
  {
    key: "starter" as const,
    name: "Starter",
    period: "/month",
    tagline: "Freelancers & single shops",
    features: [
      "25 dynamic QR codes",
      "Full scan analytics",
      "All QR types incl. UPI",
      "Priority email support",
    ],
    cta: "Get started",
    highlight: false,
    contactSales: false,
  },
  {
    key: "business" as const,
    name: "Business",
    period: "/month",
    tagline: "Restaurants & retailers",
    features: [
      "100 dynamic QR codes",
      "Restaurant suite — menu, tables, feedback",
      "Google review funnel",
      "Print-ready table sheets",
    ],
    cta: "Get started",
    highlight: true,
    contactSales: false,
  },
  {
    key: "agency" as const,
    name: "Agency",
    period: "/month",
    tagline: "Agencies & print shops",
    features: [
      "1,000 dynamic QR codes",
      "Everything in Business",
      "White-label (coming soon)",
      "Priority support",
    ],
    cta: "Talk to us",
    highlight: false,
    // Agency buyers get a conversation rather than self-serve checkout, so this
    // CTA goes to /contact. Self-serve is still available from the billing page
    // for anyone who'd rather just pay.
    contactSales: true,
  },
];

const FAQS = [
  {
    q: "What makes a QR code “dynamic”?",
    a: "A dynamic QR encodes a short link instead of your final destination. When someone scans it, we instantly redirect them to wherever you've currently pointed it — so you can change the destination anytime without reprinting. Static QRs (like WiFi or contact cards) bake data directly into the image and can't be changed after printing.",
  },
  {
    q: "Do my QR codes ever expire?",
    a: "No. As long as your account is active, every QR keeps working. You can pause a QR yourself anytime — scanners see a polite “paused” page instead of a broken link.",
  },
  {
    q: "Is the UPI payment QR free to use?",
    a: "Yes — we generate a standard UPI deep link with your own UPI ID. Payments go directly to your bank account through your UPI app; we never touch or hold your money.",
  },
  {
    q: "What happens if I cancel my plan?",
    a: "You keep your plan until the end of the period you've paid for. After that, your account moves to the Free plan — your QR codes and analytics are kept, and your most important QRs keep redirecting.",
  },
  {
    q: "Can I use my own logo and colors?",
    a: "Yes — custom colors, six module shapes (square, rounded, dots, classy and more) and your logo in the center, with error correction raised automatically so the code stays scannable. Export as print-quality PNG or vector SVG.",
  },
];

const CHART_BARS = [35, 55, 40, 70, 62, 85, 78, 95, 88, 100, 92, 110];

export default async function LandingPage() {
  const user = await getSessionUser();
  const appHref = user ? "/dashboard" : "/signup";
  const currency = await billingCurrency();

  const siteUrl = process.env.APP_URL ?? "http://localhost:3003";
  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Organization",
      name: "QRVeda",
      url: siteUrl,
      description:
        "Dynamic QR code platform — editable destinations, scan analytics, smart redirects by time and device.",
    },
    {
      "@context": "https://schema.org",
      "@type": "SoftwareApplication",
      name: "QRVeda",
      applicationCategory: "BusinessApplication",
      operatingSystem: "Web",
      url: siteUrl,
      description:
        "Create dynamic QR codes you can edit anytime — with scan analytics, time-based scheduling, device targeting, WhatsApp, UPI and menu QRs.",
      offers: { "@type": "Offer", price: "0", priceCurrency: currency },
    },
    {
      "@context": "https://schema.org",
      "@type": "WebSite",
      name: "QRVeda",
      url: siteUrl,
    },
  ];

  return (
    <div className="bg-white text-gray-900 min-h-screen">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      {/* Nav */}
      <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100">
        <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
          <Link href="/" className="flex items-center gap-2">
            <span className="bg-indigo-600 text-white rounded-lg p-1.5">
              <QrCode className="w-4 h-4" />
            </span>
            <span className="font-bold text-lg">QRVeda</span>
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <a href="#features" className="text-gray-600 hover:text-gray-900 hidden md:block">
              Features
            </a>
            <a href="#pricing" className="text-gray-600 hover:text-gray-900 hidden sm:block">
              Pricing
            </a>
            <Link href="/docs" className="text-gray-600 hover:text-gray-900 hidden sm:block">
              Docs
            </Link>
            <Link href="/blog" className="text-gray-600 hover:text-gray-900 hidden sm:block">
              Blog
            </Link>
            {user ? (
              <Link
                href="/dashboard"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 font-medium shadow-sm"
              >
                Dashboard
              </Link>
            ) : (
              <>
                <Link href="/login" className="text-gray-600 hover:text-gray-900">
                  Log in
                </Link>
                <Link
                  href="/signup"
                  className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 font-medium shadow-sm"
                >
                  Start free
                </Link>
              </>
            )}
          </nav>
        </div>
      </header>

      {/* Hero */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute inset-0"
          style={{
            background:
              "radial-gradient(700px 380px at 20% 0%, rgba(99,102,241,0.10), transparent 70%), radial-gradient(600px 300px at 90% 10%, rgba(167,139,250,0.10), transparent 70%)",
          }}
        />
        <div className="max-w-6xl mx-auto px-4 pt-16 pb-20 relative grid lg:grid-cols-2 gap-12 items-center">
          <div>
            <p className="animate-fade-up inline-flex items-center gap-2 border border-indigo-200 bg-indigo-50 text-indigo-700 text-xs font-semibold rounded-full px-3 py-1 mb-6">
              🇮🇳 Built for Indian businesses · WhatsApp & UPI ready
            </p>
            <h1
              className="animate-fade-up text-4xl md:text-5xl font-extrabold tracking-tight leading-tight"
              style={{ animationDelay: "80ms" }}
            >
              Print your QR once.{" "}
              <span className="bg-gradient-to-r from-indigo-600 to-violet-600 bg-clip-text text-transparent">
                Change where it goes, forever.
              </span>
            </h1>
            <p
              className="animate-fade-up text-gray-600 text-lg mt-5 max-w-xl"
              style={{ animationDelay: "160ms" }}
            >
              Dynamic QR codes with real scan analytics. Point the same printed
              QR at your menu, WhatsApp, UPI, or this week&apos;s offer — and see
              exactly who scans, when, and where.
            </p>
            <div
              className="animate-fade-up flex flex-wrap items-center gap-3 mt-8"
              style={{ animationDelay: "240ms" }}
            >
              <Link
                href={appHref}
                className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-6 py-3 font-semibold shadow-lg shadow-indigo-200 transition-transform hover:-translate-y-0.5"
              >
                Create your first QR free <ArrowRight className="w-4 h-4" />
              </Link>
              <a
                href="#pricing"
                className="inline-flex items-center gap-2 border border-gray-300 hover:border-indigo-400 hover:text-indigo-700 rounded-xl px-6 py-3 font-semibold text-gray-700 transition-colors"
              >
                See pricing
              </a>
            </div>
            <p
              className="animate-fade-up text-xs text-gray-400 mt-4"
              style={{ animationDelay: "300ms" }}
            >
              Free plan · no card required · 2-minute setup
            </p>
          </div>

          <div className="animate-fade-up" style={{ animationDelay: "200ms" }}>
            <HeroDemo />
          </div>
        </div>

        {/* QR type marquee */}
        <div className="border-y border-gray-100 bg-gray-50/60 py-4 overflow-hidden">
          <div className="marquee-track flex w-max gap-3">
            {[...TYPES, ...TYPES].map((t, i) => (
              <span
                key={`${t.label}-${i}`}
                className="inline-flex items-center gap-1.5 bg-white border border-gray-200 rounded-full px-4 py-1.5 text-sm text-gray-600 shadow-sm"
              >
                <t.icon className="w-4 h-4 text-indigo-500" /> {t.label}
              </span>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section id="features" className="max-w-6xl mx-auto px-4 py-20">
        <Reveal>
          <h2 className="text-3xl font-bold text-center">
            Not a QR generator. An outcome machine.
          </h2>
          <p className="text-gray-500 text-center mt-3 max-w-xl mx-auto">
            Businesses don&apos;t buy QR codes — they buy more WhatsApp enquiries,
            more payments, more reviews. That&apos;s what this is for.
          </p>
        </Reveal>
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-5 mt-12">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 70}>
              <div className="group bg-white border border-gray-200 rounded-2xl p-6 h-full transition-all duration-300 hover:-translate-y-1 hover:shadow-xl hover:shadow-gray-100 hover:border-indigo-200">
                <span
                  className={`inline-flex rounded-xl p-2.5 mb-4 transition-transform duration-300 group-hover:scale-110 ${f.tile}`}
                >
                  <f.icon className="w-5 h-5" />
                </span>
                <h3 className="font-semibold text-lg">{f.title}</h3>
                <p className="text-gray-500 text-sm mt-2 leading-relaxed">{f.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Analytics preview */}
      <section className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-20 grid lg:grid-cols-2 gap-12 items-center">
          <Reveal>
            <h2 className="text-3xl font-bold">
              See what happens after the scan
            </h2>
            <p className="text-gray-500 mt-4 leading-relaxed">
              Every scan is tracked — time, device, browser and location. Spot
              your busiest hours, your top-performing table, and which poster
              actually brings customers.
            </p>
            <ul className="mt-6 space-y-3">
              {[
                "Daily scan trends for every QR",
                "Device & browser breakdown",
                "Busiest tables in your restaurant",
                "Private customer feedback with star ratings",
              ].map((item) => (
                <li key={item} className="flex items-start gap-2.5 text-sm text-gray-700">
                  <span className="bg-emerald-100 text-emerald-600 rounded-full p-0.5 mt-0.5">
                    <Check className="w-3.5 h-3.5" />
                  </span>
                  {item}
                </li>
              ))}
            </ul>
          </Reveal>

          <Reveal delay={120}>
            <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-gray-100 p-6">
              <div className="flex items-center justify-between mb-5">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wide text-gray-400">
                    Scans — last 12 days
                  </p>
                  <p className="text-2xl font-extrabold text-gray-900">
                    2,847{" "}
                    <span className="text-sm font-semibold text-emerald-600">↑ 23%</span>
                  </p>
                </div>
                <span className="bg-indigo-50 text-indigo-600 rounded-lg p-2">
                  <BarChart3 className="w-5 h-5" />
                </span>
              </div>
              <div className="flex items-end gap-1.5 h-36">
                {CHART_BARS.map((h, i) => (
                  <div
                    key={i}
                    className="animate-grow-bar flex-1 rounded-t-md bg-gradient-to-t from-indigo-600 to-violet-400"
                    style={{ height: `${h * 0.9}%`, animationDelay: `${i * 60}ms` }}
                  />
                ))}
              </div>
              <div className="grid grid-cols-3 gap-3 mt-5 text-center">
                {[
                  { label: "Mobile", value: "91%" },
                  { label: "Busiest table", value: "Table 7" },
                  { label: "Avg. rating", value: "4.6 ★" },
                ].map((s) => (
                  <div key={s.label} className="bg-gray-50 rounded-xl py-2.5">
                    <p className="text-sm font-bold text-gray-900">{s.value}</p>
                    <p className="text-[11px] text-gray-400">{s.label}</p>
                  </div>
                ))}
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* How it works */}
      <section className="max-w-6xl mx-auto px-4 py-20">
        <Reveal>
          <h2 className="text-3xl font-bold text-center mb-12">Live in three steps</h2>
        </Reveal>
        <div className="grid md:grid-cols-3 gap-8 relative">
          <div className="hidden md:block absolute top-5 left-[16.6%] right-[16.6%] h-px bg-gradient-to-r from-indigo-200 via-violet-200 to-indigo-200" />
          {[
            {
              step: "1",
              title: "Pick what happens on scan",
              body: "Website, WhatsApp chat, UPI payment, PDF menu, feedback form — 11 types, one dashboard.",
            },
            {
              step: "2",
              title: "Print it anywhere",
              body: "Download print-quality PNG or vector SVG in your colors. Stickers, standees, packaging, billboards.",
            },
            {
              step: "3",
              title: "Track & change anytime",
              body: "Watch scans roll in live. Changed your menu? Update the link — every printed QR follows instantly.",
            },
          ].map((s, i) => (
            <Reveal key={s.step} delay={i * 120} className="relative">
              <div className="text-center px-4">
                <div className="w-10 h-10 mx-auto rounded-full bg-gradient-to-br from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold mb-4 shadow-lg shadow-indigo-200 relative z-10">
                  {s.step}
                </div>
                <h3 className="font-semibold text-lg">{s.title}</h3>
                <p className="text-gray-500 text-sm mt-2">{s.body}</p>
              </div>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Pricing */}
      <section id="pricing" className="bg-gray-50 border-y border-gray-100">
        <div className="max-w-6xl mx-auto px-4 py-20">
          <Reveal>
            <h2 className="text-3xl font-bold text-center">Simple, Indian pricing</h2>
            <p className="text-gray-500 text-center mt-3">
              Start free. Upgrade when the scans do. Annual plans save 2 months.
            </p>
          </Reveal>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-5 mt-12">
            {PLANS.map((p, i) => (
              <Reveal key={p.key} delay={i * 80}>
                <div
                  className={`relative bg-white rounded-2xl p-6 h-full flex flex-col transition-all duration-300 hover:-translate-y-1 ${
                    p.highlight
                      ? "border-2 border-indigo-500 shadow-xl shadow-indigo-100"
                      : "border border-gray-200 hover:shadow-lg hover:shadow-gray-100"
                  }`}
                >
                  {p.highlight && (
                    <span className="absolute -top-3 left-1/2 -translate-x-1/2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-xs font-semibold rounded-full px-3 py-1 shadow">
                      Most popular
                    </span>
                  )}
                  <h3 className="font-semibold">{p.name}</h3>
                  <p className="text-xs text-gray-400">{p.tagline}</p>
                  <p className="mt-4">
                    <span className="text-3xl font-extrabold">
                      {formatMoney(TIERS[p.key].prices[currency].monthly, currency)}
                    </span>
                    <span className="text-gray-400 text-sm"> {p.period}</span>
                  </p>
                  <ul className="mt-5 space-y-2.5 flex-1">
                    {p.features.map((f) => (
                      <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                        <Check className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" /> {f}
                      </li>
                    ))}
                  </ul>
                  <Link
                    href={p.contactSales ? "/contact" : planCtaHref(p.key, Boolean(user))}
                    className={`block text-center rounded-lg py-2.5 text-sm font-semibold mt-6 transition-colors ${
                      p.highlight
                        ? "bg-indigo-600 hover:bg-indigo-700 text-white shadow-md shadow-indigo-200"
                        : "border border-gray-300 hover:border-indigo-400 hover:text-indigo-700 text-gray-700"
                    }`}
                  >
                    {p.cta}
                  </Link>
                </div>
              </Reveal>
            ))}
          </div>
          <p className="text-center text-xs text-gray-400 mt-8">
            Early accounts get everything free during the pilot.
          </p>
        </div>
      </section>

      {/* FAQ */}
      <section id="faq" className="max-w-3xl mx-auto px-4 py-20">
        <Reveal>
          <h2 className="text-3xl font-bold text-center mb-10">
            Frequently asked questions
          </h2>
        </Reveal>
        <div className="space-y-3">
          {FAQS.map((f, i) => (
            <Reveal key={f.q} delay={i * 60}>
              <details className="group bg-white border border-gray-200 rounded-xl open:border-indigo-200 open:shadow-md open:shadow-gray-100 transition-all">
                <summary className="flex items-center justify-between gap-4 cursor-pointer list-none px-5 py-4 font-medium text-gray-800">
                  {f.q}
                  <ChevronDown className="w-4 h-4 text-gray-400 shrink-0 transition-transform duration-300 group-open:rotate-180" />
                </summary>
                <p className="px-5 pb-5 text-sm text-gray-500 leading-relaxed">{f.a}</p>
              </details>
            </Reveal>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="max-w-4xl mx-auto px-4 pb-24">
        <Reveal>
          <div className="rounded-3xl bg-gradient-to-br from-indigo-600 to-violet-600 p-12 text-center text-white shadow-2xl shadow-indigo-200 relative overflow-hidden">
            <div
              className="pointer-events-none absolute inset-0"
              style={{
                background:
                  "radial-gradient(400px 200px at 80% 0%, rgba(255,255,255,0.15), transparent 70%)",
              }}
            />
            <h2 className="text-3xl font-bold relative">
              Your next print run is your last print run.
            </h2>
            <p className="text-indigo-100 mt-3 relative">
              Create a dynamic QR in the next two minutes — free.
            </p>
            <Link
              href={appHref}
              className="relative inline-flex items-center gap-2 bg-white text-indigo-700 hover:bg-indigo-50 rounded-xl px-6 py-3 font-semibold mt-6 shadow-lg transition-transform hover:-translate-y-0.5"
            >
              Get started free <ArrowRight className="w-4 h-4" />
            </Link>
          </div>
        </Reveal>
      </section>

      {/* Footer */}
      <footer className="border-t border-gray-100 bg-gray-50">
        <div className="max-w-6xl mx-auto px-4 py-10">
          <div className="grid sm:grid-cols-3 gap-8 text-sm">
            <div>
              <span className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
                <QrCode className="w-4 h-4 text-indigo-500" /> QRVeda
              </span>
              <p className="text-gray-500 leading-6">
                Dynamic QR codes for your business — change the destination
                anytime, track every scan.
              </p>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">Product</p>
              <ul className="space-y-1.5 text-gray-500">
                <li><Link href="/docs/qr-types" className="hover:text-gray-900">QR code types</Link></li>
                <li><Link href="/docs/smart-redirects" className="hover:text-gray-900">Smart redirects</Link></li>
                <li><Link href="/docs/analytics" className="hover:text-gray-900">Scan analytics</Link></li>
                <li><Link href="/docs/restaurant-suite" className="hover:text-gray-900">Restaurant Suite</Link></li>
              </ul>
            </div>
            <div>
              <p className="font-semibold text-gray-900 mb-2">Resources</p>
              <ul className="space-y-1.5 text-gray-500">
                <li><Link href="/docs" className="hover:text-gray-900">Documentation</Link></li>
                <li><Link href="/docs/faq" className="hover:text-gray-900">FAQ</Link></li>
                <li><Link href="/blog" className="hover:text-gray-900">Blog</Link></li>
                <li><Link href="/blog/qr-codes-for-restaurants" className="hover:text-gray-900">QR codes for restaurants</Link></li>
              </ul>
            </div>
          </div>
          {/* Payment providers check that the policies are reachable from the
              site during review, not merely that the URLs resolve. */}
          <div className="mt-8 pt-6 border-t border-gray-200 flex flex-wrap items-center justify-between gap-3">
            <p className="text-xs text-gray-400">
              © {new Date().getFullYear()} QRVeda. All rights reserved.
            </p>
            <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-xs text-gray-500">
              <li><Link href="/terms" className="hover:text-gray-900">Terms</Link></li>
              <li><Link href="/privacy" className="hover:text-gray-900">Privacy</Link></li>
              <li><Link href="/refund" className="hover:text-gray-900">Refunds</Link></li>
              <li><Link href="/contact" className="hover:text-gray-900">Contact</Link></li>
            </ul>
          </div>
        </div>
      </footer>
    </div>
  );
}
