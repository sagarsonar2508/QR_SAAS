"use client";

import { useMemo, useState } from "react";
import {
  CalendarClock,
  ChevronDown,
  Monitor,
  MoonStar,
  Plus,
  Smartphone,
  Tablet,
  Trash2,
} from "lucide-react";
import {
  DAY_LABELS,
  DEFAULT_TIMEZONE,
  MAX_SCHEDULE_RULES,
  type DeviceKey,
  type RedirectRules,
  type ScheduleRule,
} from "@/lib/redirect-rules";

// Editable draft shapes (allow empty fields while typing).
export type DraftScheduleRule = {
  label: string;
  days: number[];
  start: string;
  end: string;
  url: string;
};
export type DraftRules = {
  timezone: string;
  device: Record<DeviceKey, string>;
  schedule: DraftScheduleRule[];
};

const EMPTY_DEVICE: Record<DeviceKey, string> = {
  android: "",
  ios: "",
  tablet: "",
  desktop: "",
};

export function draftFromRules(rules: RedirectRules | null | undefined): DraftRules {
  return {
    timezone: rules?.timezone ?? guessTimezone(),
    device: { ...EMPTY_DEVICE, ...(rules?.device ?? {}) },
    schedule: (rules?.schedule ?? []).map((r) => ({
      label: r.label ?? "",
      days: r.days,
      start: r.start,
      end: r.end,
      url: r.url,
    })),
  };
}

/** Convert a draft to the wire format; null when nothing is configured. */
export function rulesFromDraft(draft: DraftRules): RedirectRules | null {
  const device: Partial<Record<DeviceKey, string>> = {};
  for (const [k, v] of Object.entries(draft.device)) {
    if (v.trim()) device[k as DeviceKey] = v.trim();
  }
  const schedule: ScheduleRule[] = draft.schedule
    .filter((r) => r.days.length || r.url.trim() || r.label.trim())
    .map((r) => ({
      ...(r.label.trim() ? { label: r.label.trim() } : {}),
      days: r.days,
      start: r.start,
      end: r.end,
      url: r.url.trim(),
    }));
  if (!Object.keys(device).length && !schedule.length) return null;
  return {
    timezone: draft.timezone || DEFAULT_TIMEZONE,
    ...(Object.keys(device).length ? { device } : {}),
    ...(schedule.length ? { schedule } : {}),
  };
}

function guessTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone || DEFAULT_TIMEZONE;
  } catch {
    return DEFAULT_TIMEZONE;
  }
}

const COMMON_TIMEZONES = [
  "Asia/Kolkata",
  "Asia/Dubai",
  "Asia/Singapore",
  "Asia/Tokyo",
  "Europe/London",
  "Europe/Berlin",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Australia/Sydney",
  "UTC",
];

const DEVICE_META: { key: DeviceKey; label: string; icon: React.ReactNode; hint: string }[] = [
  { key: "android", label: "Android", icon: <Smartphone className="w-4 h-4" />, hint: "e.g. Play Store link" },
  { key: "ios", label: "iPhone / iOS", icon: <Smartphone className="w-4 h-4" />, hint: "e.g. App Store link" },
  { key: "tablet", label: "Tablet / iPad", icon: <Tablet className="w-4 h-4" />, hint: "optional" },
  { key: "desktop", label: "Desktop", icon: <Monitor className="w-4 h-4" />, hint: "e.g. your website" },
];

const inputCls =
  "w-full rounded-lg border border-gray-300 px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500";

function isOvernight(r: DraftScheduleRule) {
  return r.start && r.end && r.end <= r.start;
}

