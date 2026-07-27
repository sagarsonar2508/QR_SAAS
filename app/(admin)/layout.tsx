import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft, ShieldCheck } from "lucide-react";
import { requireAdmin } from "@/lib/admin/auth";
import AdminNav from "@/components/admin/AdminNav";

// Internal surface — never index it.
export const metadata: Metadata = {
  title: "Admin · QRVeda",
  robots: { index: false, follow: false },
};

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // Renders 404 for anyone who isn't an admin, so the panel's existence isn't
  // discoverable by poking at the URL.
  const user = await requireAdmin();

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-white border-b border-gray-200 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-4 md:px-8">
          <div className="flex items-center justify-between h-16 gap-4">
            <div className="flex items-center gap-2.5 min-w-0">
              <span className="bg-gray-900 text-white rounded-xl p-1.5">
                <ShieldCheck className="w-4 h-4" />
              </span>
              <div className="min-w-0">
                <p className="font-bold text-gray-900 tracking-tight leading-tight">
                  Admin
                </p>
                <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
              </div>
            </div>
            <Link
              href="/dashboard"
              className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-gray-900 whitespace-nowrap"
            >
              <ArrowLeft className="w-3.5 h-3.5" /> Back to app
            </Link>
          </div>
          <div className="pb-3">
            <AdminNav />
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-4 md:p-8">{children}</main>
    </div>
  );
}
