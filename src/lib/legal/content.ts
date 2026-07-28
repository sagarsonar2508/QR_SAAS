import type { Block } from "@/lib/marketing/blocks";
import { BUSINESS, entityDescription, show } from "./business";

export type LegalDoc = {
  slug: string;
  title: string;
  description: string;
  blocks: Block[];
};

const email = show(BUSINESS.supportEmail, "[support email to be added]");
const entity = entityDescription();
const jurisdiction = show(BUSINESS.jurisdiction, "[city]");
const address = show(BUSINESS.address, "[registered address to be added]");

const gstLine = BUSINESS.gstin
  ? `Prices shown in Indian Rupees are inclusive of GST. Our GSTIN is ${BUSINESS.gstin}.`
  : `We are not currently registered for GST, so no GST is charged or collected on Indian Rupee payments. Prices shown are the final amount payable. If this changes, we will update this page and notify existing subscribers before it takes effect.`;

// ----------------------------------------------------------------- terms

const terms: LegalDoc = {
  slug: "terms",
  title: "Terms of Service",
  description:
    "The terms governing your use of QRVeda's dynamic QR code platform, including plans, acceptable use and liability.",
  blocks: [
    { t: "p", text: `Last updated: ${BUSINESS.lastUpdated}` },
    {
      t: "p",
      text: `These Terms of Service ("Terms") govern your use of ${BUSINESS.name} (the "Service"), operated by ${entity}. By creating an account or using the Service, you agree to these Terms. If you do not agree, please do not use the Service.`,
    },

    { t: "h2", text: "1. The Service" },
    {
      t: "p",
      text: `${BUSINESS.name} lets you create QR codes, including **dynamic** QR codes whose destination can be changed after printing, and provides analytics about scans of those codes.`,
    },
    {
      t: "p",
      text: "Dynamic QR codes work by encoding a short link that we host and redirect. This means your codes depend on the Service remaining available. We aim to keep redirects running continuously, but we do not guarantee uninterrupted availability.",
    },

    { t: "h2", text: "2. Your account" },
    {
      t: "ul",
      items: [
        "You must provide accurate information when registering and keep it up to date.",
        "You are responsible for keeping your password secure and for all activity under your account.",
        "You must be at least 18 years old, or the age of majority where you live, to use the Service.",
        "One person or organisation per account. Do not share credentials with people outside your business.",
      ],
    },

    { t: "h2", text: "3. Plans, billing and limits" },
    {
      t: "p",
      text: "The Service offers a free plan and paid subscription plans. Each plan includes a limit on the number of QR codes you may hold at one time; the current limits and prices are shown on our pricing page.",
    },
    {
      t: "ul",
      items: [
        "Paid plans are billed in advance, monthly or annually, and renew automatically until cancelled.",
        "You can cancel at any time. Cancellation stops future renewals; your plan remains active until the end of the period you have already paid for.",
        "Payments are processed by third-party payment providers. We do not store your card details.",
        "We may change prices with at least 30 days' notice to existing subscribers. Price changes never apply to a period you have already paid for.",
      ],
    },
    { t: "p", text: gstLine },
    {
      t: "p",
      text: "Refunds are governed by our [Cancellation and Refund Policy](/refund).",
    },

    { t: "h2", text: "4. What happens if you downgrade or stop paying" },
    {
      t: "p",
      text: "If your subscription ends and you return to the free plan, your account, QR codes and analytics history are retained. Where you hold more QR codes than the free plan allows, you may not be able to create new ones until you are back within the limit, but existing codes are not deleted by us as an automatic consequence of downgrading.",
    },
    {
      t: "warn",
      text: "Because printed QR codes depend on our redirect service, keep this in mind before distributing large print runs on a free or trial basis.",
    },

    { t: "h2", text: "5. Acceptable use" },
    { t: "p", text: "You must not use the Service to:" },
    {
      t: "ul",
      items: [
        "Distribute malware, phishing pages, or links intended to deceive people about where they are going.",
        "Host or link to content that is illegal where you or your scanners are located.",
        "Impersonate another person, business or brand.",
        "Send bulk unsolicited messages, or drive traffic to content that does so.",
        "Circumvent plan limits, probe our infrastructure, or interfere with other customers' use of the Service.",
        "Resell or white-label the Service without our written agreement.",
      ],
    },
    {
      t: "p",
      text: "We may suspend or terminate accounts that breach this section. Where a QR code is reported as malicious, we may disable that individual redirect without notice, because the alternative is allowing harm to continue while we investigate.",
    },

    { t: "h2", text: "6. Your content" },
    {
      t: "p",
      text: "You retain ownership of everything you upload or link to — destination URLs, logos, menus, images and other files. You grant us only the permission needed to operate the Service: to store your content, serve it to people who scan your codes, and create backups.",
    },
    {
      t: "p",
      text: "You are responsible for having the rights to the content you upload, including any logos or images you place inside a QR code.",
    },

    { t: "h2", text: "7. Availability and support" },
    {
      t: "p",
      text: "We do not offer a contractual uptime guarantee. We work to keep the redirect service highly available because printed codes depend on it, but the Service is provided on a commercially reasonable-efforts basis.",
    },
    {
      t: "p",
      text: `Support is provided by email at ${email}. Paid plans receive priority.`,
    },

    { t: "h2", text: "8. Third-party services" },
    {
      t: "p",
      text: "The Service relies on third parties including payment providers, hosting and content delivery networks. Their handling of data is described in our [Privacy Policy](/privacy). We are not responsible for the content of any destination you point a QR code to.",
    },

    { t: "h2", text: "9. Liability" },
    {
      t: "p",
      text: "To the maximum extent permitted by law, the Service is provided \"as is\" without warranties of any kind. We are not liable for indirect or consequential losses, including lost profits, lost business, or the cost of reprinting materials.",
    },
    {
      t: "p",
      text: "Where liability cannot be excluded, our total liability to you for any claim is limited to the amount you paid us in the twelve months before the claim arose.",
    },

    { t: "h2", text: "10. Termination" },
    {
      t: "p",
      text: "You may stop using the Service and delete your account at any time. We may suspend or terminate your account if you materially breach these Terms, or if we are required to by law. Where practical we will give notice first.",
    },

    { t: "h2", text: "11. Changes to these Terms" },
    {
      t: "p",
      text: "We may update these Terms from time to time. If a change materially affects your rights, we will notify account holders by email or in the app before it takes effect. Continuing to use the Service after that means you accept the updated Terms.",
    },

    { t: "h2", text: "12. Governing law" },
    {
      t: "p",
      text: `These Terms are governed by the laws of ${BUSINESS.country}. Any dispute will be subject to the exclusive jurisdiction of the courts at ${jurisdiction}, ${BUSINESS.country}.`,
    },

    { t: "h2", text: "13. Contact" },
    {
      t: "p",
      text: `Questions about these Terms: ${email}. Postal address: ${address}.`,
    },
  ],
};

