#!/usr/bin/env bash
set -euo pipefail

# Nightly Postgres backup for QRVeda.
#
# Runs ON THE SERVER, from cron. Four steps, in this order:
#
#   1. DUMP     pg_dump --format=custom (compressed, and restorable selectively)
#   2. VERIFY   restore the dump into a scratch database and count the rows
#   3. ROTATE   keep N daily copies on disk, delete older ones
#   4. SHIP     copy off the box, if a destination is configured
#
# Step 2 is the point. A backup that has never been restored is a hypothesis,
# not a backup — a truncated dump, a permissions change or a pg_dump/server
# version mismatch all produce a file of plausible size that restores into
# nothing. This script restores every dump it takes, compares the row counts
# against the live database, and fails loudly when they disagree.
#
# WITHOUT A DESTINATION THIS IS ONLY HALF A BACKUP. On-box copies protect
# against a bad migration, an accidental DELETE, or application corruption.
# They do NOT protect against losing the machine — which is the scenario that
# ends the business. See docs/BACKUPS.md for wiring up off-box storage.
#
#   ./scripts/backup.sh              # dump, verify, rotate, ship
#   ./scripts/backup.sh --no-verify  # skip the restore check (faster, weaker)
#   ./scripts/backup.sh --verify-only <file>   # check an existing dump

cd "$(dirname "$0")/.."

BACKUP_DIR="${BACKUP_DIR:-/var/backups/qrveda}"
# Local copies are a staging area and a fast-restore cache, not the archive —
# GCS holds the long tail. See docs/BACKUPS.md.
KEEP_DAILY="${KEEP_DAILY:-14}"
# Scratch database used for the restore check. Dropped and recreated each run;
# never point this at anything real.
VERIFY_DB="${VERIFY_DB:-qrveda_verify}"

# Bucket ROOT, read from .env below. The script appends <tier>/<app>/ itself,
# e.g. gs://sagar-projects-backups/daily/qrveda/qrveda-20260910-021500.dump
BACKUP_GCS_BASE=""
# Service-account key with write access to that bucket. The VM's own service
# account is devstorage.READ_ONLY, so it cannot upload — see docs/BACKUPS.md.
BACKUP_GCS_KEY=""

log() { printf '[backup %s] %s\n' "$(date -u +%H:%M:%S)" "$*"; }
die() { printf '[backup ERROR] %s\n' "$*" >&2; exit 1; }

# ── Configuration ────────────────────────────────────────

# DATABASE_URL from the environment, else from .env — same precedence the app
# and scripts/db-url.mjs use, so a backup can never quietly target a different
# database than the one being served.
from_env() {
  local key="$1" f line
  eval "local existing=\${$key:-}"
  if [ -n "${existing:-}" ]; then printf '%s' "$existing"; return; fi
  for f in .env.local .env; do
    [ -f "$f" ] || continue
    line="$(grep -m1 "^$key=" "$f" || true)"
    if [ -n "$line" ]; then
      line="${line#$key=}"; line="${line%\"}"; line="${line#\"}"
      printf '%s' "$line"; return
    fi
  done
}

DATABASE_URL="$(from_env DATABASE_URL)"
[ -n "$DATABASE_URL" ] || die "DATABASE_URL is not set (checked env, .env.local, .env)."

# Backup settings live in the same .env, so per-project config is in one place
# rather than spread across cron lines.
BACKUP_GCS_BASE="$(from_env BACKUP_GCS_BASE)"
APP_NAME="$(from_env BACKUP_APP_NAME)"; APP_NAME="${APP_NAME:-qrveda}"
BACKUP_GCS_KEY="$(from_env BACKUP_GCS_KEY)"
k="$(from_env KEEP_DAILY)"; [ -n "$k" ] && KEEP_DAILY="$k"

# Password-free rendering for the log.
REDACTED="$(printf '%s' "$DATABASE_URL" | sed -E 's#://([^:]+):[^@]*@#://\1:***@#')"

command -v pg_dump  >/dev/null || die "pg_dump not found."
command -v pg_restore >/dev/null || die "pg_restore not found."
command -v psql     >/dev/null || die "psql not found."

# --verify-only short-circuits everything else.
VERIFY_ONLY=""
NO_VERIFY=0
case "${1:-}" in
  --verify-only) VERIFY_ONLY="${2:?--verify-only needs a dump file}" ;;
  --no-verify)   NO_VERIFY=1 ;;
esac

