import type { Metadata } from "next";
import Link from "next/link";
import { Clock, Newspaper } from "lucide-react";
import { POSTS } from "@/lib/marketing/blog-content";

export const metadata: Metadata = {
  title: "Blog — QR code ideas for every business",
  description:
    "Practical guides on using dynamic QR codes in real businesses — restaurants, retail, real estate, salons, events, agencies and app marketing.",
  alternates: { canonical: "/blog" },
};

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    timeZone: "UTC",
  });

export default function BlogIndexPage() {
  const [latest, ...rest] = POSTS;
  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="max-w-2xl mb-10">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 rounded-full px-3 py-1 mb-3">
          <Newspaper className="w-3.5 h-3.5" /> Blog
        </p>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
          QR code ideas that actually work
        </h1>
        <p className="text-gray-500 leading-7">
          Practical, industry-by-industry guides to getting real results from
          dynamic QR codes.
        </p>
      </div>

      {/* Featured latest post */}
      <Link
        href={`/blog/${latest.slug}`}
        className="group block rounded-2xl border border-gray-200 p-7 mb-8 bg-gradient-to-br from-indigo-50/60 to-white hover:border-indigo-300 hover:shadow-md hover:shadow-gray-200/60 transition-all"
      >
        <div className="flex items-center gap-3 text-xs text-gray-500 mb-3">
          <span className="bg-indigo-600 text-white font-semibold rounded-full px-2.5 py-0.5">
            {latest.tag}
          </span>
          <span>{fmtDate(latest.date)}</span>
          <span className="flex items-center gap-1">
            <Clock className="w-3.5 h-3.5" /> {latest.readMinutes} min read
          </span>
        </div>
        <h2 className="text-2xl font-bold text-gray-900 tracking-tight group-hover:text-indigo-700 transition-colors mb-2">
          {latest.title}
        </h2>
        <p className="text-gray-600 leading-7 max-w-3xl">{latest.excerpt}</p>
      </Link>

      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {rest.map((p) => (
          <Link
            key={p.slug}
            href={`/blog/${p.slug}`}
            className="group flex flex-col rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-md hover:shadow-gray-200/60 hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-2.5 text-xs text-gray-500 mb-2.5">
              <span className="bg-indigo-50 text-indigo-700 font-semibold rounded-full px-2.5 py-0.5">
                {p.tag}
              </span>
              <span>{fmtDate(p.date)}</span>
            </div>
            <h2 className="font-bold text-gray-900 leading-snug group-hover:text-indigo-700 transition-colors mb-2">
              {p.title}
            </h2>
            <p className="text-sm text-gray-500 leading-6 flex-1">{p.excerpt}</p>
            <p className="flex items-center gap-1 text-xs text-gray-400 mt-3">
              <Clock className="w-3.5 h-3.5" /> {p.readMinutes} min read
            </p>
          </Link>
        ))}
      </div>
    </main>
  );
}
