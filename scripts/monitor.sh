#!/usr/bin/env bash
set -uo pipefail

# Minimal error monitoring for every app on this box.
#
# DELIBERATELY SMALL. This is phase-one visibility, not an observability stack:
# one script, one cron entry, no service to run, no account to sign up for, no
# SDK in any app. When it stops being enough — when you want stack traces,
# grouping, release tracking — replace it with Sentry (see docs/MONITORING.md).
# Until then this closes the gap that actually hurts, which is not "we lack
# telemetry" but "a failure is indistinguishable from silence".
#
# Three things are checked every run:
#
#   1. APP ERRORS    new error lines in each pm2 error log since last run
#   2. BACKUP HEALTH the nightly backup logs, plus whether a dump is overdue
#   3. REACHABILITY  each site answers over HTTPS
#
# Anything found is emailed as one digest.
#
# WHY NOT cron's MAILTO: GCP blocks outbound port 25, so the local sendmail
# cannot deliver to the internet. Mail has to go through authenticated SMTP on
# 587, which is what send_alert() below does.
#
#   ./scripts/monitor.sh           # check, email if anything is wrong
#   ./scripts/monitor.sh --dry     # print findings, send nothing
#   ./scripts/monitor.sh --test    # send a test alert and exit

STATE_DIR="${MONITOR_STATE_DIR:-/var/lib/qrveda-monitor}"
ENV_FILE="${MONITOR_ENV_FILE:-/var/www/html/QR_SAAS/.env}"

# app|pm2-error-log|backup-log|url|expected-http
#
# Paths taken from `pm2 jlist` rather than guessed — they are NOT uniform: qrveda
# was started with an explicit log path, the other two use pm2's default under
# /root/.pm2/logs. Re-check with:
#   pm2 jlist | python3 -c 'import json,sys;[print(a["name"], a["pm2_env"]["pm_err_log_path"]) for a in json.load(sys.stdin)]'
#
# Pipe-separated because URLs contain colons.
TARGETS=(
  "qrveda|/var/log/pm2/qrveda-err-2.log|/var/log/qrveda-backup.log|https://qrveda.com/zzzzzzz|404"
  "dare_web|/root/.pm2/logs/dare-fun-web-error.log|/var/log/dare_web-backup.log|https://daredate.in|200"
  "cheekydeck|/root/.pm2/logs/cheekydeck-error.log|/var/log/cheekydeck-backup.log|https://cheekydeck.com|200"
)

# A backup older than this is treated as a failure. 36h rather than 24h so a
# slow night or a clock skew does not cry wolf.
BACKUP_MAX_AGE_HOURS="${BACKUP_MAX_AGE_HOURS:-36}"

# Lines worth waking up for. Deliberately narrow: pm2 logs are noisy, and an
# alerter that fires on everything gets muted, which is worse than no alerter.
ERROR_PATTERN='(^|[^a-zA-Z])(Error|TypeError|ReferenceError|UnhandledPromiseRejection|FATAL|ECONNREFUSED|ETIMEDOUT)'
# Known-benign noise. `Server Reference ID` is bots POSTing junk Next.js server
# actions — see PLAN.md; it is not an app fault and fires constantly.
IGNORE_PATTERN='Server Reference ID|failed-to-find-server-action'

DRY=0; TEST=0
case "${1:-}" in --dry) DRY=1 ;; --test) TEST=1 ;; esac

mkdir -p "$STATE_DIR"
FINDINGS=""

add() { FINDINGS="${FINDINGS}$1"$'\n'; }

# ── Alerting ─────────────────────────────────────────────

send_alert() {
  local subject="$1" body="$2"
  MON_SUBJECT="$subject" MON_BODY="$body" MON_ENV="$ENV_FILE" python3 - <<'PYEOF'
import os, re, smtplib, ssl, sys
from email.message import EmailMessage

env = {}
for line in open(os.environ["MON_ENV"]):
    m = re.match(r"^([A-Z_]+)=(.*)$", line.strip())
    if m:
        env[m.group(1)] = m.group(2).strip().strip('"').strip("'")

missing = [k for k in ("SMTP_HOST", "SMTP_PORT", "SMTP_USER", "SMTP_PASS") if not env.get(k)]
if missing:
    print("cannot send alert, SMTP not configured:", ",".join(missing), file=sys.stderr)
    sys.exit(1)

to = (env.get("ADMIN_EMAILS") or env["SMTP_USER"]).split(",")[0].strip()
msg = EmailMessage()
msg["Subject"] = os.environ["MON_SUBJECT"]
msg["From"] = env.get("SMTP_FROM") or env["SMTP_USER"]
msg["To"] = to
msg.set_content(os.environ["MON_BODY"])

try:
    s = smtplib.SMTP(env["SMTP_HOST"], int(env["SMTP_PORT"]), timeout=25)
    s.starttls(context=ssl.create_default_context())
    s.login(env["SMTP_USER"], env["SMTP_PASS"])
    s.send_message(msg)
    s.quit()
    print(f"alert sent -> {to}")
except Exception as e:
    # Print rather than raise: a broken mailer must not also break the checks.
    print(f"alert FAILED: {type(e).__name__}: {e}", file=sys.stderr)
    sys.exit(1)
PYEOF
}