# ── Verify: restore into a scratch DB and compare row counts ─────────────

# Tables whose row counts must survive a restore. Deliberately explicit rather
# than "every table": these are the ones whose loss is unrecoverable — you
# cannot reconstruct a customer's QR codes or their scan history from anywhere
# else, and subscriptions is the record of who has paid you.
COUNT_TABLES="users qr_codes scans subscriptions feedback"

row_counts() {
  # $1 = a libpq URL. Emits "table:count" lines, sorted, for diffing.
  local url="$1" t n
  for t in $COUNT_TABLES; do
    n="$(psql "$url" -tAc "select count(*) from $t" 2>/dev/null || echo MISSING)"
    printf '%s:%s\n' "$t" "$n"
  done
}

# Weaker fallback: parse the archive's table of contents.
#
# Used when the database role cannot create the scratch database. This catches
# the common failure modes — a truncated file, a corrupt or wrong-format
# archive, a missing table, a schema-only dump with no rows in it — but it does
# NOT prove the data restores cleanly. It is a real check, not a rubber stamp,
# and the log says which level ran so a downgrade is never silent.
verify_toc() {
  local dump="$1" toc missing=""

  toc="$(pg_restore --list "$dump" 2>/dev/null)" \
    || die "UNREADABLE ARCHIVE: pg_restore --list failed on $dump."

  local t
  for t in $COUNT_TABLES; do
    printf '%s' "$toc" | grep -qE "TABLE DATA public $t " || missing="$missing $t"
  done

  if [ -n "$missing" ]; then
    die "ARCHIVE INCOMPLETE: no TABLE DATA for:$missing"
  fi

  log "verified (archive level): readable, all $(printf '%s' "$COUNT_TABLES" | wc -w) critical tables carry data"
  log "  NOTE: this is the weaker check. To enable full restore verification:"
  log "        sudo -u postgres psql -c 'alter role <db-user> createdb'"
}

verify_dump() {
  local dump="$1"
  local admin_url scratch_url

  # Connect to `postgres` to create/drop the scratch database, keeping the same
  # credentials and host as the real URL.
  admin_url="$(printf '%s' "$DATABASE_URL" | sed -E 's#(/[^/?]+)(\?|$)#/postgres\2#')"
  scratch_url="$(printf '%s' "$DATABASE_URL" | sed -E "s#(/[^/?]+)(\?|\$)#/${VERIFY_DB}\2#")"

  # Creating a database needs the CREATEDB attribute, which an app role should
  # not necessarily have. Fall back rather than failing the whole backup: a
  # verified-at-archive-level dump beats no dump.
  if ! psql "$admin_url" -q -c "drop database if exists $VERIFY_DB" >/dev/null 2>&1 \
     || ! psql "$admin_url" -q -c "create database $VERIFY_DB" >/dev/null 2>&1; then
    log "cannot create scratch database — falling back to archive verification"
    verify_toc "$dump"
    return
  fi

  log "verifying: restoring into scratch database '$VERIFY_DB'"

  # --exit-on-error so a partial restore fails here rather than producing a
  # half-populated database that then "passes" a count check.
  if ! pg_restore --dbname="$scratch_url" --no-owner --no-privileges \
        --exit-on-error "$dump" >/dev/null 2>&1; then
    psql "$admin_url" -q -c "drop database if exists $VERIFY_DB" >/dev/null || true
    die "RESTORE FAILED for $dump — this backup is not usable."
  fi

  local live restored
  live="$(row_counts "$DATABASE_URL")"
  restored="$(row_counts "$scratch_url")"

  psql "$admin_url" -q -c "drop database if exists $VERIFY_DB" >/dev/null

  if [ "$live" != "$restored" ]; then
    printf 'live:\n%s\nrestored:\n%s\n' "$live" "$restored" >&2
    # Not necessarily corruption: rows written between the dump and this
    # comparison show up here too. Treated as a failure anyway — a backup you
    # cannot explain is one you cannot rely on.
    die "ROW COUNTS DIFFER between live and restored."
  fi

  log "verified: restore succeeded, row counts match"
  printf '%s\n' "$restored" | sed 's/^/    /'
}

if [ -n "$VERIFY_ONLY" ]; then
  [ -f "$VERIFY_ONLY" ] || die "no such dump: $VERIFY_ONLY"
  log "database: $REDACTED"
  verify_dump "$VERIFY_ONLY"
  exit 0
fi

