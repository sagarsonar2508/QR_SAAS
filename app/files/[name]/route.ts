import { NextResponse } from "next/server";
import { readFile } from "node:fs/promises";
import path from "node:path";

const UPLOAD_DIR = path.join(process.cwd(), "uploads");

const TYPES: Record<string, string> = {
  ".pdf": "application/pdf",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".webp": "image/webp",
  ".gif": "image/gif",
};

export async function GET(
  _req: Request,
  { params }: { params: Promise<{ name: string }> }
) {
  const { name } = await params;
  // Uploaded names are nanoid + known extension; reject anything else.
  if (!/^[\w-]+\.(pdf|png|jpg|webp|gif)$/.test(name)) {
    return new NextResponse("Not found", { status: 404 });
  }
  try {
    const data = await readFile(path.join(UPLOAD_DIR, name));
    const type = TYPES[path.extname(name)] ?? "application/octet-stream";
    return new NextResponse(new Uint8Array(data), {
      headers: {
        "Content-Type": type,
        "Cache-Control": "public, max-age=3600",
        "Content-Disposition": "inline",
      },
    });
  } catch {
    return new NextResponse("Not found", { status: 404 });
  }
}
