/**
 * ECharts option builders for the admin panel.
 *
 * These run on the server and are passed as plain props into the <Chart> client
 * component, so **no option may contain a function** — every label and tooltip
 * uses ECharts' string-template syntax ({b} = name, {c} = value) or a literal
 * pre-formatted string.
 *
 * Colour follows the data's job, not taste:
 *   - magnitude / trend  → one hue, sequential  (ACCENT)
 *   - identity           → CATEGORICAL, assigned in fixed order, never cycled
 *
 * CATEGORICAL is the validated reference palette. On a white surface it passes
 * the lightness band, chroma floor, CVD separation (worst adjacent ΔE 9.1) and
 * the normal-vision floor (22.9), with a contrast warning on the aqua and yellow
 * slots — which is why every categorical chart here ships **direct value labels**
 * and a table alongside. Do not add a fifth hue: fold the tail into "Other".
 */

const ACCENT = "#4f46e5"; // indigo — matches the product's accent
const ACCENT_SOFT = "rgba(79,70,229,0.08)";
const GRID = "#f3f4f6";
const AXIS = "#e5e7eb";
const INK = "#6b7280";

export const CATEGORICAL = ["#2a78d6", "#eb6834", "#1baf7a", "#eda100"];

export const MAX_CATEGORICAL = CATEGORICAL.length;

const baseGrid = { left: 44, right: 20, top: 16, bottom: 28, containLabel: true };

/** Trend over time, single series. One series needs no legend — the card title
 *  names it. Crosshair tooltip is on by default. */
export function trendOption(
  points: { day: string; value: number }[],
  { area = true }: { area?: boolean } = {}
) {
  return {
    grid: baseGrid,
    xAxis: {
      type: "category",
      data: points.map((p) => p.day.slice(5)),
      boundaryGap: false,
      axisLine: { lineStyle: { color: AXIS } },
      axisTick: { show: false },
      axisLabel: { color: INK, fontSize: 11, interval: Math.max(0, Math.floor(points.length / 8)) },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: GRID } },
      axisLabel: { color: INK, fontSize: 11 },
    },
    tooltip: {
      trigger: "axis",
      axisPointer: { type: "line", lineStyle: { color: AXIS } },
      backgroundColor: "#111827",
      borderWidth: 0,
      textStyle: { color: "#f9fafb", fontSize: 12 },
    },
    series: [
      {
        type: "line",
        data: points.map((p) => p.value),
        smooth: true,
        symbol: "circle",
        symbolSize: 8,
        showSymbol: false,
        lineStyle: { color: ACCENT, width: 2 },
        itemStyle: { color: ACCENT, borderColor: "#fff", borderWidth: 2 },
        ...(area ? { areaStyle: { color: ACCENT_SOFT } } : {}),
      },
    ],
  };
}

/**
 * Horizontal bar for magnitude — one hue, more-is-darker not needed because
 * length already encodes the value. Horizontal because these categories have
 * long names (country, browser, QR type).
 *
 * `labels` supplies a pre-formatted string per row for the direct label; without
 * it the raw value is shown.
 */
export function magnitudeBarOption(
  rows: { key: string; count: number }[],
  { labels }: { labels?: string[] } = {}
) {
  const ordered = [...rows].reverse(); // ECharts y-axis builds bottom-up
  const orderedLabels = labels ? [...labels].reverse() : null;

  return {
    grid: { ...baseGrid, left: 8, right: 56 },
    xAxis: { type: "value", show: false },
    yAxis: {
      type: "category",
      data: ordered.map((r) => r.key),
      axisLine: { show: false },
      axisTick: { show: false },
      axisLabel: { color: INK, fontSize: 11 },
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "#111827",
      borderWidth: 0,
      textStyle: { color: "#f9fafb", fontSize: 12 },
      formatter: "{b}: {c}",
    },
    series: [
      {
        type: "bar",
        data: ordered.map((r, i) => ({
          value: r.count,
          ...(orderedLabels ? { label: { formatter: orderedLabels[i] } } : {}),
        })),
        barMaxWidth: 14,
        itemStyle: { color: ACCENT, borderRadius: [0, 4, 4, 0] },
        label: {
          show: true,
          position: "right",
          color: "#374151",
          fontSize: 11,
          fontWeight: 500,
        },
      },
    ],
  };
}

/**
 * Categorical bar — for when the categories ARE the subject (plan tiers,
 * providers). Fixed hue order, direct value labels always on (the palette's
 * contrast warning makes labels mandatory, not optional).
 *
 * Anything past MAX_CATEGORICAL must be folded into "Other" by the caller.
 */
export function categoricalBarOption(
  rows: { key: string; count: number }[],
  { labels }: { labels?: string[] } = {}
) {
  return {
    grid: { ...baseGrid, top: 28 },
    xAxis: {
      type: "category",
      data: rows.map((r) => r.key),
      axisLine: { lineStyle: { color: AXIS } },
      axisTick: { show: false },
      axisLabel: { color: INK, fontSize: 11 },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: GRID } },
      axisLabel: { color: INK, fontSize: 11 },
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "#111827",
      borderWidth: 0,
      textStyle: { color: "#f9fafb", fontSize: 12 },
      formatter: "{b}: {c}",
    },
    series: [
      {
        type: "bar",
        data: rows.map((r, i) => ({
          value: r.count,
          itemStyle: {
            color: CATEGORICAL[i % CATEGORICAL.length],
            borderRadius: [4, 4, 0, 0],
          },
          ...(labels ? { label: { formatter: labels[i] } } : {}),
        })),
        barMaxWidth: 48,
        label: {
          show: true,
          position: "top",
          color: "#374151",
          fontSize: 11,
          fontWeight: 600,
        },
      },
    ],
  };
}

/** Rating distribution, 1–5. Ordered scale, so one hue with length doing the
 *  work — not five categorical hues. */
export function ratingOption(rows: { rating: number; count: number }[]) {
  const byRating = new Map(rows.map((r) => [r.rating, r.count]));
  const data = [1, 2, 3, 4, 5].map((r) => byRating.get(r) ?? 0);
  return {
    grid: { ...baseGrid, top: 28, left: 30 },
    xAxis: {
      type: "category",
      data: ["1★", "2★", "3★", "4★", "5★"],
      axisLine: { lineStyle: { color: AXIS } },
      axisTick: { show: false },
      axisLabel: { color: INK, fontSize: 11 },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: GRID } },
      axisLabel: { color: INK, fontSize: 11 },
    },
    tooltip: {
      trigger: "item",
      backgroundColor: "#111827",
      borderWidth: 0,
      textStyle: { color: "#f9fafb", fontSize: 12 },
      formatter: "{b}: {c}",
    },
    series: [
      {
        type: "bar",
        data,
        barMaxWidth: 40,
        itemStyle: { color: ACCENT, borderRadius: [4, 4, 0, 0] },
        label: { show: true, position: "top", color: "#374151", fontSize: 11 },
      },
    ],
  };
}

/** Percentage change vs the previous equivalent period. Null when there's no
 *  baseline — showing "+100%" against zero would be noise, not signal. */
export function deltaPct(current: number, previous: number): number | null {
  if (!previous) return null;
  return ((current - previous) / previous) * 100;
}
