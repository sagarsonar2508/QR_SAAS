import type { Metadata } from "next";
import Link from "next/link";
import { ArrowRight, BookOpen } from "lucide-react";
import { DOCS, DOC_GROUPS } from "@/lib/marketing/docs-content";

export const metadata: Metadata = {
  title: "Documentation",
  description:
    "Everything about QRVeda — creating dynamic QR codes, all QR types, smart redirects, scan analytics, the Restaurant Suite, plans and more.",
  alternates: { canonical: "/docs" },
};

export default function DocsIndexPage() {
  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <div className="max-w-2xl mb-10">
        <p className="inline-flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-indigo-600 bg-indigo-50 rounded-full px-3 py-1 mb-3">
          <BookOpen className="w-3.5 h-3.5" /> Documentation
        </p>
        <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-2">
          Learn QRVeda
        </h1>
        <p className="text-gray-500 leading-7">
          Everything you need to create, brand, schedule and measure dynamic QR
          codes — explained in plain language.
        </p>
      </div>

      <div className="space-y-10">
        {DOC_GROUPS.map((group) => {
          const pages = DOCS.filter((d) => d.group === group);
          if (!pages.length) return null;
          return (
            <section key={group}>
              <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-3">
                {group}
              </h2>
              <div className="grid sm:grid-cols-2 gap-4">
                {pages.map((d) => (
                  <Link
                    key={d.slug}
                    href={`/docs/${d.slug}`}
                    className="group bg-white rounded-2xl border border-gray-200 p-5 hover:border-indigo-300 hover:shadow-md hover:shadow-gray-200/60 transition-all"
                  >
                    <p className="font-semibold text-gray-900 flex items-center justify-between gap-2">
                      {d.title}
                      <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 group-hover:translate-x-0.5 transition-all shrink-0" />
                    </p>
                    <p className="text-sm text-gray-500 mt-1.5 leading-6">
                      {d.description}
                    </p>
                  </Link>
                ))}
              </div>
            </section>
          );
        })}
      </div>
    </main>
  );
}
