import Link from "next/link";
import { TriangleAlert } from "lucide-react";
import Prose from "@/components/marketing/Prose";
import { LEGAL_DOCS, type LegalDoc } from "@/lib/legal/content";
import { outstandingFields } from "@/lib/legal/business";

export default function LegalPage({ doc }: { doc: LegalDoc }) {
  const missing = outstandingFields();

  return (
    <article className="max-w-3xl mx-auto px-4 py-12">
      <h1 className="text-3xl font-bold text-gray-900 tracking-tight">
        {doc.title}
      </h1>
      <p className="text-sm text-gray-500 mt-2 mb-8">{doc.description}</p>

      {/* Visible only while business details are unfilled, so a half-finished
          policy can't quietly go live. Disappears once business.ts is complete. */}
      {missing.length > 0 && (
        <div className="flex items-start gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900 mb-8">
          <TriangleAlert className="w-4 h-4 mt-0.5 shrink-0" />
          <span>
            <strong>Draft — not yet complete.</strong> Business details are still
            missing ({missing.join(", ")}). Fill them in{" "}
            <code>src/lib/legal/business.ts</code> before relying on this page.
          </span>
        </div>
      )}

      <Prose blocks={doc.blocks} />

      <nav className="mt-12 pt-6 border-t border-gray-100">
        <p className="text-xs font-semibold uppercase tracking-wide text-gray-400 mb-2">
          Related
        </p>
        <ul className="flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
          {LEGAL_DOCS.filter((d) => d.slug !== doc.slug).map((d) => (
            <li key={d.slug}>
              <Link
                href={`/${d.slug}`}
                className="text-indigo-600 hover:text-indigo-800"
              >
                {d.title}
              </Link>
            </li>
          ))}
        </ul>
      </nav>
    </article>
  );
}
