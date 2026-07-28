import { NextResponse } from "next/server";
import { db, qrCodes } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { checkQrQuota } from "@/lib/billing";
import { newShortCode, RESERVED_CODES } from "@/lib/shortcode";
import {
  QR_TYPES,
  buildDestination,
  validatePayload,
} from "@/lib/qr-types";
import { parseRedirectRules } from "@/lib/redirect-rules";
import { POLICIES, enforce } from "@/lib/rate-limit";

export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const limited = enforce(req, "qr-create", POLICIES.write, user.id);
  if (limited) return limited;

  // Unverified accounts can't publish redirects. This is the anti-abuse gate:
  // a link shortener that anyone can use anonymously becomes a phishing host,
  // and the reputation damage lands on our redirect domain.
  if (!user.emailVerifiedAt) {
    return NextResponse.json(
      {
        error: "Confirm your email address before creating QR codes.",
        needsVerification: true,
      },
      { status: 403 }
    );
  }

  const quota = await checkQrQuota(user.id, user.plan);
  if (!quota.ok) {
    return NextResponse.json(
      {
        error: `Your plan allows ${quota.limit} QR codes (${quota.used} used). Upgrade to create more.`,
        upgrade: true,
      },
      { status: 402 }
    );
  }

  const body = await req.json().catch(() => null);
  if (!body) return NextResponse.json({ error: "Invalid request" }, { status: 400 });

  const type = String(body.type ?? "");
  const def = QR_TYPES[type];
  if (!def) return NextResponse.json({ error: "Unknown QR type" }, { status: 400 });

  const name = String(body.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Name is required" }, { status: 400 });

  const payload: Record<string, string> = {};
  for (const field of def.fields) {
    const v = body.payload?.[field.key];
    if (typeof v === "string" && v.trim()) payload[field.key] = v.trim();
  }

  const validationError = validatePayload(type, payload);
  if (validationError) {
    return NextResponse.json({ error: validationError }, { status: 400 });
  }

  let code = newShortCode();
  while (RESERVED_CODES.has(code)) code = newShortCode();

  const isDynamic = !def.isStatic;
  // Feedback QRs point at our own hosted form, keyed by the short code.
  const destination = !isDynamic
    ? ""
    : type === "feedback"
      ? `/f/${code}`
      : (buildDestination(type, payload) ?? "");

  const hexColor = (v: unknown, fallback: string) =>
    typeof v === "string" && /^#[0-9a-fA-F]{6}$/.test(v) ? v : fallback;
  const shapes = ["square", "rounded", "dots", "classy", "classy-rounded", "extra-rounded"];
  const fileUrl = (v: unknown) =>
    typeof v === "string" && /^(\/files\/|https?:\/\/)/.test(v) ? v : null;
  const logoUrl = fileUrl(body.logoUrl);
  const blendImageUrl = fileUrl(body.blendImageUrl);

  // Smart redirects (device targeting + schedule) only apply to dynamic QRs.
  const parsedRules = isDynamic
    ? parseRedirectRules(body.redirectRules)
    : { rules: null };
  if (parsedRules.error) {
    return NextResponse.json({ error: parsedRules.error }, { status: 400 });
  }

  const [created] = await db
    .insert(qrCodes)
    .values({
      userId: user.id,
      code,
      name,
      type,
      payload,
      destination,
      isDynamic,
      fgColor: hexColor(body.fgColor, "#111827"),
      bgColor: hexColor(body.bgColor, "#FFFFFF"),
      ecLevel: ["L", "M", "Q", "H"].includes(body.ecLevel) ? body.ecLevel : "M",
      shape: shapes.includes(body.shape) ? body.shape : "square",
      logoUrl,
      blendImageUrl,
      redirectRules: parsedRules.rules,
    })
    .returning();

  return NextResponse.json({ id: created.id, code: created.code });
}
