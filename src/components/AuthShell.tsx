import Link from "next/link";
import { QrCode } from "lucide-react";

/** Shared frame for the standalone auth screens (forgot, reset, verify) so they
 *  match the login and signup pages. */
export default function AuthShell({
  title,
  subtitle,
  children,
  footer,
}: {
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  footer?: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-md">
        <Link href="/" className="flex items-center justify-center gap-2 mb-8">
          <span className="bg-indigo-600 text-white rounded-lg p-1.5">
            <QrCode className="w-5 h-5" />
          </span>
          <span className="text-xl font-bold text-gray-900">QRVeda</span>
        </Link>

        <div className="bg-white rounded-2xl shadow-sm border border-gray-200 p-8">
          <h1 className="text-xl font-semibold text-gray-900 mb-1">{title}</h1>
          {subtitle && <p className="text-sm text-gray-500 mb-6">{subtitle}</p>}
          {children}
        </div>

        {footer && <p className="text-center text-sm text-gray-500 mt-5">{footer}</p>}
      </div>
    </div>
  );
}
