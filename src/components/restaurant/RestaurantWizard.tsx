"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, UploadCloud, UtensilsCrossed } from "lucide-react";

export default function RestaurantWizard() {
  const router = useRouter();
  const [name, setName] = useState("");
  const [menuKind, setMenuKind] = useState<"pdf" | "url">("pdf");
  const [menuUrl, setMenuUrl] = useState("");
  const [tables, setTables] = useState(10);
  const [wantFeedback, setWantFeedback] = useState(true);
  const [wantReview, setWantReview] = useState(false);
  const [googleReviewUrl, setGoogleReviewUrl] = useState("");
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function uploadMenu(file: File) {
    setUploading(true);
    setError(null);
    const form = new FormData();
    form.append("file", file);
    const res = await fetch("/api/uploads", { method: "POST", body: form });
    const data = await res.json().catch(() => ({}));
    setUploading(false);
    if (!res.ok) {
      setError(data.error ?? "Upload failed");
      return;
    }
    setMenuUrl(data.url);
  }

  async function onCreate() {
    setError(null);
    setSaving(true);
    const res = await fetch("/api/suites", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        name,
        menu: { kind: menuKind, url: menuUrl },
        tables,
        feedback: { enabled: wantFeedback, googleReviewUrl },
        review: { enabled: wantReview, googleReviewUrl },
      }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      setError(data.error ?? "Something went wrong");
      setSaving(false);
      return;
    }
    router.push(`/restaurant/${data.id}`);
  }

  const qrCount = (tables > 0 ? tables : 1) + (wantFeedback ? 1 : 0) + (wantReview ? 1 : 0);

  return (
    <div className="max-w-2xl">
      <h1 className="text-2xl font-bold text-gray-900 mb-1 flex items-center gap-2.5">
        <span className="bg-indigo-50 text-indigo-600 rounded-lg p-2">
          <UtensilsCrossed className="w-5 h-5" />
        </span>
        Set up your restaurant
      </h1>
      <p className="text-sm text-gray-500 mb-6">
        Answer four questions — we&apos;ll generate every QR your restaurant needs,
        plus a print-ready sticker sheet.
      </p>

      <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-6">
        {error && (
          <div className="rounded-lg bg-red-50 border border-red-200 text-red-700 text-sm px-3 py-2">
            {error}
          </div>
        )}

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            1. Restaurant name
          </label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="e.g. Sharma's Kitchen"
            className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            2. Your menu
          </label>
          <div className="flex gap-2 mb-3">
            <button
              onClick={() => {
                setMenuKind("pdf");
                setMenuUrl("");
              }}
              className={`text-sm rounded-lg px-3 py-1.5 border font-medium ${
                menuKind === "pdf"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              Upload PDF
            </button>
            <button
              onClick={() => {
                setMenuKind("url");
                setMenuUrl("");
              }}
              className={`text-sm rounded-lg px-3 py-1.5 border font-medium ${
                menuKind === "url"
                  ? "bg-indigo-600 text-white border-indigo-600"
                  : "border-gray-300 text-gray-600"
              }`}
            >
              I have a link
            </button>
          </div>
          {menuKind === "pdf" ? (
            <label className="flex items-center gap-3 border border-dashed border-gray-300 rounded-lg px-4 py-3 cursor-pointer hover:border-indigo-400">
              {uploading ? (
                <Loader2 className="w-5 h-5 text-indigo-500 animate-spin" />
              ) : (
                <UploadCloud className="w-5 h-5 text-gray-400" />
              )}
              <span className="text-sm text-gray-600 truncate">
                {menuUrl ? "Menu uploaded ✓" : "Upload your menu PDF (max 10 MB)"}
              </span>
              <input
                type="file"
                accept="application/pdf"
                className="hidden"
                onChange={(e) => {
                  const f = e.target.files?.[0];
                  if (f) uploadMenu(f);
                }}
              />
            </label>
          ) : (
            <input
              value={menuUrl}
              onChange={(e) => setMenuUrl(e.target.value)}
              placeholder="https://your-menu-link.com"
              className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
            />
          )}
          <p className="text-xs text-gray-400 mt-1.5">
            Prices change? Re-upload the menu — every printed QR keeps working.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-1">
            3. How many tables?
          </label>
          <input
            type="number"
            min={0}
            max={50}
            value={tables}
            onChange={(e) => setTables(Math.max(0, Math.min(50, Number(e.target.value))))}
            className="w-28 rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
          />
          <p className="text-xs text-gray-400 mt-1.5">
            Each table gets its own QR so you can see which tables scan most.
            Enter 0 for a single menu QR.
          </p>
        </div>

        <div>
          <label className="block text-sm font-semibold text-gray-800 mb-2">
            4. Extras
          </label>
          <div className="space-y-2.5">
            <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={wantFeedback}
                onChange={(e) => setWantFeedback(e.target.checked)}
                className="mt-0.5 accent-indigo-600"
              />
              <span>
                <strong>Feedback QR</strong> — customers rate you privately;
                happy ones get nudged to Google
              </span>
            </label>
            <label className="flex items-start gap-2.5 text-sm text-gray-700 cursor-pointer">
              <input
                type="checkbox"
                checked={wantReview}
                onChange={(e) => setWantReview(e.target.checked)}
                className="mt-0.5 accent-indigo-600"
              />
              <span>
                <strong>Google Review QR</strong> — opens your review page directly
              </span>
            </label>
            {(wantFeedback || wantReview) && (
              <input
                value={googleReviewUrl}
                onChange={(e) => setGoogleReviewUrl(e.target.value)}
                placeholder="Google review link (required for review QR)"
                className="w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
              />
            )}
          </div>
        </div>

        <button
          onClick={onCreate}
          disabled={saving || uploading || !name.trim() || !menuUrl}
          className="w-full bg-indigo-600 hover:bg-indigo-700 disabled:opacity-50 text-white rounded-lg py-2.5 text-sm font-medium flex items-center justify-center gap-2"
        >
          {saving && <Loader2 className="w-4 h-4 animate-spin" />}
          Create {qrCount} QR codes
        </button>
      </div>
    </div>
  );
}
