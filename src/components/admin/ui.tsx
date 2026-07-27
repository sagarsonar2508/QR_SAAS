import type { ReactNode } from "react";
import { ArrowDownRight, ArrowUpRight, Minus } from "lucide-react";

export function Card({
  title,
  subtitle,
  action,
  children,
  className = "",
}: {
  title?: string;
  subtitle?: string;
  action?: ReactNode;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section
      className={`bg-white rounded-2xl border border-gray-200 p-5 ${className}`}
    >
      {(title || action) && (
        <header className="flex items-start justify-between gap-3 mb-4">
          <div>
            {title && <h2 className="font-semibold text-gray-900">{title}</h2>}
            {subtitle && <p className="text-xs text-gray-500 mt-0.5">{subtitle}</p>}
          </div>
          {action}
        </header>
      )}
      {children}
    </section>
  );
}

/**
 * A single headline number. Per the dataviz form heuristic, one current value
 * belongs in a stat tile — not a one-bar chart.
 *
 * `delta` is a percentage change against the previous equivalent period. Colour
 * alone never carries the meaning: an arrow icon and a sign accompany it.
 */
export function Stat({
  label,
  value,
  hint,
  delta,
  icon: Icon,
  tone = "indigo",
}: {
  label: string;
  value: string | number;
  hint?: string;
  delta?: number | null;
  icon?: React.ComponentType<{ className?: string }>;
  tone?: "indigo" | "emerald" | "amber" | "violet" | "rose" | "slate";
}) {
  const tones: Record<string, string> = {
    indigo: "bg-indigo-50 text-indigo-600",
    emerald: "bg-emerald-50 text-emerald-600",
    amber: "bg-amber-50 text-amber-600",
    violet: "bg-violet-50 text-violet-600",
    rose: "bg-rose-50 text-rose-600",
    slate: "bg-gray-100 text-gray-600",
  };

  const flat = delta === null || delta === undefined || Math.abs(delta) < 0.5;
  const DeltaIcon = flat ? Minus : delta! > 0 ? ArrowUpRight : ArrowDownRight;
  const deltaClass = flat
    ? "text-gray-500"
    : delta! > 0
      ? "text-emerald-700"
      : "text-rose-700";

  return (
    <div className="bg-white rounded-2xl border border-gray-200 p-5">
      <div className="flex items-center gap-2">
        {Icon && (
          <span className={`rounded-lg p-1.5 ${tones[tone]}`}>
            <Icon className="w-4 h-4" />
          </span>
        )}
        <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
          {label}
        </span>
      </div>
      <p className="text-2xl font-bold text-gray-900 mt-3 tabular-nums">{value}</p>
      <div className="flex items-center gap-2 mt-1 min-h-[18px]">
        {delta !== undefined && (
          <span className={`inline-flex items-center gap-0.5 text-xs font-medium ${deltaClass}`}>
            <DeltaIcon className="w-3.5 h-3.5" />
            {flat ? "flat" : `${delta! > 0 ? "+" : ""}${delta!.toFixed(0)}%`}
          </span>
        )}
        {hint && <span className="text-xs text-gray-400">{hint}</span>}
      </div>
    </div>
  );
}

export function Empty({ children }: { children: ReactNode }) {
  return (
    <p className="text-sm text-gray-400 py-8 text-center border border-dashed border-gray-200 rounded-xl">
      {children}
    </p>
  );
}

export function Pill({
  children,
  tone = "slate",
}: {
  children: ReactNode;
  tone?: "slate" | "emerald" | "amber" | "rose" | "indigo";
}) {
  const tones = {
    slate: "bg-gray-100 text-gray-700",
    emerald: "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200",
    amber: "bg-amber-50 text-amber-700 ring-1 ring-amber-200",
    rose: "bg-rose-50 text-rose-700 ring-1 ring-rose-200",
    indigo: "bg-indigo-50 text-indigo-700 ring-1 ring-indigo-200",
  };
  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${tones[tone]}`}
    >
      {children}
    </span>
  );
}

/** Subscription/plan status → tone. Status colour is reserved for state and is
 *  always paired with its label, never used as a series colour. */
export function statusTone(status: string): "emerald" | "amber" | "rose" | "slate" {
  if (["active", "trialing"].includes(status)) return "emerald";
  if (["cancelling", "past_due", "created", "paused"].includes(status)) return "amber";
  if (["cancelled", "halted", "expired"].includes(status)) return "rose";
  return "slate";
}

/** Wraps wide tables so the page body never scrolls horizontally. */
export function TableWrap({ children }: { children: ReactNode }) {
  return <div className="overflow-x-auto -mx-5 px-5">{children}</div>;
}

export function Th({ children, right }: { children: ReactNode; right?: boolean }) {
  return (
    <th
      className={`text-[11px] font-semibold uppercase tracking-wide text-gray-500 pb-2 px-2 whitespace-nowrap ${
        right ? "text-right" : "text-left"
      }`}
    >
      {children}
    </th>
  );
}

export function Td({
  children,
  right,
  className = "",
}: {
  children: ReactNode;
  right?: boolean;
  className?: string;
}) {
  return (
    <td
      className={`py-2.5 px-2 text-sm text-gray-700 ${right ? "text-right tabular-nums" : ""} ${className}`}
    >
      {children}
    </td>
  );
}
