import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ArrowRight, Clock } from "lucide-react";
import { POSTS, postBySlug } from "@/lib/marketing/blog-content";
import Prose from "@/components/marketing/Prose";
import { appUrl } from "@/lib/qr-image";

export function generateStaticParams() {
  return POSTS.map((p) => ({ slug: p.slug }));
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) return {};
  return {
    title: post.title,
    description: post.excerpt,
    alternates: { canonical: `/blog/${post.slug}` },
    openGraph: {
      title: post.title,
      description: post.excerpt,
      type: "article",
      url: `/blog/${post.slug}`,
      publishedTime: post.date,
    },
    twitter: { card: "summary_large_image", title: post.title, description: post.excerpt },
  };
}

const fmtDate = (iso: string) =>
  new Date(`${iso}T00:00:00Z`).toLocaleDateString("en-IN", {
    day: "numeric",
    month: "long",
    year: "numeric",
    timeZone: "UTC",
  });

export default async function BlogPostPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const post = postBySlug(slug);
  if (!post) notFound();

  const base = appUrl();
  const others = POSTS.filter((p) => p.slug !== slug).slice(0, 3);

  const jsonLd = [
    {
      "@context": "https://schema.org",
      "@type": "Article",
      headline: post.title,
      description: post.excerpt,
      datePublished: post.date,
      url: `${base}/blog/${post.slug}`,
      author: { "@type": "Organization", name: "QRVeda" },
      publisher: { "@type": "Organization", name: "QRVeda", url: base },
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Blog", item: `${base}/blog` },
        {
          "@type": "ListItem",
          position: 2,
          name: post.title,
          item: `${base}/blog/${post.slug}`,
        },
      ],
    },
  ];

  return (
    <main className="max-w-3xl mx-auto px-4 py-12">
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />
      <Link
        href="/blog"
        className="inline-flex items-center gap-1 text-sm text-gray-500 hover:text-gray-900 mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> All posts
      </Link>

      <div className="flex flex-wrap items-center gap-3 text-xs text-gray-500 mb-4">
        <span className="bg-indigo-50 text-indigo-700 font-semibold rounded-full px-2.5 py-0.5">
          {post.tag}
        </span>
        <time dateTime={post.date}>{fmtDate(post.date)}</time>
        <span className="flex items-center gap-1">
          <Clock className="w-3.5 h-3.5" /> {post.readMinutes} min read
        </span>
      </div>

      <h1 className="text-3xl sm:text-4xl font-bold text-gray-900 tracking-tight leading-tight mb-4">
        {post.title}
      </h1>
      <p className="text-lg text-gray-500 leading-8 mb-8 pb-8 border-b border-gray-100">
        {post.excerpt}
      </p>

      <Prose blocks={post.blocks} />

      {/* CTA */}
      <div className="mt-12 rounded-2xl bg-gradient-to-r from-indigo-600 to-violet-600 p-7 text-center">
        <p className="text-white text-lg font-semibold mb-1">
          Put these ideas to work
        </p>
        <p className="text-indigo-100 text-sm mb-4">
          Create dynamic QR codes with scheduling, device targeting and scan
          analytics — free to start.
        </p>
        <Link
          href="/signup"
          className="inline-block bg-white text-indigo-700 font-semibold text-sm rounded-xl px-5 py-2.5 hover:bg-indigo-50"
        >
          Create your first QR code
        </Link>
      </div>

      {/* Related posts */}
      <div className="mt-12 pt-8 border-t border-gray-100">
        <h2 className="text-sm font-semibold uppercase tracking-wide text-gray-400 mb-4">
          More from the blog
        </h2>
        <div className="space-y-3">
          {others.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group flex items-center justify-between gap-4 rounded-xl border border-gray-200 p-4 hover:border-indigo-300 transition-colors"
            >
              <div>
                <p className="text-sm font-semibold text-gray-900 group-hover:text-indigo-600">
                  {p.title}
                </p>
                <p className="text-xs text-gray-400 mt-0.5">
                  {p.tag} · {p.readMinutes} min read
                </p>
              </div>
              <ArrowRight className="w-4 h-4 text-gray-300 group-hover:text-indigo-500 shrink-0" />
            </Link>
          ))}
        </div>
      </div>
    </main>
  );
}
