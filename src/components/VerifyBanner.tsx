"use client";

import { useState } from "react";
import { CheckCircle2, Loader2, MailWarning } from "lucide-react";

/** Shown across the app until the account's email is confirmed. QR creation is
 *  blocked meanwhile, so this explains why rather than letting the user hit an
 *  unexplained error. */
export default function VerifyBanner({ email }: { email: string }) {
  const [state, setState] = useState<"idle" | "sending" | "sent">("idle");
  const [error, setError] = useState<string | null>(null);

  async function resend() {
    setError(null);
    setState("sending");
    const res = await fetch("/api/auth/verify", { method: "PUT" });
    const data = await res.json().catch(() => ({}));
    if (res.ok) {
      setState("sent");
    } else {
      setState("idle");
      setError(data.error ?? "Couldn't send right now. Try again shortly.");
    }
  }

  return (
    <div className="mb-5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3">
      <div className="flex items-start gap-2.5">
        <MailWarning className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <div className="min-w-0 flex-1 text-sm text-amber-900">
          <p>
            <strong>Confirm your email to start creating QR codes.</strong> We sent a
            link to <span className="font-medium">{email}</span>.
          </p>
          {error && <p className="text-red-700 mt-1">{error}</p>}
        </div>
        {state === "sent" ? (
          <span className="inline-flex items-center gap-1.5 text-xs font-medium text-emerald-700 shrink-0">
            <CheckCircle2 className="w-3.5 h-3.5" /> Sent
          </span>
        ) : (
          <button
            onClick={resend}
            disabled={state === "sending"}
            className="shrink-0 inline-flex items-center gap-1.5 text-xs font-semibold text-amber-900 underline underline-offset-2 hover:text-amber-950 disabled:opacity-60"
          >
            {state === "sending" && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
            Resend
          </button>
        )}
      </div>
    </div>
  );
}
