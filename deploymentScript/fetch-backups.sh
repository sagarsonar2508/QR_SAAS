#!/usr/bin/env bash
set -euo pipefail

# Pull QRVeda's Postgres dumps from the server down to this machine.
#
# WHY THIS EXISTS: scripts/backup.sh runs nightly on the server and can ship to
# GCS, but the VM's own service account is devstorage.READ_ONLY and cannot
# upload — enabling that needs a key you have to create (docs/BACKUPS.md).
# Until then, on-box dumps survive a bad migration but not the loss of the VM,
# which is the failure that actually ends the business.
#
# This closes that gap with something available today: the Mac already has SSH
# access, so it pulls. The obvious limitation is that it only runs when this
# machine is on — so it is a real second copy, not a schedule you can rely on.
# It is a stopgap for the weeks before GCS is wired up, not the destination.
#
# Uses the same deploy.env as deploy-local.sh, so there is one place that knows
# where the server is.
#
#   ./deploymentScript/fetch-backups.sh          # pull anything new
#   ./deploymentScript/fetch-backups.sh --latest # pull only the newest dump

cd "$(dirname "$0")/.."

CONFIG="deploymentScript/deploy.env"
if [ -f "$CONFIG" ]; then
  # shellcheck disable=SC1090
  . "$CONFIG"
else
  echo "ERROR: $CONFIG not found — see deploy.env.example." >&2
  exit 1
fi

: "${SSH_TARGET:?SSH_TARGET is not set in $CONFIG}"
SSH_PORT="${SSH_PORT:-22}"
REMOTE_BACKUP_DIR="${REMOTE_BACKUP_DIR:-/var/backups/qrveda}"

# Deliberately OUTSIDE the repo: these are production dumps with real customer
# data, and a stray `git add -A` should not be able to reach them.
LOCAL_DIR="${LOCAL_BACKUP_DIR:-$HOME/backups/qrveda}"

mkdir -p "$LOCAL_DIR"

echo "Pulling from $SSH_TARGET:$REMOTE_BACKUP_DIR"
echo "         to $LOCAL_DIR"
echo ""

if [ "${1:-}" = "--latest" ]; then
  newest="$(ssh -p "$SSH_PORT" "$SSH_TARGET" \
    "ls -1t $REMOTE_BACKUP_DIR/qrveda-*.dump 2>/dev/null | head -1")"
  [ -n "$newest" ] || { echo "No dumps on the server yet." >&2; exit 1; }
  rsync -az --progress -e "ssh -p $SSH_PORT" "$SSH_TARGET:$newest" "$LOCAL_DIR/"
else
  # --ignore-existing: dumps are immutable once written, so anything already
  # here is already correct and re-downloading it is wasted transfer.
  rsync -az --progress --ignore-existing -e "ssh -p $SSH_PORT" \
    "$SSH_TARGET:$REMOTE_BACKUP_DIR/qrveda-*.dump" "$LOCAL_DIR/"
fi

echo ""
echo "Local copies: $(ls -1 "$LOCAL_DIR"/qrveda-*.dump 2>/dev/null | wc -l | tr -d ' ') dumps, $(du -sh "$LOCAL_DIR" | cut -f1)"
echo "Newest:       $(basename "$(ls -1t "$LOCAL_DIR"/qrveda-*.dump 2>/dev/null | head -1)")"
echo ""
echo "Restore into a local database with:"
echo "  createdb qrveda_restore"
echo "  pg_restore --dbname=qrveda_restore --no-owner --no-privileges <dump>"
