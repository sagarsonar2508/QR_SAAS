import { readFile } from "node:fs/promises";
import path from "node:path";
import sharp from "sharp";
import type { QrCode } from "@/db";
import { buildStaticContent } from "./qr-types";
import { renderHalftoneQrSvg, renderQrSvg } from "./qr-render";

export function appUrl() {
  return process.env.APP_URL ?? "http://localhost:3003";
}

/** The string actually encoded in the QR image. Dynamic QRs encode the
 *  short redirect URL; static types (wifi/vcard) encode their content. */
export function qrContentFor(qr: QrCode): string {
  if (qr.isDynamic) return `${appUrl()}/${qr.code}`;
  return buildStaticContent(qr.type, qr.payload) ?? "";
}

const MIME: Record<string, string> = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

/** SVG <image> hrefs must be data: URLs — neither sharp nor <img>-embedded
 *  SVGs load external resources. Local uploads are read from disk. */
async function logoToDataUrl(logoUrl: string | null | undefined): Promise<string | null> {
  if (!logoUrl) return null;
  try {
    if (logoUrl.startsWith("/files/")) {
      const name = logoUrl.slice("/files/".length);
      if (!/^[\w-]+\.(png|jpg|webp|gif)$/.test(name)) return null;
      const buf = await readFile(path.join(process.cwd(), "uploads", name));
      return `data:${MIME[path.extname(name)]};base64,${buf.toString("base64")}`;
    }
    if (/^https?:\/\//.test(logoUrl)) {
      const res = await fetch(logoUrl, { signal: AbortSignal.timeout(5000) });
      if (!res.ok) return null;
      const type = res.headers.get("content-type") ?? "";
      if (!type.startsWith("image/")) return null;
      const buf = Buffer.from(await res.arrayBuffer());
      if (buf.length > 2 * 1024 * 1024) return null;
      return `data:${type};base64,${buf.toString("base64")}`;
    }
  } catch {
    // Fall through — a broken logo must never break QR generation.
  }
  return null;
}

type RenderOpts = {
  size?: number;
  fg?: string;
  bg?: string;
  ecLevel?: string;
  shape?: string;
  logoUrl?: string | null;
  blendImageUrl?: string | null;
};

export async function qrSvg(content: string, opts: RenderOpts = {}): Promise<string> {
  const logoDataUrl = await logoToDataUrl(opts.logoUrl);
  const imageDataUrl = await logoToDataUrl(opts.blendImageUrl);
  if (imageDataUrl) {
    return renderHalftoneQrSvg(content, {
      imageDataUrl,
      fg: opts.fg,
      bg: opts.bg,
      logoDataUrl,
      size: opts.size ?? 1024,
    });
  }
  return renderQrSvg(content, { ...opts, logoDataUrl, size: opts.size ?? 1024 });
}

export async function qrPng(content: string, opts: RenderOpts = {}): Promise<Buffer> {
  const svg = await qrSvg(content, opts);
  return sharp(Buffer.from(svg)).png().toBuffer();
}
