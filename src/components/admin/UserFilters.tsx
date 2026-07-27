"use client";

import { useRouter, useSearchParams } from "next/navigation";
import { useState, useTransition } from "react";
import { Search, Loader2 } from "lucide-react";

const PLANS = ["", "free", "starter", "business", "agency"];

/** Filters sit in one row above the table and drive the URL, so a filtered view
 *  is linkable and survives a refresh. */
export default function UserFilters() {
  const router = useRouter();
  const params = useSearchParams();
  const [pending, startTransition] = useTransition();
  const [search, setSearch] = useState(params.get("q") ?? "");

  function apply(next: Record<string, string>) {
    const q = new URLSearchParams(params.toString());
    for (const [k, v] of Object.entries(next)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    q.delete("page"); // a new filter always starts at page 1
    startTransition(() => router.push(`/admin/users?${q.toString()}`));
  }

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(e) => {
        e.preventDefault();
        apply({ q: search });
      }}
    >
      <div className="relative">
        <Search className="w-4 h-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2" />
        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search name or email"
          aria-label="Search users"
          className="pl-9 pr-3 py-2 w-64 max-w-full text-sm border border-gray-300 rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500"
        />
      </div>

      <select
        value={params.get("plan") ?? ""}
        onChange={(e) => apply({ plan: e.target.value })}
        aria-label="Filter by plan"
        className="text-sm border border-gray-300 rounded-xl px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500"
      >
        {PLANS.map((p) => (
          <option key={p} value={p}>
            {p === "" ? "All plans" : p}
          </option>
        ))}
      </select>

      <button
        type="submit"
        className="text-sm font-medium bg-gray-900 text-white rounded-xl px-4 py-2 hover:bg-gray-800 inline-flex items-center gap-1.5"
      >
        {pending && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
        Apply
      </button>

      {(params.get("q") || params.get("plan")) && (
        <button
          type="button"
          onClick={() => {
            setSearch("");
            startTransition(() => router.push("/admin/users"));
          }}
          className="text-sm text-gray-500 hover:text-gray-900 px-2"
        >
          Clear
        </button>
      )}
    </form>
  );
}
