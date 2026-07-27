import { NextResponse, after } from "next/server";
import { eq } from "drizzle-orm";
import { UAParser } from "ua-parser-js";
import { db, qrCodes } from "@/db";
import { logScan } from "@/lib/scan-logger";
import { resolveDestination, type DeviceKey } from "@/lib/redirect-rules";

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
  if (!/^[2-9A-Za-z]{6,10}$/.test(code)) {
    return NextResponse.redirect(new URL("/", req.url));
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
    return NextResponse.redirect(new URL("/?qr=not-found", req.url));
  }

  if (!qr.active) {
    return new NextResponse(
      `<!doctype html><html><head><meta name="viewport" content="width=device-width, initial-scale=1"><title>QR paused</title></head>
<body style="font-family:system-ui;display:flex;align-items:center;justify-content:center;min-height:100vh;margin:0;background:#f9fafb">
<div style="text-align:center;padding:2rem"><h1 style="font-size:1.25rem;color:#111827">This QR code is paused</h1>
<p style="color:#6b7280">The owner has temporarily disabled this link.</p></div></body></html>`,
      { status: 410, headers: { "Content-Type": "text/html" } }
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
