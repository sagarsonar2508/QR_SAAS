# Backups

The database holds the only irreplaceable thing QRVeda owns. QR codes, their
destinations, scan history and subscription records cannot be reconstructed from
anywhere else — and every printed sticker in the world points at a row in
`qr_codes`. Losing it does not mean losing data; it means every customer's
printed material stops working permanently.

## What runs today

| | |
|---|---|
| **Script** | [`scripts/backup.sh`](../scripts/backup.sh) — runs on the server |
| **Schedule** | 02:15 IST nightly, via root's crontab (which sets `CRON_TZ=Asia/Kolkata`) |
| **Location** | `/var/backups/qrveda/qrveda-<UTC timestamp>.dump`, then GCS |
| **Format** | `pg_dump --format=custom` — compressed, and restorable table-by-table |
| **Retention** | 14 on disk; **14 daily / 8 weekly / 6 monthly** in GCS |
| **Log** | `/var/log/qrveda-backup.log` |
| **Size** | ~28 KB per dump at current volume |

Four steps in order — **dump, verify, rotate, ship**. Rotation happens *after*
verification on purpose: a run that produces a bad dump must never delete a
known-good older one.

## Verification, and why it is the point

A backup that has never been restored is a hypothesis. A truncated dump, a
permissions change, or a pg_dump/server version mismatch all produce a file of
plausible size that restores into nothing. So every dump is checked immediately,
at one of two levels.

**Full (preferred).** Restore into a throwaway database, count rows in `users`,
`qr_codes`, `scans`, `subscriptions` and `feedback`, and compare against live.
Requires the database role to hold `CREATEDB`.

**Archive-level (current fallback).** Parse the archive's table of contents with
`pg_restore --list` and confirm every critical table carries `TABLE DATA`. This
catches truncation, corruption, a wrong-format file, a missing table and a
schema-only dump. It does *not* prove the data restores cleanly.

The script tries full first and falls back automatically, logging which level
ran — a downgrade is never silent.

**Currently running at archive level**, because the `sagar` role lacks
`CREATEDB`. To upgrade, once, on the server:

```bash
sudo -u postgres psql -c 'alter role sagar createdb'
```

Nothing else changes; the next nightly run picks it up.

### The verifier is itself tested

Confirmed on 2026-09-10 against real dumps:

| Input | Result | Exit |
|---|---|---|
| Good dump | passes, 5/5 tables carry data | 0 |
| Truncated to 8 KB | `UNREADABLE ARCHIVE` | 1 |
| 28 KB of `/dev/urandom` | `UNREADABLE ARCHIVE` | 1 |
| Missing file | `no such dump` | 1 |

Non-zero exits matter: cron mails on them if `MAILTO` is set.

Re-check any dump by hand:

```bash
./scripts/backup.sh --verify-only /var/backups/qrveda/qrveda-20260910-070402.dump
```

## Off the box

Working since 2026-09-10. The script still warns loudly on any run where no
destination is configured, because on-box backups survive a bad migration but
not the loss of the VM.

### Option A — GCS (configured)

Bucket: **`gs://sagar-projects-backups`**, region `asia-south1`, uniform access,
public access prevention on. Shared by all three projects.

Objects are laid out **tier first**:

```
gs://sagar-projects-backups/
  daily/   qrveda/…  dare_web/…  cheekydeck/…
  weekly/  qrveda/…  dare_web/…  cheekydeck/…
  monthly/ qrveda/…  dare_web/…  cheekydeck/…
```

That ordering is the whole trick. GCS lifecycle rules match a literal prefix, so
this shape needs **three rules total** — not three per app:

| Action | Age | Prefix |
|---|---|---|
| Delete | 14 | `daily/` |
| Delete | 56 | `weekly/` (8 weeks) |
| Delete | 186 | `monthly/` (6 months) |

`<app>/daily/` would have needed three rules per project, and a fourth project
would mean remembering to add three more by hand.

Each script uploads to `daily/` every night, **also** to `weekly/` on Sundays,
and **also** to `monthly/` on the 1st. The file is genuinely copied to each
prefix rather than linked — the tiers expire independently, so a weekly copy
must not depend on a daily one that is about to be deleted.

Why grandfather-father-son rather than 60 flat: 60 consecutive daily copies of
near-identical data is the least useful shape per byte. 14/8/6 gives you
yesterday, last week and six months back for roughly a third of the storage.

