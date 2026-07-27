"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Check, Loader2 } from "lucide-react";

type TierInfo = {
  key: string;
  name: string;
  tagline: string;
  features: string[];
  monthly: number; // paise
  yearly: number;
};

declare global {
  interface Window {
    Razorpay?: new (options: Record<string, unknown>) => { open: () => void };
  }
}

function loadCheckout(): Promise<void> {
  return new Promise((resolve, reject) => {
    if (window.Razorpay) return resolve();
    const s = document.createElement("script");
    s.src = "https://checkout.razorpay.com/v1/checkout.js";
    s.onload = () => resolve();
    s.onerror = () => reject(new Error("Failed to load Razorpay checkout"));
    document.body.appendChild(s);
  });
}

const rupees = (paise: number) =>
  `₹${(paise / 100).toLocaleString("en-IN", { maximumFractionDigits: 0 })}`;

export default function PlanCards({
  tiers,
  currentPlan,
  configured,
  email,
  name,
}: {
  tiers: TierInfo[];
  currentPlan: string;
  configured: boolean;
  email: string;
  name: string;
}) {
  const router = useRouter();
  const [period, setPeriod] = useState<"monthly" | "yearly">("monthly");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  async function subscribe(tierKey: string) {
    setError(null);
    setBusy(tierKey);
    try {
      const res = await fetch("/api/billing/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tier: tierKey, period }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Could not start checkout");

      await loadCheckout();
      new window.Razorpay!({
        key: data.keyId,
        subscription_id: data.subscriptionId,
        name: "QRVeda",
        description: `${tierKey} plan (${period})`,
        prefill: { email, name },
        theme: { color: "#4f46e5" },
        handler: async (resp: Record<string, string>) => {
          const v = await fetch("/api/billing/verify", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify(resp),
          });
          if (v.ok) {
            router.refresh();
          } else {
            const vd = await v.json().catch(() => ({}));
            setError(vd.error ?? "Payment verification failed — contact support.");
          }
        },
      }).open();
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setBusy(null);
    }
  }

  return (
    <div>
      <div className="flex items-center justify-center gap-2 mb-6">
        {(["monthly", "yearly"] as const).map((p) => (
          <button
            key={p}
            onClick={() => setPeriod(p)}
            className={`text-sm font-medium rounded-lg px-4 py-2 border ${
              period === p
                ? "bg-indigo-600 text-white border-indigo-600"
                : "border-gray-300 text-gray-600 hover:bg-gray-50"
            }`}
          >
            {p === "monthly" ? "Monthly" : "Annual (2 months free)"}
          </button>
        ))}
      </div>

      {error && (
        <div className="mb-4 rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
          {error}
        </div>
      )}

      <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {tiers.map((t) => {
          const price = period === "monthly" ? t.monthly : t.yearly;
          const isCurrent = currentPlan === t.key;
          const isFree = t.key === "free";
          return (
            <div
              key={t.key}
              className={`bg-white rounded-xl border p-5 flex flex-col ${
                isCurrent ? "border-indigo-500 ring-1 ring-indigo-500" : "border-gray-200"
              }`}
            >
              <p className="font-semibold text-gray-900">{t.name}</p>
              <p className="text-xs text-gray-500">{t.tagline}</p>
              <p className="mt-3">
                <span className="text-2xl font-extrabold text-gray-900">
                  {rupees(price)}
                </span>
                <span className="text-sm text-gray-500">
                  {isFree ? "" : period === "monthly" ? "/month" : "/year"}
                </span>
              </p>
              <ul className="mt-4 space-y-2 flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2 text-sm text-gray-600">
                    <Check className="w-4 h-4 text-indigo-500 mt-0.5 shrink-0" /> {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="mt-4 text-center text-sm font-medium text-indigo-600 border border-indigo-200 bg-indigo-50 rounded-lg py-2">
                  Current plan
                </span>
              ) : isFree ? (
                <span className="mt-4 text-center text-sm text-gray-400 border border-gray-200 rounded-lg py-2">
                  —
                </span>
              ) : (
                <button
                  onClick={() => subscribe(t.key)}
                  disabled={!configured || busy !== null}
                  title={
                    configured ? undefined : "Payments not configured yet (pilot mode)"
                  }
                  className="mt-4 inline-flex items-center justify-center gap-2 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-40 text-white rounded-lg py-2 text-sm font-medium"
                >
                  {busy === t.key && <Loader2 className="w-4 h-4 animate-spin" />}
                  Upgrade
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