if [ "$TEST" = "1" ]; then
  send_alert "[monitor] test alert" "This is a test from scripts/monitor.sh on $(hostname). If you got this, alerting works."
  exit $?
fi

# ── 1. App errors since last run ─────────────────────────

# Byte offsets are remembered per log so each run only reads what is new. A log
# that SHRANK was rotated, so the offset is reset rather than seeking past the
# end and silently never reporting again.
scan_log() {
  local app="$1" log="$2"
  [ -f "$log" ] || return 0

  local off_file="$STATE_DIR/${app}.offset"
  local size prev
  size=$(stat -c%s "$log" 2>/dev/null || echo 0)

  # FIRST RUN: record where the log currently ends and report nothing. Without
  # this the first alert is the entire history of the log — 1,546 lines for
  # dare_web — which is noise, not a signal, and trains you to ignore the alert
  # on day one. Monitoring starts from now, not from the beginning of time.
  if [ ! -f "$off_file" ]; then
    echo "$size" > "$off_file"
    [ "$DRY" = "1" ] && echo "  ($app: baselined at $size bytes, reporting from next run)"
    return 0
  fi

  prev=$(cat "$off_file" 2>/dev/null || echo 0)
  [ "$size" -lt "$prev" ] && prev=0          # rotated
  echo "$size" > "$off_file"
  [ "$size" -le "$prev" ] && return 0        # nothing new

  local new hits count
  new=$(tail -c "+$((prev + 1))" "$log" 2>/dev/null)
  hits=$(printf '%s\n' "$new" | grep -E "$ERROR_PATTERN" 2>/dev/null | grep -vE "$IGNORE_PATTERN" 2>/dev/null)
  [ -z "$hits" ] && return 0

  count=$(printf '%s\n' "$hits" | grep -c . )
  add "APP ERRORS — $app ($count new)"
  # Here-string, NOT a pipe: `while` on the right of a pipe runs in a subshell,
  # so add() would mutate a throwaway copy of FINDINGS and the samples would
  # silently vanish from the email. They did, until this was fixed.
  while IFS= read -r l; do add "    ${l:0:180}"; done <<< "$(printf '%s\n' "$hits" | head -5)"
  add ""
}

# ── 2. Backup health ─────────────────────────────────────

check_backup() {
  local app="$1" log="$2" dir="/var/backups/$app"

  local newest
  newest=$(ls -1t "$dir"/* 2>/dev/null | head -1)
  if [ -z "$newest" ]; then
    add "BACKUP — $app: no backup files at all in $dir"; add ""; return
  fi

  local age_h
  age_h=$(( ( $(date +%s) - $(stat -c%Y "$newest") ) / 3600 ))
  if [ "$age_h" -gt "$BACKUP_MAX_AGE_HOURS" ]; then
    add "BACKUP — $app: newest backup is ${age_h}h old (limit ${BACKUP_MAX_AGE_HOURS}h)"
    add "    $newest"
    add ""
  fi

  # The scripts print [backup ERROR] and exit non-zero on any failure.
  if [ -f "$log" ]; then
    local errs
    errs=$(tail -50 "$log" 2>/dev/null | grep -F "[backup ERROR]" | tail -3)
    if [ -n "$errs" ]; then
      add "BACKUP — $app: errors in $log"
      while IFS= read -r l; do add "    ${l:0:180}"; done <<< "$errs"
      add ""
    fi
  fi
}

# ── 3. Reachability ──────────────────────────────────────

check_url() {
  local app="$1" url="$2" want="$3" got
  # No `|| echo 000` here: on failure curl BOTH writes 000 via -w AND exits
  # non-zero, so the fallback appended a second one and reported "000000".
  got=$(curl -s -o /dev/null -w '%{http_code}' --max-time 20 "$url" 2>/dev/null)
  got="${got:-000}"
  if [ "$got" != "$want" ]; then
    add "UNREACHABLE — $app: $url returned $got, expected $want"
    [ "$got" = "000" ] && add "    request did not complete (DNS, TLS or timeout)"
    add ""
  fi
}

for t in "${TARGETS[@]}"; do
  IFS='|' read -r app errlog baklog url want <<< "$t"
  scan_log "$app" "$errlog"
  check_backup "$app" "$baklog"
  check_url "$app" "$url" "$want"
done

# ── Report ───────────────────────────────────────────────

if [ -z "$FINDINGS" ]; then
  [ "$DRY" = "1" ] && echo "all clear"
  exit 0
fi

BODY="Checks failed on $(hostname) at $(date -u '+%Y-%m-%d %H:%M UTC').

$FINDINGS
--
scripts/monitor.sh · logs in /var/log/pm2/ and /var/log/*-backup.log"

if [ "$DRY" = "1" ]; then
  printf '%s\n' "$BODY"
  exit 0
fi

# One line summarising what broke, so the subject is readable on a phone.
SUMMARY=$(printf '%s\n' "$FINDINGS" | grep -oE '^[A-Z ]+—' | sort -u | tr -d '—' | tr '\n' ' ' | sed 's/ *$//')
send_alert "[monitor] ${SUMMARY:-issues} on $(hostname)" "$BODY"
