// Shared between server and client — keep this file free of server-only imports.

export type FieldDef = {
  key: string;
  label: string;
  input: "text" | "url" | "tel" | "email" | "textarea" | "select" | "file";
  required?: boolean;
  placeholder?: string;
  options?: { value: string; label: string }[];
  accept?: string;
  hint?: string;
};

export type QrTypeDef = {
  label: string;
  description: string;
  /** Static types encode their payload directly into the QR image —
   *  no redirect, no scan analytics, cannot be edited after printing. */
  isStatic?: boolean;
  fields: FieldDef[];
};

export const QR_TYPES: Record<string, QrTypeDef> = {
  website: {
    label: "Website",
    description: "Open any web page or link",
    fields: [
      {
        key: "url",
        label: "Website URL",
        input: "url",
        required: true,
        placeholder: "https://example.com",
      },
    ],
  },
  whatsapp: {
    label: "WhatsApp",
    description: "Start a WhatsApp chat with a prefilled message",
    fields: [
      {
        key: "phone",
        label: "WhatsApp number (with country code)",
        input: "tel",
        required: true,
        placeholder: "+91 98765 43210",
      },
      {
        key: "message",
        label: "Prefilled message (optional)",
        input: "textarea",
        placeholder: "Hi! I saw your QR code…",
      },
    ],
  },
  phone: {
    label: "Phone Call",
    description: "Dial a phone number on scan",
    fields: [
      {
        key: "phone",
        label: "Phone number",
        input: "tel",
        required: true,
        placeholder: "+91 98765 43210",
      },
    ],
  },
  email: {
    label: "Email",
    description: "Compose an email to your address",
    fields: [
      {
        key: "email",
        label: "Email address",
        input: "email",
        required: true,
        placeholder: "hello@business.com",
      },
      { key: "subject", label: "Subject (optional)", input: "text" },
      { key: "body", label: "Message (optional)", input: "textarea" },
    ],
  },
  sms: {
    label: "SMS",
    description: "Send a text message to your number",
    fields: [
      {
        key: "phone",
        label: "Phone number",
        input: "tel",
        required: true,
        placeholder: "+91 98765 43210",
      },
      { key: "message", label: "Prefilled message (optional)", input: "textarea" },
    ],
  },
  upi: {
    label: "UPI Payment",
    description: "Accept payments to your UPI ID",
    fields: [
      {
        key: "pa",
        label: "UPI ID (VPA)",
        input: "text",
        required: true,
        placeholder: "business@okhdfcbank",
      },
      {
        key: "pn",
        label: "Payee name",
        input: "text",
        required: true,
        placeholder: "My Business",
      },
      {
        key: "am",
        label: "Amount in ₹ (optional — leave empty to let customer enter)",
        input: "text",
        placeholder: "199",
      },
      { key: "tn", label: "Note (optional)", input: "text", placeholder: "Table 4" },
    ],
  },
  pdf: {
    label: "PDF / Menu",
    description: "Upload a PDF — perfect for menus and brochures",
    fields: [
      {
        key: "fileUrl",
        label: "PDF file",
        input: "file",
        required: true,
        accept: "application/pdf",
      },
    ],
  },
  image: {
    label: "Image",
    description: "Upload an image or poster",
    fields: [
      {
        key: "fileUrl",
        label: "Image file",
        input: "file",
        required: true,
        accept: "image/png,image/jpeg,image/webp,image/gif",
      },
    ],
  },
  feedback: {
    label: "Feedback",
    description: "Collect private ratings, then nudge happy customers to Google",
    fields: [
      {
        key: "question",
        label: "Question shown to customers (optional)",
        input: "text",
        placeholder: "How was your experience?",
      },
      {
        key: "googleReviewUrl",
        label: "Google review link (optional)",
        input: "url",
        placeholder: "https://g.page/r/…/review",
        hint: "Shown to every customer after they submit feedback — policy-safe.",
      },
    ],
  },
  wifi: {
    label: "WiFi",
    description: "Connect to your WiFi without typing the password",
    isStatic: true,
    fields: [
      { key: "ssid", label: "Network name (SSID)", input: "text", required: true },
      { key: "password", label: "Password", input: "text" },
      {
        key: "encryption",
        label: "Security",
        input: "select",
        required: true,
        options: [
          { value: "WPA", label: "WPA / WPA2 / WPA3" },
          { value: "WEP", label: "WEP" },
          { value: "nopass", label: "Open (no password)" },
        ],
      },
    ],
  },
  vcard: {
    label: "Contact Card",
    description: "Save your contact details in one tap",
    isStatic: true,
    fields: [
      { key: "firstName", label: "First name", input: "text", required: true },
      { key: "lastName", label: "Last name", input: "text" },
      { key: "phone", label: "Phone", input: "tel" },
      { key: "email", label: "Email", input: "email" },
      { key: "org", label: "Company", input: "text" },
      { key: "title", label: "Job title", input: "text" },
      { key: "website", label: "Website", input: "url" },
    ],
  },
};

