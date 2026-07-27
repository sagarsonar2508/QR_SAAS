"use client";

import { useRouter } from "next/navigation";
import { Globe } from "lucide-react";
import type { Currency } from "@/lib/billing/tiers";

const YEAR_SECONDS = 365 * 24 * 60 * 60;

export default function CurrencySwitcher({
  currency,
  options,
}: {
  currency: Currency;
  options: Currency[];
}) {
  const router = useRouter();
  if (options.length < 2) return null;

  return (
    <label className="inline-flex items-center gap-1.5 text-xs text-gray-500">
      <Globe className="w-3.5 h-3.5" />
      <span className="sr-only">Currency</span>
      <select
        value={currency}
        onChange={(e) => {
          document.cookie = `currency=${e.target.value}; path=/; max-age=${YEAR_SECONDS}; samesite=lax`;
          router.refresh();
        }}
        className="border border-gray-300 rounded-md px-1.5 py-1 text-xs text-gray-700 bg-white"
      >
        {options.map((c) => (
          <option key={c} value={c}>
            {c}
          </option>
        ))}
      </select>
    </label>
  );
}
