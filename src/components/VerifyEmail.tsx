"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { CheckCircle2, Loader2, TriangleAlert } from "lucide-react";
import AuthShell from "@/components/AuthShell";

type State = "working" | "done" | "failed";

export default function VerifyEmail({ signedIn }: { signedIn: boolean }) {
  const params = useSearchParams();
  const token = params.get("token") ?? "";
  const [state, setState] = useState<State>(token ? "working" : "failed");
  const [error, setError] = useState<string | null>(
    token ? null : "This page needs a confirmation link from your email."
  );
  const ran = useRef(false);

  useEffect(() => {
    if (!token || ran.current) return;
    ran.current = true; // link previews and re-renders must not spend the token twice
    (async () => {
      const res = await fetch("/api/auth/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token }),
      });
      const data = await res.json().catch(() => ({}));
      if (res.ok) setState("done");
      else {
        setError(data.error ?? "We couldn't confirm this link.");
        setState("failed");
      }
    })();
  }, [token]);

  if (state === "working") {
    return (
      <AuthShell title="Confirming your email">
        <p className="flex items-center gap-2 text-sm text-gray-500">
          <Loader2 className="w-4 h-4 animate-spin" /> One moment…
        </p>
      </AuthShell>
    );
  }

  if (state === "done") {
    return (
      <AuthShell title="Email confirmed">
        <div className="flex gap-3 rounded-xl bg-emerald-50 border border-emerald-100 px-4 py-3.5 mb-5">
          <CheckCircle2 className="w-4 h-4 text-emerald-600 mt-0.5 shrink-0" />
          <p className="text-sm leading-6 text-emerald-900">
            Thanks — your address is confirmed and your account is fully active.
          </p>
        </div>
        <Link
          href={signedIn ? "/dashboard" : "/login"}
          className="block text-center bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg py-2.5 text-sm font-medium"
        >
          {signedIn ? "Go to dashboard" : "Sign in"}
        </Link>
      </AuthShell>
    );
  }

  return (
    <AuthShell
      title="Couldn't confirm this link"
      footer={
        <Link href={signedIn ? "/dashboard" : "/login"} className="text-indigo-600 font-medium">
          {signedIn ? "Back to dashboard" : "Back to sign in"}
        </Link>
      }
    >
      <div className="flex gap-3 rounded-xl bg-amber-50 border border-amber-100 px-4 py-3.5">
        <TriangleAlert className="w-4 h-4 text-amber-600 mt-0.5 shrink-0" />
        <p className="text-sm leading-6 text-amber-900">{error}</p>
      </div>
      <p className="text-xs text-gray-500 mt-4">
        Confirmation links expire after 24 hours and work once. Sign in and use the
        banner at the top of the app to send a fresh one.
      </p>
    </AuthShell>
  );
}