export default function SmartRedirects({
  value,
  onChange,
  defaultOpen = false,
}: {
  value: DraftRules;
  onChange: (next: DraftRules) => void;
  defaultOpen?: boolean;
}) {
  const [open, setOpen] = useState(defaultOpen);

  const activeCount = useMemo(() => {
    const devices = Object.values(value.device).filter((v) => v.trim()).length;
    const rules = value.schedule.length;
    return devices + rules;
  }, [value]);

  const set = (patch: Partial<DraftRules>) => onChange({ ...value, ...patch });

  const setRule = (i: number, patch: Partial<DraftScheduleRule>) => {
    const schedule = value.schedule.map((r, idx) => (idx === i ? { ...r, ...patch } : r));
    set({ schedule });
  };

  const timezones = useMemo(() => {
    const tz = value.timezone;
    return COMMON_TIMEZONES.includes(tz) ? COMMON_TIMEZONES : [tz, ...COMMON_TIMEZONES];
  }, [value.timezone]);

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden">
      <button
        type="button"
        onClick={() => setOpen(!open)}
        className="w-full flex items-center gap-2.5 px-4 py-3 bg-gray-50/70 hover:bg-gray-50 text-left"
      >
        <span className="bg-gradient-to-br from-indigo-500 to-violet-600 text-white rounded-lg p-1.5">
          <CalendarClock className="w-4 h-4" />
        </span>
        <span className="flex-1">
          <span className="block text-sm font-semibold text-gray-900">
            Smart redirects
            <span className="ml-2 bg-gradient-to-r from-indigo-600 to-violet-600 text-white text-[10px] font-bold rounded-full px-2 py-0.5 align-middle">
              ADVANCED
            </span>
          </span>
          <span className="block text-xs text-gray-500 mt-0.5">
            Send scanners to different links by time of day or device
          </span>
        </span>
        {activeCount > 0 && (
          <span className="bg-indigo-100 text-indigo-700 text-xs font-semibold rounded-full px-2 py-0.5">
            {activeCount} active
          </span>
        )}
        <ChevronDown
          className={`w-4 h-4 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`}
        />
      </button>

      {open && (
        <div className="p-4 space-y-6 border-t border-gray-100">
          {/* ── Day & time schedule ─────────────────────────────── */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <p className="text-sm font-semibold text-gray-900">Day &amp; time schedule</p>
              <select
                value={value.timezone}
                onChange={(e) => set({ timezone: e.target.value })}
                className="text-xs text-gray-600 border border-gray-200 rounded-lg px-2 py-1 bg-white"
                title="Timezone the schedule runs in"
              >
                {timezones.map((tz) => (
                  <option key={tz} value={tz}>
                    {tz.replace(/_/g, " ")}
                  </option>
                ))}
              </select>
            </div>
            <p className="text-xs text-gray-500 mb-3">
              While a rule is active, scans go to its URL. Outside every rule, scans
              go to the normal destination. An end time earlier than the start rolls
              into the next day — e.g. <b>18:00 → 02:00</b> runs until 2 AM.
            </p>

            <div className="space-y-3">
              {value.schedule.map((rule, i) => (
                <div key={i} className="rounded-lg border border-gray-200 p-3 space-y-2.5 bg-white">
                  <div className="flex items-center gap-2">
                    <input
                      value={rule.label}
                      onChange={(e) => setRule(i, { label: e.target.value })}
                      placeholder={`Rule ${i + 1} — e.g. "Dinner menu"`}
                      className="flex-1 text-sm font-medium text-gray-800 bg-transparent border-0 border-b border-dashed border-gray-200 focus:border-indigo-400 focus:outline-none px-0 py-1"
                    />
                    <button
                      type="button"
                      onClick={() =>
                        set({ schedule: value.schedule.filter((_, idx) => idx !== i) })
                      }
                      className="text-gray-400 hover:text-red-500 p-1"
                      title="Remove rule"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>

                  <div className="flex flex-wrap gap-1.5">
                    {DAY_LABELS.map((d, dayIdx) => {
                      const on = rule.days.includes(dayIdx);
                      return (
                        <button
                          key={d}
                          type="button"
                          onClick={() =>
                            setRule(i, {
                              days: on
                                ? rule.days.filter((x) => x !== dayIdx)
                                : [...rule.days, dayIdx].sort(),
                            })
                          }
                          className={`w-9 h-8 rounded-lg text-xs font-semibold border transition-colors ${
                            on
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "bg-gray-50 border-gray-200 text-gray-500 hover:border-indigo-300"
                          }`}
                        >
                          {d}
                        </button>
                      );
                    })}
                    <button
                      type="button"
                      onClick={() =>
                        setRule(i, {
                          days: rule.days.length === 7 ? [] : [0, 1, 2, 3, 4, 5, 6],
                        })
                      }
                      className="h-8 px-2.5 rounded-lg text-xs font-medium border border-gray-200 text-gray-500 hover:border-indigo-300"
                    >
                      {rule.days.length === 7 ? "Clear" : "Every day"}
                    </button>
                  </div>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                        From
                      </label>
                      <input
                        type="time"
                        value={rule.start}
                        onChange={(e) => setRule(i, { start: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                        Until
                      </label>
                      <input
                        type="time"
                        value={rule.end}
                        onChange={(e) => setRule(i, { end: e.target.value })}
                        className={inputCls}
                      />
                    </div>
                  </div>
                  {isOvernight(rule) && (
                    <p className="flex items-center gap-1.5 text-[11px] text-violet-600">
                      <MoonStar className="w-3.5 h-3.5" />
                      Runs past midnight — ends at {rule.end} the next day
                    </p>
                  )}

                  <div>
                    <label className="block text-[11px] font-medium text-gray-500 mb-0.5">
                      Redirect to
                    </label>
                    <input
                      type="url"
                      value={rule.url}
                      onChange={(e) => setRule(i, { url: e.target.value })}
                      placeholder="https://example.com/dinner-menu"
                      className={inputCls}
                    />
                  </div>
                </div>
              ))}
            </div>

            {value.schedule.length < MAX_SCHEDULE_RULES && (
              <button
                type="button"
                onClick={() =>
                  set({
                    schedule: [
                      ...value.schedule,
                      { label: "", days: [0, 1, 2, 3, 4, 5, 6], start: "09:00", end: "18:00", url: "" },
                    ],
                  })
                }
                className="mt-2.5 inline-flex items-center gap-1.5 text-sm font-medium text-indigo-600 hover:text-indigo-800"
              >
                <Plus className="w-4 h-4" /> Add time rule
              </button>
            )}
          </div>

          {/* ── Device targeting ────────────────────────────────── */}
          <div>
            <p className="text-sm font-semibold text-gray-900 mb-1">Device targeting</p>
            <p className="text-xs text-gray-500 mb-3">
              Perfect for app downloads: send Android to the Play Store, iPhone to the
              App Store. Leave a device empty to use the normal destination. Device
              rules win over the time schedule.
            </p>
            <div className="grid sm:grid-cols-2 gap-2.5">
              {DEVICE_META.map((d) => (
                <div key={d.key}>
                  <label className="flex items-center gap-1.5 text-[11px] font-medium text-gray-500 mb-0.5">
                    {d.icon} {d.label}
                  </label>
                  <input
                    type="url"
                    value={value.device[d.key]}
                    onChange={(e) =>
                      set({ device: { ...value.device, [d.key]: e.target.value } })
                    }
                    placeholder={d.hint}
                    className={inputCls}
                  />
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
