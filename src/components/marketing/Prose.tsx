import Link from "next/link";
import { Lightbulb, TriangleAlert } from "lucide-react";
import type { Block } from "@/lib/marketing/blocks";

// Inline syntax: **bold**, `code`, [text](href). Parsed manually — content is
// first-party, but we still never use dangerouslySetInnerHTML.
const INLINE_RE = /(\*\*[^*]+\*\*|`[^`]+`|\[[^\]]+\]\([^)\s]+\))/g;

export function Inline({ text }: { text: string }) {
  const parts = text.split(INLINE_RE);
  return (
    <>
      {parts.map((part, i) => {
        if (part.startsWith("**") && part.endsWith("**")) {
          return (
            <strong key={i} className="font-semibold text-gray-900">
              {part.slice(2, -2)}
            </strong>
          );
        }
        if (part.startsWith("`") && part.endsWith("`")) {
          return (
            <code
              key={i}
              className="text-[0.85em] bg-gray-100 text-gray-800 rounded px-1.5 py-0.5"
            >
              {part.slice(1, -1)}
            </code>
          );
        }
        const link = /^\[([^\]]+)\]\(([^)\s]+)\)$/.exec(part);
        if (link) {
          return (
            <Link
              key={i}
              href={link[2]}
              className="text-indigo-600 hover:text-indigo-800 underline decoration-indigo-200 underline-offset-2"
            >
              {link[1]}
            </Link>
          );
        }
        return part;
      })}
    </>
  );
}

const slugify = (s: string) =>
  s.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

export default function Prose({ blocks }: { blocks: Block[] }) {
  return (
    <div className="space-y-5">
      {blocks.map((b, i) => {
        switch (b.t) {
          case "h2":
            return (
              <h2
                key={i}
                id={slugify(b.text)}
                className="text-xl font-bold text-gray-900 tracking-tight pt-4 scroll-mt-24"
              >
                <Inline text={b.text} />
              </h2>
            );
          case "h3":
            return (
              <h3 key={i} className="text-base font-semibold text-gray-900 pt-1">
                <Inline text={b.text} />
              </h3>
            );
          case "p":
            return (
              <p key={i} className="text-[15px] leading-7 text-gray-600">
                <Inline text={b.text} />
              </p>
            );
          case "ul":
            return (
              <ul key={i} className="space-y-2 pl-1">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-2.5 text-[15px] leading-7 text-gray-600">
                    <span className="mt-[13px] w-1.5 h-1.5 rounded-full bg-indigo-400 shrink-0" />
                    <span>
                      <Inline text={item} />
                    </span>
                  </li>
                ))}
              </ul>
            );
          case "ol":
            return (
              <ol key={i} className="space-y-2 pl-1">
                {b.items.map((item, j) => (
                  <li key={j} className="flex gap-3 text-[15px] leading-7 text-gray-600">
                    <span className="mt-1 w-6 h-6 rounded-full bg-indigo-50 text-indigo-600 text-xs font-bold flex items-center justify-center shrink-0">
                      {j + 1}
                    </span>
                    <span>
                      <Inline text={item} />
                    </span>
                  </li>
                ))}
              </ol>
            );
          case "tip":
            return (
              <div
                key={i}
                className="flex gap-3 rounded-xl bg-indigo-50/70 border border-indigo-100 px-4 py-3.5"
              >
                <Lightbulb className="w-4 h-4 text-indigo-500 mt-1 shrink-0" />
                <p className="text-sm leading-6 text-indigo-900">
                  <Inline text={b.text} />
                </p>
              </div>
            );
          case "warn":
            return (
              <div
                key={i}
                className="flex gap-3 rounded-xl bg-amber-50/80 border border-amber-100 px-4 py-3.5"
              >
                <TriangleAlert className="w-4 h-4 text-amber-500 mt-1 shrink-0" />
                <p className="text-sm leading-6 text-amber-900">
                  <Inline text={b.text} />
                </p>
              </div>
            );
          case "table":
            return (
              <div key={i} className="overflow-x-auto rounded-xl border border-gray-200">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="bg-gray-50 text-left">
                      {b.headers.map((h, j) => (
                        <th
                          key={j}
                          className="px-4 py-2.5 font-semibold text-gray-700 whitespace-nowrap"
                        >
                          {h}
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-100">
                    {b.rows.map((row, j) => (
                      <tr key={j}>
                        {row.map((cell, k) => (
                          <td key={k} className="px-4 py-2.5 text-gray-600 align-top">
                            <Inline text={cell} />
                          </td>
                        ))}
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            );
        }
      })}
    </div>
  );
}
