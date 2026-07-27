"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard,
  QrCode,
  Plus,
  UtensilsCrossed,
  CreditCard,
} from "lucide-react";

const LINKS = [
  { href: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { href: "/qrcodes", label: "QR Codes", icon: QrCode },
  { href: "/restaurant", label: "Restaurant", icon: UtensilsCrossed },
  { href: "/billing", label: "Billing", icon: CreditCard },
];

function isActive(pathname: string, href: string) {
  if (href === "/qrcodes") {
    return pathname.startsWith("/qrcodes") && pathname !== "/qrcodes/new";
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function SidebarNav() {
  const pathname = usePathname();
  return (
    <nav className="flex-1 p-3 space-y-1">
      {LINKS.map((l) => {
        const active = isActive(pathname, l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            className={`flex items-center gap-2.5 px-3 py-2 rounded-xl text-sm font-medium transition-colors ${
              active
                ? "bg-indigo-50 text-indigo-700"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <l.icon className={`w-4 h-4 ${active ? "text-indigo-600" : "text-gray-400"}`} />
            {l.label}
            {active && (
              <span className="ml-auto w-1.5 h-1.5 rounded-full bg-indigo-500" />
            )}
          </Link>
        );
      })}
      <div className="pt-3">
        <Link
          href="/qrcodes/new"
          className={`flex items-center justify-center gap-2 px-3 py-2.5 rounded-xl text-sm font-semibold transition-all shadow-sm ${
            pathname === "/qrcodes/new"
              ? "bg-gradient-to-r from-indigo-700 to-violet-700 text-white"
              : "bg-gradient-to-r from-indigo-600 to-violet-600 text-white hover:from-indigo-700 hover:to-violet-700"
          }`}
        >
          <Plus className="w-4 h-4" /> New QR Code
        </Link>
      </div>
    </nav>
  );
}

export function MobileNav() {
  const pathname = usePathname();
  return (
    <nav className="md:hidden fixed bottom-0 inset-x-0 z-20 bg-white/95 backdrop-blur border-t border-gray-200 grid grid-cols-5">
      {[...LINKS.slice(0, 2), { href: "/qrcodes/new", label: "New", icon: Plus }, ...LINKS.slice(2)].map(
        (l) => {
          const active =
            l.href === "/qrcodes/new"
              ? pathname === "/qrcodes/new"
              : isActive(pathname, l.href);
          const isNew = l.href === "/qrcodes/new";
          return (
            <Link
              key={l.href}
              href={l.href}
              className={`flex flex-col items-center gap-0.5 py-2 text-[10px] font-medium ${
                active ? "text-indigo-600" : "text-gray-500"
              }`}
            >
              {isNew ? (
                <span className="bg-gradient-to-r from-indigo-600 to-violet-600 text-white rounded-full p-1.5 -mt-4 shadow-lg shadow-indigo-500/30 ring-4 ring-gray-50">
                  <l.icon className="w-4 h-4" />
                </span>
              ) : (
                <l.icon className="w-5 h-5" />
              )}
              {l.label}
            </Link>
          );
        }
      )}
    </nav>
  );
}
