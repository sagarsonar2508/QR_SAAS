"use client";

import { useState } from "react";
import { ExternalLink, Loader2 } from "lucide-react";

/** Sends the customer to the provider's hosted billing portal — payment method,
 *  invoices and cancellation all live there, so we don't reimplement them. */
export default function ManageBillingButton() {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function open() {
    setError(null);
    setBusy(true);
    try {
      const res = await fetch("/api/billing/portal", { method: "POST" });
      const data = await res.json().catch(() => ({}));
      if (!res.ok || !data.url) {
        throw new Error(data.error ?? "Could not open the billing portal");
      }
      window.location.href = data.url;
    } catch (e) {
      setError((e as Error).message);
      setBusy(false);
    }
  }

  return (
    <div className="mt-1">
      <button
        onClick={open}
        disabled={busy}
        className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-indigo-600 disabled:opacity-50"
      >
        {busy ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <ExternalLink className="w-3.5 h-3.5" />
        )}
        Manage billing
      </button>
      {error && <p className="text-xs text-red-600 mt-1">{error}</p>}
    </div>
  );
}
