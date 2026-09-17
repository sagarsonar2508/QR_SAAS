# Monitoring

Phase one, deliberately small: **one script, one cron entry, no service to run,
no account to sign up for, no SDK in any app.**

The gap this closes is not "we lack telemetry". It is that a failure and silence
look identical. Before this, a nightly backup that started failing, a checkout
that stopped working and a 500 on every page all produced exactly the same
signal: nothing.

| | |
|---|---|
| **Script** | [`scripts/monitor.sh`](../scripts/monitor.sh) — covers **all three** apps |
| **Schedule** | every 15 minutes, root's crontab |
| **Delivery** | email to `ADMIN_EMAILS` via authenticated SMTP |
| **Log** | `/var/log/qrveda-monitor.log` |
| **State** | `/var/lib/qrveda-monitor/<app>.offset` |

It emails **only when something is wrong**. A quiet inbox means the checks
passed.

## What it checks

| Check | Fires when |
|---|---|
| **App errors** | new matching lines in an app's pm2 error log since the last run |
| **Backup age** | newest dump in `/var/backups/<app>` is older than 36h |
| **Backup errors** | `[backup ERROR]` in a backup log |
| **Reachability** | a site doesn't return its expected status |

Reachability uses `qrveda.com/zzzzzzz` → expects **404**. A code that cannot
exist is the better probe: 404 proves the redirect route is mounted *and* the
database lookup ran. A 5xx or 000 means the app or its database is down — which
is the thing worth waking up for, since every printed QR code depends on it.

## Design decisions worth knowing

**Email goes through authenticated SMTP on port 587, not `MAILTO`.** GCP blocks
outbound port 25, so cron's built-in mailer and the local `sendmail` cannot
deliver to the internet at all. Anything relying on them fails silently. The
script talks to Gmail directly with the credentials already in QRVeda's `.env`.

**First run baselines, it does not report.** Each log's byte offset is recorded
and nothing is sent. Without this the first email would have been the entire
history of every log — 1,546 lines for dare_web alone. An alert that arrives as
a wall of stale noise trains you to ignore it on day one.

**A shrinking log means rotation**, so the offset resets to 0 rather than
seeking past the end and silently never reporting again.

**The error pattern is deliberately narrow**, and known-benign noise is filtered
out — notably `Server Reference ID`, which is bots POSTing junk Next.js server
actions. An alerter that fires on everything gets muted, and a muted alerter is
worse than none.

**36h, not 24h,** for backup age — a slow night or clock skew should not cry
wolf.

**pm2 log paths are not uniform** and are taken from `pm2 jlist`, not guessed:
qrveda was started with an explicit path under `/var/log/pm2/`, the other two
use pm2's default under `/root/.pm2/logs/`. If an app is ever restarted with
different logging, re-check with:

```bash
pm2 jlist | python3 -c 'import json,sys;[print(a["name"], a["pm2_env"]["pm_err_log_path"]) for a in json.load(sys.stdin)]'
```

## Verified

Every check was exercised against real failures on 2026-09-10, not just
asserted:

| Test | Result |
|---|---|
| Injected `TypeError` into a pm2 log | reported, with the line |
| Injected known bot noise | correctly ignored |
| Backup aged to 40h | `newest backup is 40h old (limit 36h)` |
| Empty backup directory | `no backup files at all` |
| URL pointed at a dead host | `returned 000, expected 200` |
| Real alert email | delivered |

Two bugs were found and fixed by running it:

- Sample error lines never appeared in the digest. `while` on the right of a
  pipe runs in a subshell, so `add()` was mutating a throwaway copy of the
  findings. Fixed with a here-string.
- Reachability reported `000000`. On failure curl **both** writes `000` via
  `-w` and exits non-zero, so the `|| echo 000` fallback appended a second one.

## Running it by hand

```bash
./scripts/monitor.sh --dry    # print findings, send nothing
./scripts/monitor.sh --test   # send a test alert and exit
./scripts/monitor.sh          # what cron runs
```

## Known gaps

- **No stack traces or grouping.** You get "something threw in cheekydeck" plus
  a few log lines, not a deduplicated issue with a stack. That is the upgrade
  path, below.
- **The monitor is not itself monitored.** If cron stops, or SMTP credentials
  expire, alerts stop and nothing says so. A dead-man's-switch (healthchecks.io
  free tier, one curl per run) is the cheap fix.
- **No client-side errors.** Browser exceptions are invisible.
- **No history.** Alerts are emails, not a queryable record.

## When to replace this

When any of these become true, move to **Sentry** (free tier: 5k errors/month)
or self-hosted GlitchTip, and delete most of this script — keep the backup-age
and reachability checks, which Sentry does not do.

- You are debugging a user-reported bug and want the stack trace
- The same error is arriving repeatedly and you want it grouped and silenced
- You want to know which deploy introduced an error
- You have real users and "which of them hit this?" starts to matter

Right now, with a handful of users across all three sites, none of those hold.
