import { NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { UAParser } from "ua-parser-js";
import { db, qrCodes } from "@/db";
import { logScan } from "@/lib/scan-logger";
import { resolveDestination, type DeviceKey } from "@/lib/redirect-rules";

/** Minimal standalone page for terminal states on the redirect hot path. */
function statusPage(
  status: number,
  title: string,
  heading: string,
  body: string
) {
  return new NextResponse(
    `<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><meta name="robots" content="noindex"><title>${title}</title></head>
<body style="font-family:system-ui,-apple-system,'Segoe UI',Roboto,sans-serif;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb">
<div style="text-align:center;padding:2rem"><h1 style="font-size:1.25rem;color:#111827;margin:0 0 .5rem">${heading}</h1>
<p style="color:#6b7280;margin:0 0 1.5rem">${body}</p>
<a href="/" style="color:#4f46e5;text-decoration:none;font-weight:500">Go to QRVeda &rarr;</a></div></body></html>`,
    { status, headers: { "Content-Type": "text/html; charset=utf-8" } }
  );
}

/** Ordered device-rule candidates for a scanner, most specific first. */
function deviceCandidates(uaString: string): DeviceKey[] {
  const ua = UAParser(uaString);
  const os = (ua.os.name ?? "").toLowerCase();
  const isIos = os === "ios" || os === "ipados";
  const isAndroid = os === "android";
  if (ua.device.type === "tablet") {
    return isIos ? ["tablet", "ios"] : isAndroid ? ["tablet", "android"] : ["tablet"];
  }
  if (ua.device.type === "mobile" || isIos || isAndroid) {
    return isIos ? ["ios"] : isAndroid ? ["android"] : [];
  }
  return ["desktop"];
}

// The dynamic-redirect hot path: /<shortCode> → 302 to current destination.
// Scan logging happens with after() so it never delays the redirect.
export async function GET(
  req: Request,
  { params }: { params: Promise<{ code: string }> }
) {
  const { code } = await params;
  // This route is the root catch-all, so anything that isn't a short code is
  // just a bad URL — answer 404 rather than bouncing the visitor to the home page.
  if (!/^[2-9A-Za-z]{6,10}$/.test(code)) {
    return statusPage(
      404,
      "Page not found",
      "404 — Page not found",
      "The page you are looking for doesn't exist."
    );
  }

  const [qr] = await db
    .select({
      id: qrCodes.id,
      destination: qrCodes.destination,
      active: qrCodes.active,
      isDynamic: qrCodes.isDynamic,
      redirectRules: qrCodes.redirectRules,
    })
    .from(qrCodes)
    .where(eq(qrCodes.code, code))
    .limit(1);

  if (!qr || !qr.isDynamic || !qr.destination) {
    return statusPage(
      404,
      "QR code not found",
      "This QR code doesn't exist",
      "The code may have been deleted, or the link was mistyped."
    );
  }

  if (!qr.active) {
    return statusPage(
      410,
      "QR paused",
      "This QR code is paused",
      "The owner has temporarily disabled this link."
    );
  }

  after(() => logScan(qr.id, req));

  const resolved = resolveDestination(qr.redirectRules, qr.destination, {
    deviceCandidates: deviceCandidates(req.headers.get("user-agent") ?? ""),
  });

  const dest = resolved.startsWith("/")
    ? new URL(resolved, req.url).toString()
    : resolved;

  return NextResponse.redirect(dest, 302);
}
