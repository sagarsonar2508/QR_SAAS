import Link from "next/link";
import { QrCode, ScanLine, CalendarDays, TrendingUp, Plus } from "lucide-react";
import { getSessionUser } from "@/lib/auth";
import { dashboardStats } from "@/lib/stats";
import Chart from "@/components/Chart";
import TypeIcon from "@/components/qr/TypeIcon";

export const dynamic = "force-dynamic";

export default async function DashboardPage() {
  const user = (await getSessionUser())!;
  const stats = await dashboardStats(user.id);

  const cards = [
    {
      label: "Total QR Codes",
      value: stats.totalQrs,
      icon: QrCode,
      chip: "bg-indigo-50 text-indigo-600",
    },
    {
      label: "Total Scans",
      value: stats.totalScans,
      icon: ScanLine,
      chip: "bg-violet-50 text-violet-600",
    },
    {
      label: "Scans Today",
      value: stats.scansToday,
      icon: CalendarDays,
      chip: "bg-emerald-50 text-emerald-600",
    },
    {
      label: "Top QR (30 days)",
      value: stats.topQrs[0]?.scanCount ? stats.topQrs[0].name : "—",
      icon: TrendingUp,
      chip: "bg-amber-50 text-amber-600",
      small: true,
    },
  ];

  const lineOption = {
    grid: { left: 40, right: 16, top: 20, bottom: 30 },
    xAxis: {
      type: "category",
      data: stats.daily.map((d) => d.day.slice(5)),
      axisLine: { lineStyle: { color: "#e5e7eb" } },
      axisLabel: { color: "#6b7280", fontSize: 11 },
    },
    yAxis: {
      type: "value",
      minInterval: 1,
      splitLine: { lineStyle: { color: "#f3f4f6" } },
      axisLabel: { color: "#6b7280", fontSize: 11 },
    },
    tooltip: { trigger: "axis" },
    series: [
      {
        type: "line",
        data: stats.daily.map((d) => d.count),
        smooth: true,
        symbol: "none",
        lineStyle: { color: "#4f46e5", width: 2.5 },
        areaStyle: { color: "rgba(79,70,229,0.08)" },
      },
    ],
  };

  const deviceOption = {
    tooltip: { trigger: "item" },
    legend: { bottom: 0, textStyle: { color: "#6b7280", fontSize: 11 } },
    series: [
      {
        type: "pie",
        radius: ["45%", "70%"],
        center: ["50%", "42%"],
        data: stats.devices.map((d) => ({ name: d.device, value: d.count })),
        label: { show: false },
      },
    ],
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900 tracking-tight">
            Welcome back, {user.name.split(" ")[0]} 👋
          </h1>
          <p className="text-sm text-gray-500 mt-0.5">
            {new Date().toLocaleDateString("en-IN", {
              weekday: "long",
              day: "numeric",
              month: "long",
            })}
            {" · "}here&apos;s how your QR codes are doing.
          </p>
        </div>
        <Link
          href="/qrcodes/new"
          className="hidden sm:inline-flex items-center gap-1.5 bg-gradient-to-r from-indigo-600 to-violet-600 hover:from-indigo-700 hover:to-violet-700 text-white text-sm font-semibold rounded-xl px-4 py-2 shadow-sm shadow-indigo-500/30"
        >
          <Plus className="w-4 h-4" /> New QR Code
        </Link>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {cards.map((c) => (
          <div
            key={c.label}
            className="bg-white rounded-2xl border border-gray-200 p-5 hover:shadow-md hover:shadow-gray-200/60 hover:-translate-y-0.5 transition-all"
          >
            <div className="flex items-center gap-2">
              <span className={`rounded-lg p-1.5 ${c.chip}`}>
                <c.icon className="w-4 h-4" />
              </span>
              <span className="text-gray-500 text-xs font-medium uppercase tracking-wide">
                {c.label}
              </span>
            </div>
            <p
              className={`mt-3 font-bold text-gray-900 ${c.small ? "text-base truncate" : "text-3xl"}`}
            >
              {c.value}
            </p>
          </div>
        ))}
      </div>

      <div className="grid lg:grid-cols-3 gap-4">
        <div className="lg:col-span-2 bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">
            Scans — last 30 days
          </h2>
          <Chart option={lineOption} className="h-64 w-full" />
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-2">Devices</h2>
          {stats.devices.length ? (
            <Chart option={deviceOption} className="h-64 w-full" />
          ) : (
            <p className="text-sm text-gray-400 mt-10 text-center">No scans yet</p>
          )}
        </div>
      </div>

      <div className="grid lg:grid-cols-2 gap-4">
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">
            Top performing QR codes (30 days)
          </h2>
          {stats.topQrs.length === 0 && (
            <p className="text-sm text-gray-400">
              No QR codes yet —{" "}
              <Link href="/qrcodes/new" className="text-indigo-600">
                create your first one
              </Link>
            </p>
          )}
          <ul className="divide-y divide-gray-100">
            {stats.topQrs.map((q) => (
              <li key={q.id}>
                <Link
                  href={`/qrcodes/${q.id}`}
                  className="flex items-center justify-between py-2.5 hover:bg-gray-50 rounded-lg px-2 -mx-2"
                >
                  <span className="flex items-center gap-2.5 min-w-0">
                    <span className="bg-indigo-50 text-indigo-600 rounded-lg p-1.5">
                      <TypeIcon type={q.type} className="w-4 h-4" />
                    </span>
                    <span className="text-sm font-medium text-gray-800 truncate">
                      {q.name}
                    </span>
                  </span>
                  <span className="text-sm text-gray-500 shrink-0 ml-3">
                    {q.scanCount} scans
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
        <div className="bg-white rounded-2xl border border-gray-200 p-5">
          <h2 className="text-sm font-semibold text-gray-900 mb-3">Top locations</h2>
          {stats.cities.length === 0 ? (
            <p className="text-sm text-gray-400">
              Location data appears once your QRs are scanned behind a CDN/proxy
              that forwards geo headers.
            </p>
          ) : (
            <ul className="divide-y divide-gray-100">
              {stats.cities.map((c) => (
                <li key={c.city} className="flex items-center justify-between py-2.5">
                  <span className="text-sm text-gray-800">{c.city}</span>
                  <span className="text-sm text-gray-500">{c.count} scans</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}