**Authentication — no key exists, deliberately.**

Service-account keys are blocked in this GCP org by the `Secure by Default`
policy `iam.disableServiceAccountKeyCreation`. That turned out to be the better
path anyway: instead of a long-lived credential sitting on disk, the VM
authenticates as *itself*.

Two separate gates had to be opened, and both are required — one without the
other fails:

| Gate | Where | Value |
|---|---|---|
| Access scope (caps the token) | VM → Edit → Access scopes → Storage | `Read Write` |
| IAM role (grants permission) | Bucket → Permissions | Object Creator + Object Viewer |

The scope change needs the instance **stopped**, so it cost ~2 minutes of
downtime on 2026-09-10. Check the external IP is *reserved* before ever doing
this again — an ephemeral IP is released on stop, which would break DNS for
every site on the box. `web-server1-ip` is reserved, so it survived.

The principal is `541950759056-compute@developer.gserviceaccount.com`, the VM's
own identity. A separate `sagar-projects-backup` service account was created
first and is **not** used — it is not attached to the VM, so its grants do
nothing. It can be deleted.

**Neither role includes delete.** `storage.objects.delete` lives in Object
Admin, which is deliberately not granted: a compromised server can add backups
and read them, but cannot destroy them. Verified — `gsutil rm` on a test object
is refused. Only the lifecycle rules remove anything.

`BACKUP_GCS_KEY` is left empty in every env file, which makes the scripts skip
`gcloud auth activate-service-account` and fall through to instance credentials.

An upload failure exits non-zero and says the dump is on disk but not off the
box — it never silently passes.

### Why keep local copies at all

The bucket is the archive; the disk is not redundant with it.

- **The upload needs something to upload.** The dump is written locally first,
  then shipped. Local retention is that staging area.
- **Restores are instant.** No download, no credentials, no network.
- **It is the fallback when GCS is the thing that is broken** — expired key,
  revoked permission, billing problem. Those are exactly the moments you find
  out, and having 14 days on disk means you are not also blind.
- For **dare_web and cheekydeck** the local copy is already off-database: the
  data lives on Atlas, so a copy on the VM is on entirely separate
  infrastructure.

For **QRVeda** it is weaker — `/var/backups` and the Postgres data directory are
both on `/dev/sda1`, so the disk copy protects against a bad migration or a
mistaken `DELETE`, not against losing the VM. That is precisely why GCS matters
more for QRVeda than for the other two.

### Option B — pull to the Mac (works today, no setup)

[`deploymentScript/fetch-backups.sh`](../deploymentScript/fetch-backups.sh)
rsyncs dumps down to `~/backups/qrveda` over the SSH access the deploy script
already uses.

```bash
./deploymentScript/fetch-backups.sh            # anything new
./deploymentScript/fetch-backups.sh --latest   # newest only
```

Dumps land **outside the repo** deliberately — they hold real customer data and
a stray `git add -A` must not be able to reach them.

This is a genuine second copy, but it only runs when the laptop is on. Treat it
as a stopgap until Option A is wired up, not as the schedule.

## Restoring

Into a scratch database first, always — never straight over production:

```bash
createdb qrveda_restore
pg_restore --dbname=qrveda_restore --no-owner --no-privileges <dump>
```

One table only (the common case — something clobbered one table and the rest is
fine, which is why `--format=custom` is used):

```bash
pg_restore --dbname=qrveda_restore --no-owner --no-privileges \
           --table=qr_codes <dump>
```

Over production, only after checking the scratch copy holds what you expect:

```bash
pm2 stop qrveda        # nothing should be writing during a restore
pg_restore --dbname="$DATABASE_URL" --clean --if-exists \
           --no-owner --no-privileges <dump>
pm2 start qrveda
```

## Known gaps

- **Archive-level verification only** until the `CREATEDB` grant is applied.
- **Uploads are not backed up.** Customer PDFs and images go to `uploads/` on
  local disk, outside the database, and this script does not touch them. There
  is currently no `uploads/` directory in production — nothing has been uploaded
  yet — so nothing is at risk *today*. It becomes real the first time a
  restaurant uploads a menu. Moving uploads to object storage is the fix and is
  tracked in PLAN.md §3.4.
- **No monitoring.** A silently failing cron job is indistinguishable from a
  working one until you look. `MAILTO` in the crontab, or an uptime check on the
  log's freshness, would close this.
