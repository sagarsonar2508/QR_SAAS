import { createHash } from "node:crypto";
import { UAParser } from "ua-parser-js";
import { db, scans } from "@/db";
import { countryFromHeaders } from "@/lib/billing/countries";

/** Best-effort scan logging — must never break the redirect path.
 *  Geo comes from the CDN header the app trusts for geolocation (see
 *  countryFromHeaders); null when no CDN sits in front. */
export async function logScan(qrId: string, req: Request) {
  try {
    const uaString = req.headers.get("user-agent") ?? "";
    const ua = UAParser(uaString);
    // CF-Connecting-IP is written by Cloudflare and cannot be forged through
    // the proxy. X-Forwarded-For is a fallback for deployments without a CDN,
    // but it is client-appendable — a visitor can prepend any address they like
    // and control the first entry, which would let them evade the per-IP
    // deduplication that unique-visitor counts rely on.
    const ip = (
      req.headers.get("cf-connecting-ip") ??
      (req.headers.get("x-forwarded-for") ?? "").split(",")[0]
    ).trim();
    const country = countryFromHeaders(req.headers);
    const city =
      req.headers.get("cf-ipcity") ?? req.headers.get("x-vercel-ip-city");
    const secret = process.env.SESSION_SECRET ?? "";
    await db.insert(scans).values({
      qrId,
      device: ua.device.type ?? "desktop",
      os: ua.os.name ?? null,
      browser: ua.browser.name ?? null,
      country: country ?? null,
      city: city ? decodeURIComponent(city) : null,
      referrer: req.headers.get("referer"),
      ipHash: ip
        ? createHash("sha256").update(ip + secret).digest("hex").slice(0, 32)
        : null,
    });
  } catch (err) {
    console.error("scan logging failed", err);
  }
}