// --------------------------------------------------------------- privacy

const privacy: LegalDoc = {
  slug: "privacy",
  title: "Privacy Policy",
  description:
    "What data QRVeda collects, why, how long it is kept, and the choices you have over it.",
  blocks: [
    { t: "p", text: `Last updated: ${BUSINESS.lastUpdated}` },
    {
      t: "p",
      text: `This policy explains what ${entity} collects when you use ${BUSINESS.name}, why, and what control you have. We collect as little as we can while still running the Service.`,
    },

    { t: "h2", text: "1. Information you give us" },
    {
      t: "table",
      headers: ["Data", "Why we need it"],
      rows: [
        ["Name and email address", "To create your account, sign you in, and contact you about your subscription"],
        ["Password", "Stored only as a one-way hash — we cannot read it"],
        ["Google account ID (if you use Google sign-in)", "To link your Google login to your account"],
        ["QR code content and destinations", "To generate your codes and perform redirects"],
        ["Uploaded files (menus, logos, images)", "To serve them to people who scan your codes"],
      ],
    },

    { t: "h2", text: "2. Information collected when a QR code is scanned" },
    {
      t: "p",
      text: "When someone scans one of your QR codes, we record data about the scan so we can show you analytics. This is about the **scan**, not about identifying the individual.",
    },
    {
      t: "table",
      headers: ["Data", "Notes"],
      rows: [
        ["Time of scan", "—"],
        ["Device type, operating system, browser", "Derived from the browser's user-agent string"],
        ["Country and city", "Approximate, derived from network location by our content delivery network"],
        ["Referring website", "Where the scan came from, when the browser provides it"],
        ["A one-way hash of the IP address", "Used to recognise repeat scans. We do not store the IP address itself and the hash cannot be reversed to recover it."],
      ],
    },
    {
      t: "tip",
      text: "We do not use advertising cookies, cross-site trackers, or third-party analytics scripts on scanned pages.",
    },

    { t: "h2", text: "3. Feedback responses" },
    {
      t: "p",
      text: "Where a business uses our feedback QR codes, star ratings and any comments left by their customers are stored and shown to that business. Responses are not published publicly by us. Every respondent is shown the same follow-up options regardless of the rating they give.",
    },

    { t: "h2", text: "4. Payment information" },
    {
      t: "p",
      text: "Payments are handled by third-party payment providers. Card numbers and banking details are entered on their systems and are **never** sent to or stored by us. We retain only a subscription identifier, plan, currency, status and renewal date.",
    },

    { t: "h2", text: "5. Cookies" },
    {
      t: "ul",
      items: [
        "**Session cookie** — keeps you signed in. Essential; the Service cannot work without it.",
        "**Currency preference** — remembers a currency you have chosen to see prices in.",
        "**OAuth state** — a short-lived security cookie used only during Google sign-in.",
      ],
    },
    { t: "p", text: "We do not set advertising or cross-site tracking cookies." },

    { t: "h2", text: "6. Who we share data with" },
    {
      t: "p",
      text: "We do not sell your data. We share it only with service providers that make the Service work:",
    },
    {
      t: "ul",
      items: [
        "**Payment providers** — to process subscriptions and issue invoices.",
        "**Hosting and content delivery providers** — to serve the Service and protect it from attack.",
        "**Email delivery** — where used to send account and billing notifications.",
        "**Legal authorities** — where we are required by law to disclose information.",
      ],
    },

    { t: "h2", text: "7. Where data is stored" },
    {
      t: "p",
      text: `Our servers are located in ${BUSINESS.country}. Some providers we rely on, such as payment and content delivery networks, operate globally, so limited data may be processed outside ${BUSINESS.country} in the course of providing the Service.`,
    },

    { t: "h2", text: "8. How long we keep data" },
    {
      t: "ul",
      items: [
        "Account data — for as long as your account exists.",
        "QR codes and scan analytics — for as long as the QR code exists in your account.",
        "Billing records — retained as long as required for tax and accounting purposes.",
        "On account deletion — your account, QR codes, uploads and scan history are deleted. Deleting a QR code stops its redirect immediately, and anyone scanning it afterwards will not reach your destination.",
      ],
    },

    { t: "h2", text: "9. Your rights" },
    {
      t: "p",
      text: `You can access and correct most of your information directly in the app. To request a copy of your data, correction, or deletion of your account, email ${email} and we will respond within a reasonable period.`,
    },

    { t: "h2", text: "10. Security" },
    {
      t: "p",
      text: "Passwords are hashed, traffic is encrypted in transit with TLS, and sessions expire. No system is perfectly secure, but we take reasonable measures appropriate to the size of the Service and will notify affected users of any breach that materially affects them.",
    },

    { t: "h2", text: "11. Children" },
    {
      t: "p",
      text: "The Service is not directed at children and we do not knowingly collect data from anyone under 18. If you believe a child has provided us data, contact us and we will delete it.",
    },

    { t: "h2", text: "12. Changes and contact" },
    {
      t: "p",
      text: `We may update this policy; the "last updated" date above will change and material changes will be notified to account holders. Questions or requests: ${email}, or write to ${address}.`,
    },
  ],
};

