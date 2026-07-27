import Link from "next/link";
import { QrCode } from "lucide-react";
import { getSessionUser } from "@/lib/auth";

/** Shared public-site header for docs/blog (matches the landing page). */
export async function SiteHeader() {
  const user = await getSessionUser();
  return (
    <header className="sticky top-0 z-30 bg-white/80 backdrop-blur border-b border-gray-100">
      <div className="max-w-6xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link href="/" className="flex items-center gap-2">
          <span className="bg-indigo-600 text-white rounded-lg p-1.5">
            <QrCode className="w-4 h-4" />
          </span>
          <span className="font-bold text-lg text-gray-900">QRVeda</span>
        </Link>
        <nav className="flex items-center gap-6 text-sm">
          <Link href="/docs" className="text-gray-600 hover:text-gray-900 hidden sm:block">
            Docs
          </Link>
          <Link href="/blog" className="text-gray-600 hover:text-gray-900 hidden sm:block">
            Blog
          </Link>
          <Link href="/#pricing" className="text-gray-600 hover:text-gray-900 hidden sm:block">
            Pricing
          </Link>
          {user ? (
            <Link
              href="/dashboard"
              className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 font-medium shadow-sm"
            >
              Dashboard
            </Link>
          ) : (
            <>
              <Link href="/login" className="text-gray-600 hover:text-gray-900">
                Log in
              </Link>
              <Link
                href="/signup"
                className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 font-medium shadow-sm"
              >
                Start free
              </Link>
            </>
          )}
        </nav>
      </div>
    </header>
  );
}

/** Shared public-site footer with SEO-relevant internal links. */
export function SiteFooter() {
  return (
    <footer className="border-t border-gray-100 bg-gray-50">
      <div className="max-w-6xl mx-auto px-4 py-10">
        <div className="grid sm:grid-cols-3 gap-8 text-sm">
          <div>
            <span className="flex items-center gap-2 font-semibold text-gray-900 mb-2">
              <QrCode className="w-4 h-4 text-indigo-500" /> QRVeda
            </span>
            <p className="text-gray-500 leading-6">
              Dynamic QR codes for your business — change the destination
              anytime, track every scan.
            </p>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-2">Product</p>
            <ul className="space-y-1.5 text-gray-500">
              <li><Link href="/docs/qr-types" className="hover:text-gray-900">QR code types</Link></li>
              <li><Link href="/docs/smart-redirects" className="hover:text-gray-900">Smart redirects</Link></li>
              <li><Link href="/docs/analytics" className="hover:text-gray-900">Scan analytics</Link></li>
              <li><Link href="/docs/restaurant-suite" className="hover:text-gray-900">Restaurant Suite</Link></li>
              <li><Link href="/#pricing" className="hover:text-gray-900">Pricing</Link></li>
            </ul>
          </div>
          <div>
            <p className="font-semibold text-gray-900 mb-2">Resources</p>
            <ul className="space-y-1.5 text-gray-500">
              <li><Link href="/docs" className="hover:text-gray-900">Documentation</Link></li>
              <li><Link href="/docs/getting-started" className="hover:text-gray-900">Getting started</Link></li>
              <li><Link href="/docs/faq" className="hover:text-gray-900">FAQ</Link></li>
              <li><Link href="/blog" className="hover:text-gray-900">Blog</Link></li>
              <li><Link href="/blog/qr-codes-for-restaurants" className="hover:text-gray-900">QR codes for restaurants</Link></li>
            </ul>
          </div>
        </div>
        <p className="text-xs text-gray-400 mt-8 pt-6 border-t border-gray-200">
          © {new Date().getFullYear()} QRVeda. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
