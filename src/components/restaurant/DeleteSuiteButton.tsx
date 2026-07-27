"use client";

import { useRouter } from "next/navigation";
import { Trash2 } from "lucide-react";

export default function DeleteSuiteButton({
  suiteId,
  name,
}: {
  suiteId: string;
  name: string;
}) {
  const router = useRouter();

  async function onDelete() {
    if (
      !confirm(
        `Delete "${name}" and all its QR codes? Printed stickers will stop working. This cannot be undone.`
      )
    ) {
      return;
    }
    const res = await fetch(`/api/suites/${suiteId}`, { method: "DELETE" });
    if (res.ok) {
      router.push("/restaurant");
      router.refresh();
    }
  }

  return (
    <button
      onClick={onDelete}
      className="inline-flex items-center gap-1.5 text-xs font-medium border border-red-200 rounded-lg px-3 py-1.5 text-red-600 hover:bg-red-50"
    >
      <Trash2 className="w-3.5 h-3.5" /> Delete suite
    </button>
  );
}
