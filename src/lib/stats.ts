import { and, count, desc, eq, gte, sql } from "drizzle-orm";
import { db, qrCodes, scans } from "@/db";

const dayKey = sql<string>`to_char(${scans.ts}, 'YYYY-MM-DD')`;

function startOfToday() {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysAgo(n: number) {
  const d = startOfToday();
  d.setDate(d.getDate() - n);
  return d;
}

/** Fill missing days with 0 so charts show a continuous series. */
export function fillDailySeries(
  rows: { day: string; count: number }[],
  days: number
): { day: string; count: number }[] {
  const byDay = new Map(rows.map((r) => [r.day, r.count]));
  const out: { day: string; count: number }[] = [];
  for (let i = days - 1; i >= 0; i--) {
    const d = daysAgo(i);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    out.push({ day: key, count: byDay.get(key) ?? 0 });
  }
  return out;
}

export async function dashboardStats(userId: string) {
  const [totals] = await db
    .select({ totalQrs: count() })
    .from(qrCodes)
    .where(eq(qrCodes.userId, userId));

  const [scanTotals] = await db
    .select({
      totalScans: count(),
      scansToday: sql<number>`count(*) filter (where ${scans.ts} >= ${startOfToday().toISOString()})`,
    })
    .from(scans)
    .innerJoin(qrCodes, eq(scans.qrId, qrCodes.id))
    .where(eq(qrCodes.userId, userId));

  const topQrs = await db
    .select({
      id: qrCodes.id,
      name: qrCodes.name,
      type: qrCodes.type,
      code: qrCodes.code,
      scanCount: count(scans.id),
    })
    .from(qrCodes)
    .leftJoin(
      scans,
      and(eq(scans.qrId, qrCodes.id), gte(scans.ts, daysAgo(30)))
    )
    .where(eq(qrCodes.userId, userId))
    .groupBy(qrCodes.id)
    .orderBy(desc(count(scans.id)))
    .limit(5);

  const dailyRaw = await db
    .select({ day: dayKey, count: count() })
    .from(scans)
    .innerJoin(qrCodes, eq(scans.qrId, qrCodes.id))
    .where(and(eq(qrCodes.userId, userId), gte(scans.ts, daysAgo(29))))
    .groupBy(dayKey)
    .orderBy(dayKey);

  const devices = await db
    .select({ device: scans.device, count: count() })
    .from(scans)
    .innerJoin(qrCodes, eq(scans.qrId, qrCodes.id))
    .where(eq(qrCodes.userId, userId))
    .groupBy(scans.device)
    .orderBy(desc(count()));

  const cities = await db
    .select({ city: scans.city, count: count() })
    .from(scans)
    .innerJoin(qrCodes, eq(scans.qrId, qrCodes.id))
    .where(eq(qrCodes.userId, userId))
    .groupBy(scans.city)
    .orderBy(desc(count()))
    .limit(8);

  return {
    totalQrs: totals?.totalQrs ?? 0,
    totalScans: Number(scanTotals?.totalScans ?? 0),
    scansToday: Number(scanTotals?.scansToday ?? 0),
    topQrs: topQrs.map((q) => ({ ...q, scanCount: Number(q.scanCount) })),
    daily: fillDailySeries(
      dailyRaw.map((r) => ({ day: r.day, count: Number(r.count) })),
      30
    ),
    devices: devices.map((d) => ({
      device: d.device ?? "unknown",
      count: Number(d.count),
    })),
    cities: cities.map((c) => ({
      city: c.city ?? "Unknown",
      count: Number(c.count),
    })),
  };
}

export async function qrStats(qrId: string) {
  const [totals] = await db
    .select({
      totalScans: count(),
      scansToday: sql<number>`count(*) filter (where ${scans.ts} >= ${startOfToday().toISOString()})`,
    })
    .from(scans)
    .where(eq(scans.qrId, qrId));

  const dailyRaw = await db
    .select({ day: dayKey, count: count() })
    .from(scans)
    .where(and(eq(scans.qrId, qrId), gte(scans.ts, daysAgo(29))))
    .groupBy(dayKey)
    .orderBy(dayKey);

  const devices = await db
    .select({ device: scans.device, count: count() })
    .from(scans)
    .where(eq(scans.qrId, qrId))
    .groupBy(scans.device)
    .orderBy(desc(count()));

  const recent = await db
    .select()
    .from(scans)
    .where(eq(scans.qrId, qrId))
    .orderBy(desc(scans.ts))
    .limit(20);

  return {
    totalScans: Number(totals?.totalScans ?? 0),
    scansToday: Number(totals?.scansToday ?? 0),
    daily: fillDailySeries(
      dailyRaw.map((r) => ({ day: r.day, count: Number(r.count) })),
      30
    ),
    devices: devices.map((d) => ({
      device: d.device ?? "unknown",
      count: Number(d.count),
    })),
    recent,
  };
}
