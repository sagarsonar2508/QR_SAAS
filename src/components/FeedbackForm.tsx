"use client";

import { useState } from "react";
import { Star, Loader2, ExternalLink } from "lucide-react";

export default function FeedbackForm({
  code,
  question,
  googleReviewUrl,
  businessName,
}: {
  code: string;
  question: string;
  googleReviewUrl?: string;
  businessName?: string;
}) {
  const [rating, setRating] = useState(0);
  const [hover, setHover] = useState(0);
  const [comment, setComment] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function submit() {
    if (!rating) {
      setError("Please pick a star rating");
      return;
    }
    setError(null);
    setBusy(true);
    const res = await fetch("/api/feedback", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ code, rating, comment }),
    });
    setBusy(false);
    if (res.ok) {
      setDone(true);
    } else {
      const data = await res.json().catch(() => ({}));
      setError(data.error ?? "Something went wrong — please try again");
    }
  }

  if (done) {
    return (
      <div className="text-center">
        <p className="text-4xl mb-3">🙏</p>
        <h1 className="text-xl font-bold text-gray-900">Thank you!</h1>
        <p className="text-sm text-gray-500 mt-1 mb-6">
          Your feedback helps {businessName ?? "us"} improve.
        </p>
        {googleReviewUrl && (
          <a
            href={googleReviewUrl}
            className="inline-flex items-center gap-2 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl px-5 py-3 text-sm font-semibold"
          >
            Leave us a Google review <ExternalLink className="w-4 h-4" />
          </a>
        )}
      </div>
    );
  }

  return (
    <div>
      <h1 className="text-xl font-bold text-gray-900 text-center">{question}</h1>
      {businessName && (
        <p className="text-sm text-gray-500 text-center mt-1">{businessName}</p>
      )}

      <div className="flex items-center justify-center gap-2 my-7">
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            onClick={() => setRating(n)}
            onMouseEnter={() => setHover(n)}
            onMouseLeave={() => setHover(0)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            className="p-1"
          >
            <Star
              className={`w-9 h-9 transition-colors ${
                (hover || rating) >= n
                  ? "fill-amber-400 text-amber-400"
                  : "text-gray-300"
              }`}
            />
          </button>
        ))}
      </div>

      <textarea
        value={comment}
        onChange={(e) => setComment(e.target.value)}
        rows={3}
        maxLength={1000}
        placeholder="Tell us more (optional)"
        className="w-full rounded-xl border border-gray-300 px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
      />

      {error && <p className="text-sm text-red-600 mt-2 text-center">{error}</p>}

      <button
        onClick={submit}
        disabled={busy}
        className="w-full mt-4 bg-indigo-600 hover:bg-indigo-700 disabled:opacity-60 text-white rounded-xl py-3 text-sm font-semibold flex items-center justify-center gap-2"
      >
        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
        Submit feedback
      </button>
    </div>
  );
}
