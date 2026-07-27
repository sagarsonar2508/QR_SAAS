import { NextResponse } from "next/server";
import { and, eq } from "drizzle-orm";
import { db, qrCodes } from "@/db";
import { getSessionUser } from "@/lib/auth";
import { qrContentFor, qrPng, qrSvg } from "@/lib/qr-image";

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const { id } = await params;
  const [qr] = await db
    .select()
    .from(qrCodes)
    .where(and(eq(qrCodes.id, id), eq(qrCodes.userId, user.id)))
    .limit(1);
  if (!qr) return NextResponse.json({ error: "Not found" }, { status: 404 });

  const url = new URL(req.url);
  const format = url.searchParams.get("format") === "svg" ? "svg" : "png";
  const size = Math.min(
    4096,
    Math.max(128, Number(url.searchParams.get("size")) || 1024)
  );
  const download = url.searchParams.get("download") === "1";

  const content = qrContentFor(qr);
  const opts = {
    size,
    fg: qr.fgColor,
    bg: qr.bgColor,
    ecLevel: qr.ecLevel,
    shape: qr.shape,
    logoUrl: qr.logoUrl,
    blendImageUrl: qr.blendImageUrl,
  };
  const filename = `${qr.name.replace(/[^\w-]+/g, "-").toLowerCase()}-${qr.code}`;

  const headers: Record<string, string> = download
    ? { "Content-Disposition": `attachment; filename="${filename}.${format}"` }
    : {};

  if (format === "svg") {
    const svg = await qrSvg(content, opts);
    return new NextResponse(svg, {
      headers: { "Content-Type": "image/svg+xml", ...headers },
    });
  }

  const png = await qrPng(content, opts);
  return new NextResponse(new Uint8Array(png), {
    headers: { "Content-Type": "image/png", ...headers },
  });
}