// ---------------------------------------------------------------- refund

const refund: LegalDoc = {
  slug: "refund",
  title: "Cancellation and Refund Policy",
  description:
    "How to cancel a QRVeda subscription, what happens to your QR codes, and our position on refunds.",
  blocks: [
    { t: "p", text: `Last updated: ${BUSINESS.lastUpdated}` },

    { t: "h2", text: "Cancelling your subscription" },
    {
      t: "p",
      text: "You can cancel at any time from the **Billing** page in your account. No notice period and no cancellation fee.",
    },
    {
      t: "ul",
      items: [
        "Cancellation stops future renewals immediately — you will not be charged again.",
        "Your plan stays active until the end of the period you have already paid for.",
        "At the end of that period your account moves to the free plan.",
        "Your QR codes, destinations and scan history are retained. Existing dynamic QR codes continue to redirect, subject to the free plan's limits.",
      ],
    },

    { t: "h2", text: "Refunds" },
    {
      t: "p",
      text: "**Payments are non-refundable.** Because cancelling stops all future billing and you keep access for the full period you have paid for, we do not issue refunds for the current or past billing periods, including partially used periods.",
    },
    {
      t: "tip",
      text: "The free plan exists so you can try the Service properly before paying. We recommend using it to confirm QRVeda fits your needs.",
    },

    { t: "h2", text: "Exceptions" },
    {
      t: "p",
      text: "We will review a refund request in good faith where:",
    },
    {
      t: "ul",
      items: [
        "You were charged in error, for example billed twice for the same period.",
        "A subscription renewed after you had already cancelled it.",
        "A prolonged failure on our side made the Service unusable for a significant part of a billing period.",
        "Applicable consumer law in your country gives you a right to a refund that overrides this policy.",
      ],
    },
    {
      t: "p",
      text: `To raise any of these, email ${email} from the address on your account with your subscription details. We aim to respond within 3 business days.`,
    },

    { t: "h2", text: "How approved refunds are paid" },
    {
      t: "p",
      text: "Where a refund is approved, it is returned to the original payment method through the payment provider that processed it. Providers typically take 5–10 business days to return funds to your bank or card, which is outside our control.",
    },

    { t: "h2", text: "Failed payments" },
    {
      t: "p",
      text: "If a renewal payment fails, the payment provider may retry it. If it continues to fail, your subscription ends and your account moves to the free plan. We do not pursue unpaid amounts.",
    },

    { t: "h2", text: "Contact" },
    {
      t: "p",
      text: `Any question about cancellation or billing: ${email}. Postal address: ${address}.`,
    },
  ],
};

