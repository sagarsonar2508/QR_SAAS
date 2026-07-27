"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Gauge,
  Users,
  IndianRupee,
  QrCode,
  Activity,
} from "lucide-react";

export const ADMIN_LINKS = [
  { href: "/admin", label: "Overview", icon: Gauge },
  { href: "/admin/users", label: "Users", icon: Users },
  { href: "/admin/revenue", label: "Revenue", icon: IndianRupee },
  { href: "/admin/content", label: "Content", icon: QrCode },
  { href: "/admin/system", label: "System", icon: Activity },
];

export default function AdminNav() {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto">
      {ADMIN_LINKS.map((l) => {
        const active =
          l.href === "/admin" ? pathname === "/admin" : pathname.startsWith(l.href);
        return (
          <Link
            key={l.href}
            href={l.href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center gap-2 px-3.5 py-2 rounded-xl text-sm font-medium whitespace-nowrap transition-colors ${
              active
                ? "bg-gray-900 text-white"
                : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
            }`}
          >
            <l.icon className="w-4 h-4" />
            {l.label}
          </Link>
        );
      })}
    </nav>
  );
}
