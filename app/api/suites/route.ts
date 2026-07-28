import { NextResponse } from "next/server";
import { db, qrCodes, suites } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { checkQrQuota } from "@/lib/billing";
import { newShortCode, RESERVED_CODES } from "@/lib/shortcode";
import { POLICIES, enforce } from "@/lib/rate-limit";

function code() {
  let c = newShortCode();
  while (RESERVED_CODES.has(c)) c = newShortCode();
  return c;
}

const isUrl = (v: unknown): v is string =>
  typeof v === "string" && /^(https?:\/\/|\/)/i.test(v);

// Creates a restaurant suite: N table QRs (or one menu QR), plus optional
// feedback and Google-review QRs, all grouped under one suite.
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  // One request here mints many QR codes, so it's capped harder than a single
  // create and gated on verification for the same anti-abuse reason.
  const limited = enforce(req, "suite-create", POLICIES.billing, user.id);
  if (limited) return limited;

  if (!user.emailVerifiedAt) {
    return NextResponse.json(
      {
        error: "Confirm your email address before creating QR codes.",
        needsVerification: true,
      },
      { status: 403 }
    );
  }

  const body = await req.json().catch(() => null);
  const name = String(body?.name ?? "").trim();
  if (!name) return NextResponse.json({ error: "Restaurant name is required" }, { status: 400 });

  const menuKind = body?.menu?.kind === "pdf" ? "pdf" : "url";
  const menuUrl = body?.menu?.url;
  if (!isUrl(menuUrl)) {
    return NextResponse.json(
      { error: "Upload a menu PDF or enter a menu URL" },
      { status: 400 }
    );
  }

  const tables = Math.min(50, Math.max(0, Math.trunc(Number(body?.tables) || 0)));
  const wantFeedback = Boolean(body?.feedback?.enabled);
  const googleReviewUrl = isUrl(body?.feedback?.googleReviewUrl)
    ? body.feedback.googleReviewUrl
    : isUrl(body?.review?.googleReviewUrl)
      ? body.review.googleReviewUrl
      : "";
  const wantReview = Boolean(body?.review?.enabled);
  if (wantReview && !googleReviewUrl) {
    return NextResponse.json(
      { error: "A Google review link is required for the review QR" },
      { status: 400 }
    );
  }

  const toCreate = (tables > 0 ? tables : 1) + (wantFeedback ? 1 : 0) + (wantReview ? 1 : 0);
  const quota = await checkQrQuota(user.id, user.plan, toCreate);
  if (!quota.ok) {
    return NextResponse.json(
      {
        error: `This suite needs ${toCreate} QR codes but your plan allows ${quota.limit} (${quota.used} used). Upgrade to continue.`,
        upgrade: true,
      },
      { status: 402 }
    );
  }

  const [suite] = await db
    .insert(suites)
    .values({
      userId: user.id,
      name,
      kind: "restaurant",
      settings: { menuKind, menuUrl, tables: String(tables), googleReviewUrl },
    })
    .returning();

  const menuType = menuKind === "pdf" ? "pdf" : "website";
  const menuPayload: Record<string, string> =
    menuKind === "pdf" ? { fileUrl: menuUrl } : { url: menuUrl };

  const rows: (typeof qrCodes.$inferInsert)[] = [];

  if (tables > 0) {
    for (let i = 1; i <= tables; i++) {
      rows.push({
        userId: user.id,
        suiteId: suite.id,
        role: "table",
        code: code(),
        name: `Table ${i}`,
        type: menuType,
        payload: menuPayload,
        destination: menuUrl,
      });
    }
  } else {
    rows.push({
      userId: user.id,
      suiteId: suite.id,
      role: "menu",
      code: code(),
      name: "Menu",
      type: menuType,
      payload: menuPayload,
      destination: menuUrl,
    });
  }

  if (wantFeedback) {
    const c = code();
    rows.push({
      userId: user.id,
      suiteId: suite.id,
      role: "feedback",
      code: c,
      name: "Feedback",
      type: "feedback",
      payload: {
        question: `How was your experience at ${name}?`,
        ...(googleReviewUrl ? { googleReviewUrl } : {}),
      },
      destination: `/f/${c}`,
    });
  }

  if (wantReview) {
    rows.push({
      userId: user.id,
      suiteId: suite.id,
      role: "review",
      code: code(),
      name: "Google Reviews",
      type: "website",
      payload: { url: googleReviewUrl },
      destination: googleReviewUrl,
    });
  }

  await db.insert(qrCodes).values(rows);

  return NextResponse.json({ id: suite.id, qrCount: rows.length });
}
