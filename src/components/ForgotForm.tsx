"use client";

import { useState } from "react";
import Link from "next/link";
import { Loader2, MailCheck } from "lucide-react";
import AuthShell from "@/components/AuthShell";

export default function ForgotForm() {
  const [sent, setSent] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    const email = new FormData(e.currentTarget).get("email");
    const res = await fetch("/api/auth/forgot", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email }),
    });
    const data = await res.json().catch(() => ({}));
    setLoading(false);
    if (res.ok) setSent(true);
    else setError(data.error ?? "Something went wrong. Please try again.");
  }

  if (sent) {
    return (
      <AuthShell
        title="Check your inbox"
        footer={<Link href="/login" className="text-indigo-600 font-medium">Back to sign in</Link>}
      >
        <div className="flex gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3.5">
          <MailCheck className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-sm leading-6 text-emerald-900">
            If that email has an account, a reset link is on its way. It expires in
            an hour and can be used once.
          </p>
        </div>
        <p className="text-xs text-gray-500 mt-4">
          Nothing after a few minutes? Check spam, and make sure you used the address
          you signed up with.
        </p>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Forgot your password?"
      subtitle="We'll email you a link to set a new one."
      footer={<Link href="/login" className="text-indigo-600 font-medium">Back to sign in</Link>}
    >
      <form onSubmit={onSubmit} className="space-y-4">
        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
            {error}
          </p>
        )}
        <div>
          <label htmlFor="email" className="block text-sm font-medium text-gray-700 mb-1.5">
            Email
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            autoComplete="email"
            className="w-full border border-gray-300 rounded-lg px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
          />
        </div>
        <button
          type="submit"
          disabled={loading}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2"
        >
          {loading && <Loader2 className="w-4 h-4 animate-spin" />}
          Send reset link
        </button>
      </form>
    </AuthShell>
  );
}
