"use client";

import { useMemo, useState } from "react";
import { renderQrSvg } from "@/lib/qr-render";
import {
  ArrowDown,
  FileText,
  IndianRupee,
  MessageCircle,
  Sparkles,
} from "lucide-react";

const DESTINATIONS = [
  {
    key: "menu",
    label: "PDF Menu",
    icon: FileText,
    tile: "bg-amber-100 text-amber-700",
    desc: "sharmas-kitchen-menu.pdf",
  },
  {
    key: "wa",
    label: "WhatsApp",
    icon: MessageCircle,
    tile: "bg-emerald-100 text-emerald-700",
    desc: "Chat with +91 98765 43210",
  },
  {
    key: "upi",
    label: "UPI Payment",
    icon: IndianRupee,
    tile: "bg-sky-100 text-sky-700",
    desc: "Pay sharmas@okhdfcbank",
  },
  {
    key: "offer",
    label: "Weekend Offer",
    icon: Sparkles,
    tile: "bg-rose-100 text-rose-700",
    desc: "20% off — landing page",
  },
];

// The whole pitch in one widget: the QR image never changes, the destination does.
export default function HeroDemo() {
  const [active, setActive] = useState(0);

  const qrSvg = useMemo(
    () =>
      renderQrSvg("https://qrveda.in/Ab8K29x", {
        fg: "#1e1b4b",
        bg: "#FFFFFF",
        shape: "classy-rounded",
        size: 400,
      }),
    []
  );

  const dest = DESTINATIONS[active];

  return (
    <div className="bg-white rounded-3xl border border-gray-200 shadow-xl shadow-indigo-100 p-6 sm:p-8 w-full max-w-sm mx-auto">
      <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 text-center mb-4">
        Try it — change where this QR goes
      </p>

      <div className="relative mx-auto w-40 h-40">
        <div
          aria-label="Demo QR code"
          className="w-40 h-40 rounded-xl overflow-hidden [&>svg]:w-full [&>svg]:h-full"
          dangerouslySetInnerHTML={{ __html: qrSvg }}
        />
        <span className="absolute -top-2 -right-2 bg-indigo-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5 shadow">
          PRINTED ONCE
        </span>
      </div>
      <p className="text-center text-xs text-gray-400 mt-2 font-mono">
        qrveda.in/Ab8K29x
      </p>

      <div className="flex justify-center my-3">
        <ArrowDown className="w-5 h-5 text-indigo-400 animate-bounce" />
      </div>

      <div
        key={dest.key}
        className="animate-fade-up flex items-center gap-3 border border-gray-200 rounded-2xl p-3.5 bg-gray-50"
      >
        <span className={`rounded-xl p-2.5 ${dest.tile}`}>
          <dest.icon className="w-5 h-5" />
        </span>
        <div className="min-w-0">
          <p className="text-sm font-semibold text-gray-900">{dest.label}</p>
          <p className="text-xs text-gray-500 truncate">{dest.desc}</p>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-2 mt-4">
        {DESTINATIONS.map((d, i) => (
          <button
            key={d.key}
            onClick={() => setActive(i)}
            className={`text-xs font-medium rounded-lg px-2.5 py-2 border transition-all ${
              i === active
                ? "bg-indigo-600 text-white border-indigo-600 shadow-sm"
                : "border-gray-200 text-gray-600 hover:border-indigo-300 hover:text-indigo-600"
            }`}
          >
            {d.label}
          </button>
        ))}
      </div>

      <p className="text-center text-[11px] text-gray-400 mt-4">
        The QR never changes. The destination does — that&apos;s dynamic.
      </p>
    </div>
  );
}
