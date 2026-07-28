import nodemailer, { type Transporter } from "nodemailer";
import { appUrl } from "@/lib/qr-image";

/**
 * Transactional email over SMTP.
 *
 * Configured with SMTP_* environment variables. When they're absent the app
 * still works: sends are skipped and the message is logged instead, so local
 * development and a half-configured deploy don't break signup. `mailConfigured()`
 * lets callers tell the user their email genuinely couldn't be sent rather than
 * claiming success.
 */

export function mailConfigured(): boolean {
  return Boolean(process.env.SMTP_HOST && process.env.SMTP_USER && process.env.SMTP_PASS);
}

let transporter: Transporter | null = null;

function getTransport(): Transporter {
  if (transporter) return transporter;

  const port = Number(process.env.SMTP_PORT ?? 587);
  transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port,
    // 465 is implicit TLS; 587 upgrades via STARTTLS.
    secure: process.env.SMTP_SECURE
      ? process.env.SMTP_SECURE === "true"
      : port === 465,
    auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
    // A stuck SMTP connection must never hold a request open indefinitely.
    connectionTimeout: 10_000,
    greetingTimeout: 10_000,
    socketTimeout: 15_000,
  });
  return transporter;
}

function fromAddress(): string {
  return process.env.SMTP_FROM ?? `QRVeda <${process.env.SMTP_USER ?? "no-reply@localhost"}>`;
}

type Mail = { to: string; subject: string; html: string; text: string };

/** Never throws — a failed send must not take down signup or password reset.
 *  Returns whether the message actually went out. */
export async function sendMail({ to, subject, html, text }: Mail): Promise<boolean> {
  if (!mailConfigured()) {
    console.warn(
      `[mail] SMTP not configured — would have sent "${subject}" to ${to}\n${text}`
    );
    return false;
  }

  try {
    await getTransport().sendMail({ from: fromAddress(), to, subject, html, text });
    return true;
  } catch (err) {
    console.error(`[mail] failed to send "${subject}" to ${to}:`, err);
    return false;
  }
}

// ------------------------------------------------------------------ templates

/** Plain, table-free layout — the most reliable thing across mail clients, and
 *  it keeps these messages out of the promotions tab. */
function layout(heading: string, body: string, cta?: { label: string; href: string }) {
  return `<!doctype html><html><body style="margin:0;padding:24px;background:#f9fafb;font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif">
<div style="max-width:480px;margin:0 auto;background:#fff;border:1px solid #e5e7eb;border-radius:16px;padding:32px">
<p style="margin:0 0 24px;font-weight:700;font-size:18px;color:#111827">QRVeda</p>
<h1 style="margin:0 0 12px;font-size:18px;color:#111827">${heading}</h1>
<div style="font-size:14px;line-height:22px;color:#4b5563">${body}</div>
${
  cta
    ? `<p style="margin:24px 0 0"><a href="${cta.href}" style="display:inline-block;background:#4f46e5;color:#fff;text-decoration:none;font-weight:600;font-size:14px;border-radius:10px;padding:12px 20px">${cta.label}</a></p>
<p style="margin:16px 0 0;font-size:12px;color:#9ca3af;word-break:break-all">Or paste this link into your browser:<br>${cta.href}</p>`
    : ""
}
</div>
<p style="max-width:480px;margin:16px auto 0;font-size:12px;color:#9ca3af;text-align:center">You received this because someone used this address at QRVeda.</p>
</body></html>`;
}

export function verificationEmail(name: string, token: string): Mail & { to: string } {
  const href = `${appUrl()}/verify?token=${token}`;
  return {
    to: "",
    subject: "Confirm your email — QRVeda",
    html: layout(
      `Welcome, ${name}`,
      `<p style="margin:0">Confirm this email address to finish setting up your QRVeda account. This link expires in 24 hours.</p>`,
      { label: "Confirm email", href }
    ),
    text: `Welcome, ${name}\n\nConfirm your email to finish setting up your QRVeda account:\n${href}\n\nThis link expires in 24 hours.`,
  };
}

export function passwordResetEmail(name: string, token: string): Mail & { to: string } {
  const href = `${appUrl()}/reset?token=${token}`;
  return {
    to: "",
    subject: "Reset your password — QRVeda",
    html: layout(
      `Reset your password`,
      `<p style="margin:0 0 12px">Hi ${name}, we received a request to reset your QRVeda password. This link expires in 1 hour and can be used once.</p>
<p style="margin:0">If you didn't ask for this, you can ignore this email — your password won't change.</p>`,
      { label: "Reset password", href }
    ),
    text: `Hi ${name},\n\nReset your QRVeda password:\n${href}\n\nThis link expires in 1 hour and can only be used once. If you didn't request it, ignore this email.`,
  };
}

export function passwordChangedEmail(name: string): Mail & { to: string } {
  return {
    to: "",
    subject: "Your password was changed — QRVeda",
    html: layout(
      "Your password was changed",
      `<p style="margin:0 0 12px">Hi ${name}, your QRVeda password was just changed and you've been signed out everywhere.</p>
<p style="margin:0">If this wasn't you, reset your password immediately and contact us.</p>`,
      { label: "Reset password", href: `${appUrl()}/forgot` }
    ),
    text: `Hi ${name},\n\nYour QRVeda password was just changed and you've been signed out on all devices.\n\nIf this wasn't you, reset it immediately: ${appUrl()}/forgot`,
  };
}
