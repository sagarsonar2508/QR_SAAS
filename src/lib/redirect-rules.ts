// Shared between server and client — keep this file free of server-only imports.
//
// Smart redirect rules for dynamic QRs. Priority when a scan comes in:
//   1. device rule (android / ios / tablet / desktop)
//   2. first matching schedule rule (day-of-week + time window, QR's timezone)
//   3. the QR's default destination

export const DEVICE_KEYS = ["android", "ios", "tablet", "desktop"] as const;
export type DeviceKey = (typeof DEVICE_KEYS)[number];

export type DeviceRules = Partial<Record<DeviceKey, string>>;

export type ScheduleRule = {
  label?: string;
  /** Days of week the window STARTS on: 0 = Sunday … 6 = Saturday. */
  days: number[];
  /** "HH:MM" 24h. */
  start: string;
  /** "HH:MM" 24h. end <= start rolls into the next day (e.g. 18:00 → 02:00). */
  end: string;
  url: string;
};

export type RedirectRules = {
  /** IANA timezone the schedule is evaluated in. */
  timezone?: string;
  device?: DeviceRules;
  schedule?: ScheduleRule[];
};

export const DEFAULT_TIMEZONE = "Asia/Kolkata";
export const MAX_SCHEDULE_RULES = 20;

export const DAY_LABELS = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];

const TIME_RE = /^([01]\d|2[0-3]):[0-5]\d$/;
// http(s), app/deep-link schemes (tel:, upi:, market://…) or app-relative paths.
const URL_RE = /^(https?:\/\/\S+|[a-z][a-z0-9+.-]*:\S+|\/\S*)$/i;
// Schemes a redirect must never carry.
const BLOCKED_SCHEME_RE = /^(javascript|data|vbscript|file|blob|about):/i;

const isSafeUrl = (url: string) => URL_RE.test(url) && !BLOCKED_SCHEME_RE.test(url);

export function isValidTimezone(tz: string): boolean {
  try {
    new Intl.DateTimeFormat("en-US", { timeZone: tz });
    return true;
  } catch {
    return false;
  }
}

/**
 * Validate and normalize client-supplied rules.
 * Returns { rules: null } when nothing meaningful is configured.
 */
export function parseRedirectRules(input: unknown): {
  rules: RedirectRules | null;
  error?: string;
} {
  if (input === null || input === undefined) return { rules: null };
  if (typeof input !== "object" || Array.isArray(input)) {
    return { rules: null, error: "Invalid redirect rules" };
  }
  const raw = input as Record<string, unknown>;
  const out: RedirectRules = {};

  if (raw.device && typeof raw.device === "object" && !Array.isArray(raw.device)) {
    const device: DeviceRules = {};
    for (const key of DEVICE_KEYS) {
      const v = (raw.device as Record<string, unknown>)[key];
      if (typeof v !== "string" || !v.trim()) continue;
      const url = v.trim();
      if (!isSafeUrl(url)) {
        return { rules: null, error: `Device rule (${key}): enter a valid URL` };
      }
      device[key] = url;
    }
    if (Object.keys(device).length) out.device = device;
  }

  if (Array.isArray(raw.schedule)) {
    if (raw.schedule.length > MAX_SCHEDULE_RULES) {
      return { rules: null, error: `Maximum ${MAX_SCHEDULE_RULES} schedule rules` };
    }
    const schedule: ScheduleRule[] = [];
    for (const entry of raw.schedule) {
      if (!entry || typeof entry !== "object") continue;
      const r = entry as Record<string, unknown>;
      const days = Array.isArray(r.days)
        ? [...new Set(r.days.filter((d) => Number.isInteger(d) && +d >= 0 && +d <= 6))].map(Number)
        : [];
      const start = typeof r.start === "string" ? r.start : "";
      const end = typeof r.end === "string" ? r.end : "";
      const url = typeof r.url === "string" ? r.url.trim() : "";
      // Skip fully empty placeholder rows silently.
      if (!days.length && !url) continue;
      if (!days.length) return { rules: null, error: "Schedule rule: pick at least one day" };
      if (!TIME_RE.test(start) || !TIME_RE.test(end)) {
        return { rules: null, error: "Schedule rule: times must be HH:MM" };
      }
      if (!url || !isSafeUrl(url)) {
        return { rules: null, error: "Schedule rule: enter a valid destination URL" };
      }
      const rule: ScheduleRule = { days: days.sort(), start, end, url };
      if (typeof r.label === "string" && r.label.trim()) {
        rule.label = r.label.trim().slice(0, 80);
      }
      schedule.push(rule);
    }
    if (schedule.length) out.schedule = schedule;
  }

  if (!out.device && !out.schedule) return { rules: null };

  if (typeof raw.timezone === "string" && raw.timezone.trim()) {
    if (!isValidTimezone(raw.timezone.trim())) {
      return { rules: null, error: "Unknown timezone" };
    }
    out.timezone = raw.timezone.trim();
  }

  return { rules: out };
}

const toMinutes = (hhmm: string) => {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
};

/** Current weekday (0=Sun) and minutes-since-midnight in a timezone. */
export function nowInTimezone(tz: string, now: Date = new Date()) {
  let parts: Intl.DateTimeFormatPart[];
  try {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: tz,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
  } catch {
    parts = new Intl.DateTimeFormat("en-US", {
      timeZone: DEFAULT_TIMEZONE,
      weekday: "short",
      hour: "2-digit",
      minute: "2-digit",
      hour12: false,
    }).formatToParts(now);
  }
  const get = (type: string) => parts.find((p) => p.type === type)?.value ?? "";
  const day = DAY_LABELS.indexOf(get("weekday"));
  // "24" can appear for midnight with hour12: false in some ICU versions.
  const hour = Number(get("hour")) % 24;
  const minute = Number(get("minute"));
  return { day: day === -1 ? 0 : day, minutes: hour * 60 + minute };
}

/** True if the rule's window covers the given local weekday/time. */
export function scheduleRuleMatches(
  rule: ScheduleRule,
  local: { day: number; minutes: number }
): boolean {
  const start = toMinutes(rule.start);
  const end = toMinutes(rule.end);
  // start === end means a full 24h window; end < start rolls past midnight.
  const rawDur = end - start;
  const duration = rawDur > 0 ? rawDur : rawDur + 1440;
  for (const d of rule.days) {
    if (local.day === d && local.minutes >= start) {
      if (local.minutes - start < duration) return true;
    }
    if (local.day === (d + 1) % 7 && local.minutes < start) {
      if (1440 - start + local.minutes < duration) return true;
    }
  }
  return false;
}

/**
 * Resolve the destination for a scan.
 * deviceCandidates: ordered device keys the scanner matches, most specific
 * first (e.g. an iPad is ["tablet", "ios"]).
 */
export function resolveDestination(
  rules: RedirectRules | null | undefined,
  fallback: string,
  ctx: { deviceCandidates: DeviceKey[]; now?: Date }
): string {
  if (!rules) return fallback;

  if (rules.device) {
    for (const key of ctx.deviceCandidates) {
      const url = rules.device[key];
      if (url) return url;
    }
  }

  if (rules.schedule?.length) {
    const local = nowInTimezone(rules.timezone || DEFAULT_TIMEZONE, ctx.now);
    for (const rule of rules.schedule) {
      if (scheduleRuleMatches(rule, local)) return rule.url;
    }
  }

  return fallback;
}