// --------------------------------------------------------------- contact

const contact: LegalDoc = {
  slug: "contact",
  title: "Contact Us",
  description:
    "How to reach the QRVeda team for support, billing questions, or abuse reports.",
  blocks: [
    {
      t: "p",
      text: `We are a small team, so email reaches us fastest and gets a real reply.`,
    },

    { t: "h2", text: "Support" },
    {
      t: "p",
      text: `**${email}** — account help, billing questions, anything not working as expected. Paid plans get priority. Please include the email address on your account and, where relevant, the QR code's short link.`,
    },

    { t: "h2", text: "Reporting abuse" },
    {
      t: "p",
      text: `If a QRVeda short link points to a phishing page, malware, or other harmful content, email ${email} with the full short link. We treat these reports seriously and can disable an individual redirect quickly while we investigate.`,
    },

    { t: "h2", text: "Business details" },
    {
      t: "table",
      headers: ["", ""],
      rows: [
        ["Service", BUSINESS.name],
        ["Operated by", show(BUSINESS.legalName)],
        ["Address", address],
        ["Email", email],
        ...(BUSINESS.phone ? [["Phone", BUSINESS.phone]] : []),
        ...(BUSINESS.gstin ? [["GSTIN", BUSINESS.gstin]] : []),
      ],
    },

    { t: "h2", text: "Before you write in" },
    {
      t: "p",
      text: "Many questions are already answered in our [documentation](/docs) and [FAQ](/docs/faq) — including how dynamic QR codes work, what happens when you cancel, and whether printed codes ever expire.",
    },
  ],
};

export const LEGAL_DOCS: LegalDoc[] = [terms, privacy, refund, contact];

export function legalDoc(slug: string): LegalDoc | undefined {
  return LEGAL_DOCS.find((d) => d.slug === slug);
}
