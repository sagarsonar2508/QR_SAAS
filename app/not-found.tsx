import type { Metadata } from "next";
import Link from "next/link";
import { QrCode } from "lucide-react";

export const metadata: Metadata = {
  title: "Page not found",
  robots: { index: false, follow: false },
};

// Rendered for notFound() calls and any route the app doesn't match.
export default function NotFound() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="text-center max-w-md">
        <span className="inline-flex bg-indigo-600 text-white rounded-xl p-2.5 mb-6">
          <QrCode className="w-6 h-6" />
        </span>
        <p className="text-sm font-semibold text-indigo-600 mb-2">404</p>
        <h1 className="text-2xl font-bold text-gray-900 mb-2">
          Page not found
        </h1>
        <p className="text-gray-600 mb-8">
          The page you are looking for doesn&apos;t exist or has been moved.
        </p>
        <div className="flex items-center justify-center gap-3">
          <Link
            href="/"
            className="bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg px-4 py-2 font-medium shadow-sm"
          >
            Go home
          </Link>
          <Link
            href="/dashboard"
            className="text-gray-600 hover:text-gray-900 rounded-lg px-4 py-2 font-medium border border-gray-200 bg-white"
          >
            Dashboard
          </Link>
        </div>
      </div>
    </div>
  );
}
