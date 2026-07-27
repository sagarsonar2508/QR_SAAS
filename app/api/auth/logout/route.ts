import { NextResponse } from "next/server";
import { destroySession } from "@/lib/auth";
import { appUrl } from "@/lib/qr-image";

export async function POST() {
  await destroySession();
  // Not req.url — behind the reverse proxy that is http://localhost:3003, which
  // would send the browser to a port only the server can reach.
  return NextResponse.redirect(new URL("/", appUrl()));
}