export type QrTypeKey = keyof typeof QR_TYPES;

const cleanPhone = (raw: string) => raw.replace(/[^\d+]/g, "");

/** Destination URL a dynamic QR redirects to. Returns null for static types. */
export function buildDestination(
  type: string,
  payload: Record<string, string>
): string | null {
  switch (type) {
    case "website":
      return payload.url;
    case "whatsapp": {
      const digits = cleanPhone(payload.phone).replace(/^\+/, "");
      const text = payload.message
        ? `?text=${encodeURIComponent(payload.message)}`
        : "";
      return `https://wa.me/${digits}${text}`;
    }
    case "phone":
      return `tel:${cleanPhone(payload.phone)}`;
    case "email": {
      const params = new URLSearchParams();
      if (payload.subject) params.set("subject", payload.subject);
      if (payload.body) params.set("body", payload.body);
      const qs = params.toString();
      return `mailto:${payload.email}${qs ? `?${qs}` : ""}`;
    }
    case "sms": {
      const body = payload.message
        ? `?body=${encodeURIComponent(payload.message)}`
        : "";
      return `sms:${cleanPhone(payload.phone)}${body}`;
    }
    case "upi": {
      const params = new URLSearchParams({ pa: payload.pa, pn: payload.pn, cu: "INR" });
      if (payload.am) params.set("am", payload.am);
      if (payload.tn) params.set("tn", payload.tn);
      return `upi://pay?${params.toString()}`;
    }
    case "pdf":
    case "image":
      return payload.fileUrl;
    default:
      return null;
  }
}

const escapeWifi = (s: string) => s.replace(/([\\;,:"])/g, "\\$1");
const escapeVcard = (s: string) => s.replace(/([\\,;])/g, "\\$1");

/** Raw content encoded into the QR image for static types. */
export function buildStaticContent(
  type: string,
  payload: Record<string, string>
): string | null {
  switch (type) {
    case "wifi": {
      const enc = payload.encryption === "nopass" ? "nopass" : payload.encryption;
      const pass =
        enc === "nopass" ? "" : `P:${escapeWifi(payload.password ?? "")};`;
      return `WIFI:T:${enc};S:${escapeWifi(payload.ssid)};${pass};`;
    }
    case "vcard": {
      const lines = [
        "BEGIN:VCARD",
        "VERSION:3.0",
        `N:${escapeVcard(payload.lastName ?? "")};${escapeVcard(payload.firstName)};;;`,
        `FN:${escapeVcard([payload.firstName, payload.lastName].filter(Boolean).join(" "))}`,
      ];
      if (payload.org) lines.push(`ORG:${escapeVcard(payload.org)}`);
      if (payload.title) lines.push(`TITLE:${escapeVcard(payload.title)}`);
      if (payload.phone) lines.push(`TEL;TYPE=CELL:${payload.phone}`);
      if (payload.email) lines.push(`EMAIL:${payload.email}`);
      if (payload.website) lines.push(`URL:${payload.website}`);
      lines.push("END:VCARD");
      return lines.join("\n");
    }
    default:
      return null;
  }
}

/** Validate payload for a type. Returns an error message or null if valid. */
export function validatePayload(
  type: string,
  payload: Record<string, string>
): string | null {
  const def = QR_TYPES[type];
  if (!def) return "Unknown QR type";
  for (const field of def.fields) {
    const value = (payload[field.key] ?? "").trim();
    if (field.required && !value) return `${field.label} is required`;
    if (value && (field.input === "url" || field.key === "fileUrl")) {
      if (!/^(https?:\/\/|\/)/i.test(value)) {
        return `${field.label} must be a valid URL`;
      }
    }
    if (value && field.input === "email" && !/^\S+@\S+\.\S+$/.test(value)) {
      return `${field.label} must be a valid email`;
    }
  }
  if (type === "upi" && payload.am && !/^\d+(\.\d{1,2})?$/.test(payload.am)) {
    return "Amount must be a number";
  }
  return null;
}
