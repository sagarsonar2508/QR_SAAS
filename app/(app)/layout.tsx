import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import { QrCode, LogOut, ShieldCheck } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { isAdminUser } from "@/lib/admin/auth";
import { SidebarNav, MobileNav } from "@/components/AppNav";

// Private app surface — keep it out of search results.
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getSessionUser();
  if (!user) redirect("/login");

  const initials = user.name
    .split(/\s+/)
    .map((w) => w[0])
    .slice(0, 2)
    .join("")
    .toUpperCase();

  return (
    <div className="min-h-screen bg-gray-50">
      <aside className="fixed inset-y-0 left-0 w-60 bg-white border-r border-gray-200 hidden md:flex flex-col">
        <Link href="/dashboard" className="flex items-center gap-2.5 px-5 h-16 border-b border-gray-100">
          <span className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-xl p-1.5 shadow-sm shadow-indigo-500/30">
            <QrCode className="w-4 h-4" />
          </span>
          <span className="font-bold text-gray-900 tracking-tight">QRVeda</span>
        </Link>

        <SidebarNav />

        <div className="p-3 border-t border-gray-100">
          <div className="flex items-center gap-2.5 rounded-xl px-2 py-2 hover:bg-gray-50">
            <span className="w-8 h-8 shrink-0 rounded-full bg-gradient-to-br from-indigo-500 to-violet-600 text-white text-xs font-bold flex items-center justify-center">
              {initials || "U"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-gray-900 truncate leading-tight">
                {user.name}
              </p>
              <p className="text-[11px] text-gray-500 truncate">{user.email}</p>
            </div>
            <form action="/api/auth/logout" method="POST">
              <button
                className="text-gray-400 hover:text-red-500 p-1.5 rounded-lg hover:bg-red-50"
                title="Log out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </div>
          <p className="px-2 pt-1.5 flex items-center gap-1.5">
            <span className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 rounded-full px-2 py-0.5">
              {user.plan} plan
            </span>
            {isAdminUser(user) && (
              <Link
                href="/admin"
                className="inline-flex items-center gap-1 text-[10px] font-semibold uppercase tracking-wide text-white bg-gray-900 hover:bg-gray-700 rounded-full px-2 py-0.5"
              >
                <ShieldCheck className="w-3 h-3" /> Admin
              </Link>
            )}
          </p>
        </div>
      </aside>

      {/* Mobile top bar + bottom tab bar */}
      <header className="md:hidden sticky top-0 z-10 bg-white/95 backdrop-blur border-b border-gray-200 flex items-center justify-between px-4 h-14">
        <Link href="/dashboard" className="flex items-center gap-2">
          <span className="bg-gradient-to-br from-indigo-600 to-violet-600 text-white rounded-lg p-1">
            <QrCode className="w-4 h-4" />
          </span>
          <span className="font-bold text-gray-900">QRVeda</span>
        </Link>
        <form action="/api/auth/logout" method="POST">
          <button className="flex items-center gap-1.5 text-xs text-gray-500 hover:text-red-600">
            <LogOut className="w-3.5 h-3.5" /> Log out
          </button>
        </form>
      </header>
      <MobileNav />

      <main className="md:pl-60">
        <div className="max-w-6xl mx-auto p-4 pb-24 md:p-8">{children}</div>
      </main>
    </div>
  );
}
