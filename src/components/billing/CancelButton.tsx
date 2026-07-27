"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";

export default function CancelButton() {
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  async function onCancel() {
    if (!confirm("Cancel your subscription? You keep your plan until the end of the paid period.")) {
      return;
    }
    setBusy(true);
    const res = await fetch("/api/billing/cancel", { method: "POST" });
    setBusy(false);
    if (res.ok) router.refresh();
  }

  return (
    <button
      onClick={onCancel}
      disabled={busy}
      className="inline-flex items-center gap-1.5 text-xs font-medium text-gray-500 hover:text-red-600"
    >
      {busy && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
      Cancel subscription
    </button>
  );
}
