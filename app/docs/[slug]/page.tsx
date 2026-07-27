import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight } from "lucide-react";
import { DOCS, DOC_GROUPS, docBySlug } from "@/lib/marketing/docs-content";
import { plainText } from "@/lib/marketing/blocks";
import Prose from "@/components/marketing/Prose";
import { appUrl } from "@/lib/qr-image";

export function generateStaticParams() {
  return DOCS.map((d) => ({ slug: d.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const doc = docBySlug(slug);
  if (!doc) return {};
  return {
    title: doc.title,
    description: doc.description,
    alternates: { canonical: `/docs/${doc.slug}` },
    openGraph: {
      title: doc.title,
      description: doc.description,
      type: "article",
      url: `/docs/${doc.slug}`,
    },
  };
}

export default async function DocPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const doc = docBySlug(slug);
  if (!doc) notFound();

  const idx = DOCS.findIndex((d) => d.slug === slug);
  const prev = DOCS[idx - 1];
  const next = DOCS[idx + 1];
  const base = appUrl();

  const jsonLd: Record<string, unknown>[] = [
    {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      headline: doc.title,
      description: doc.description,
      url: `${base}/docs/${doc.slug}`,
      publisher: { "@type": "Organization", name: "QRVeda", url: base },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Docs", item: `${base}/docs` },
        {
          "@type": "ListItem",
          position: 2,
          name: doc.title,
          item: `${base}/docs/${doc.slug}`,
        },
      ],
    },
  ];
  if (doc.faqs?.length) {
    jsonLd.push({
      "@context": "https://schema.org",
      "@type": "FAQPage",
      mainEntity: doc.faqs.map((f) => ({
        "@type": "Question",
        name: f.q,
        acceptedAnswer: { "@type": "Answer", text: plainText(f.a) },
      })),
    });
  }

  return (
    <main className="max-w-6xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <div className="grid lg:grid-cols-[220px_minmax(0,1fr)] gap-10">
        {/* Sidebar */}
        <aside className="hidden lg:block">
          <nav className="sticky top-24 space-y-6">
            {DOC_GROUPS.map((group) => {
              const pages = DOCS.filter((d) => d.group === group);
              if (!pages.length) return null;
              return (
                <div key={group}>
                  <p className="text-[11px] font-semibold uppercase tracking-wide text-gray-400 mb-2">
                    {group}
                  </p>
                  <ul className="space-y-1">
                    {pages.map((d) => (
                      <li key={d.slug}>
                        <Link
                          href={`/docs/${d.slug}`}
                          className={`block text-sm rounded-lg px-2.5 py-1.5 leading-5 ${
                            d.slug === slug
                              ? "bg-indigo-50 text-indigo-700 font-medium"
                              : "text-gray-600 hover:bg-gray-50 hover:text-gray-900"
                          }`}
                        >
                          {d.title.replace(/ with QRVeda| explained/i, "")}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              );
            })}
          </nav>
        </aside>

        {/* Article */}
        <article className="max-w-3xl min-w-0">
          <Link
            href="/docs"
            className="lg:hidden inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-4"
          >
            <ArrowLeft className="w-4 h-4" /> All docs
          </Link>
          <p className="text-xs font-semibold uppercase tracking-wide text-indigo-600 mb-2">
            {doc.group}
          </p>
          <h1 className="text-3xl font-bold text-gray-900 tracking-tight mb-3">
            {doc.title}
          </h1>
          <p className="text-gray-500 leading-7 mb-8 pb-8 border-b border-gray-100">
            {doc.description}
          </p>

          <Prose blocks={doc.blocks} />

          {doc.faqs && (
            <div className="mt-8 space-y-3">
              {doc.faqs.map((f) => (
                <details
                  key={f.q}
                  className="group rounded-xl border border-gray-200 px-5 py-4 open:bg-gray-50/60"
                >
                  <summary className="cursor-pointer list-none font-semibold text-gray-900 text-[15px] flex items-center justify-between gap-3">
                    {f.q}
                    <span className="text-gray-300 group-open:rotate-45 transition-transform text-xl leading-none">
                      +
                    </span>
                  </summary>
                  <p className="text-[15px] leading-7 text-gray-600 mt-3">{f.a}</p>
                </details>
              ))}
            </div>
          )}

          {/* Prev / next */}
          <div className="grid sm:grid-cols-2 gap-3 mt-12 pt-8 border-t border-gray-100">
            {prev ? (
              <Link
                href={`/docs/${prev.slug}`}
                className="group rounded-xl border border-gray-200 p-4 hover:border-indigo-300 transition-colors"
              >
                <span className="text-xs text-gray-400 flex items-center gap-1">
                  <ArrowLeft className="w-3 h-3" /> Previous
                </span>
                <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">
                  {prev.title}
                </span>
              </Link>
            ) : (
              <span />
            )}
            {next && (
              <Link
                href={`/docs/${next.slug}`}
                className="group rounded-xl border border-gray-200 p-4 hover:border-indigo-300 transition-colors text-right"
              >
                <span className="text-xs text-gray-400 flex items-center gap-1 justify-end">
                  Next <ArrowRight className="w-3 h-3" />
                </span>
                <span className="text-sm font-medium text-gray-900 group-hover:text-indigo-600">
                  {next.title}
                </span>
              </Link>
            )}
          </div>

          {/* CTA */}
          <div className="mt-8 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-6 text-center">
            <p className="text-white font-semibold mb-1">
              Ready to try it yourself?
            </p>
            <p className="text-indigo-100 text-sm mb-4">
              Create your first dynamic QR code free — no credit card needed.
            </p>
            <Link
              href="/signup"
              className="inline-block bg-white text-indigo-700 font-semibold text-sm rounded-xl px-5 py-2.5 hover:bg-indigo-50"
            >
              Start free
            </Link>
          </div>
        </article>
      </div>
    </main>
  );
}