# ── Dump ─────────────────────────────────────────────────

mkdir -p "$BACKUP_DIR"
STAMP="$(date -u +%Y%m%d-%H%M%S)"
DUMP="$BACKUP_DIR/qrveda-$STAMP.dump"

log "database: $REDACTED"
log "dumping to $DUMP"

# --format=custom is compressed and lets pg_restore pull single tables, which
# is what you actually want at 3am when one table was clobbered and the rest is
# fine. Write to .part first so a crashed dump is never mistaken for a good one
# by the rotation or upload steps.
pg_dump --dbname="$DATABASE_URL" --format=custom --no-owner --no-privileges \
        --file="$DUMP.part"
mv "$DUMP.part" "$DUMP"

SIZE="$(du -h "$DUMP" | cut -f1)"
log "dumped: $SIZE"

# A dump far smaller than the last one usually means something went wrong
# upstream (a dropped table, a permissions change). Cheap to notice here.
PREV="$(ls -1t "$BACKUP_DIR"/qrveda-*.dump 2>/dev/null | sed -n 2p || true)"
if [ -n "$PREV" ]; then
  new_b=$(stat -c%s "$DUMP"); old_b=$(stat -c%s "$PREV")
  if [ "$old_b" -gt 0 ] && [ "$new_b" -lt $((old_b / 2)) ]; then
    log "WARNING: this dump is less than half the size of the previous one"
    log "         now: $new_b bytes, previous: $old_b bytes ($PREV)"
  fi
fi

# ── Verify ───────────────────────────────────────────────

if [ "$NO_VERIFY" = "1" ]; then
  log "WARNING: --no-verify — this dump has NOT been proven restorable"
else
  verify_dump "$DUMP"
fi

# ── Rotate ───────────────────────────────────────────────

# Rotation happens AFTER verification, so a run that produces a bad dump never
# deletes a known-good older one.
log "rotating: keeping $KEEP_DAILY most recent"
ls -1t "$BACKUP_DIR"/qrveda-*.dump 2>/dev/null | tail -n +$((KEEP_DAILY + 1)) | while read -r old; do
  log "  removing $(basename "$old")"
  rm -f "$old"
done
log "on disk: $(ls -1 "$BACKUP_DIR"/qrveda-*.dump 2>/dev/null | wc -l) dumps, $(du -sh "$BACKUP_DIR" | cut -f1) total"

# ── Ship off the box ─────────────────────────────────────

if [ -z "$BACKUP_GCS_BASE" ]; then
  log "WARNING: BACKUP_GCS_BASE is not set — this backup exists ONLY on this"
  log "         machine. See docs/BACKUPS.md."
  exit 0
fi

if [ -n "$BACKUP_GCS_KEY" ]; then
  # The VM's default service account is devstorage.read_only and cannot upload,
  # so a dedicated key is activated for this command only.
  gcloud auth activate-service-account --key-file="$BACKUP_GCS_KEY" --quiet >/dev/null
fi

# Grandfather-father-son retention, expressed as three prefixes.
#
# The TIER COMES FIRST in the object path — daily/<app>/... rather than
# <app>/daily/... — on purpose. GCS lifecycle rules match on a literal prefix,
# so this shape needs exactly THREE rules for every app and every database:
#
#     prefix daily/    delete at  14 days
#     prefix weekly/   delete at  56 days   (8 weeks)
#     prefix monthly/  delete at 186 days   (6 months)
#
# The other way round would need three rules PER APP, and adding a fourth
# project would mean remembering to add three more by hand.
#
# The same file is uploaded to more than one prefix on the days they coincide.
# That is deliberate: each tier expires independently, so a weekly copy must not
# be a pointer to a daily one that is about to be deleted.
ship() {
  local tier="$1" dest="$BACKUP_GCS_BASE/$1/$APP_NAME/$(basename "$ARTEFACT")"
  gsutil -q cp "$ARTEFACT" "$dest" \
    || die "UPLOAD FAILED ($tier) — the backup is on disk at $ARTEFACT but not off the box."
  log "uploaded: $tier/$APP_NAME/$(basename "$ARTEFACT")"
}

ARTEFACT="$DUMP"
ship daily
# Sunday (date +%u == 7) also becomes that week's weekly copy.
if [ "$(date -u +%u)" = "7" ]; then ship weekly; fi
# The 1st also becomes that month's monthly copy.
if [ "$(date -u +%d)" = "01" ]; then ship monthly; fi
