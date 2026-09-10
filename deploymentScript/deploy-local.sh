#!/usr/bin/env bash
set -euo pipefail

# Build QRVeda on THIS machine, ship the finished build to the server.
#
# Why: `next build` is memory-hungry (webpack holds the whole module graph in
# RAM). On a small VPS it either takes many minutes or gets OOM-killed. The
# build output, though, is just a few MB of JavaScript — trivial to upload. So
# the expensive part happens on the Mac and the server gets only the artifact.
#
# The server still runs `git pull` (for package.json, next.config.ts, public/
# and — importantly — drizzle/*.sql) and still installs dependencies, because
# the packages listed in `serverExternalPackages` are NOT bundled: they are
# require()'d at runtime from the SERVER's node_modules.
#
# Adapted from the sibling scripts on the same box (cheekydeck, dare_web), with
# four differences that matter for this app:
#
#   1. MIGRATIONS. QRVeda has hand-written SQL in drizzle/ and a runner
#      (`npm run db:migrate`). They are applied BEFORE the new build is swapped
#      in, so the new code never serves against an old schema.
#   2. NO LOCKFILE IN GIT. package-lock.json is gitignored here, so the sibling
#      scripts' "hash the lockfile, then npm ci" trick cannot work — a pull
#      never changes a file that is not tracked. This hashes package.json and
#      runs `npm install` instead. See the note at that step.
#   3. NO NEXT_PUBLIC_* VARIABLES. Nothing is baked into the client bundle, so
#      a local build cannot leak local config into the live site. There is still
#      a guard below in case that ever stops being true.
#   4. THE REDIRECT PATH IS SMOKE-TESTED after the reload. Per PLAN.md the
#      redirect endpoint is the one thing that must never break — every printed
#      QR code in the world points at it — so the deploy verifies it answers
#      before reporting success.
#
# Uploads live in uploads/ on the server and are NOT touched by this script.
# They are also not backed up; see PLAN.md §3.4.
#
# Usage:
#   cp deploymentScript/deploy.env.example deploymentScript/deploy.env   # once
#   ./deploymentScript/deploy-local.sh

BRANCH="main"

LIVE_DIR=".next"
BUILD_DIR=".next-build"
PREV_DIR=".next-prev"
PKG_HASH_FILE=".deploy-pkg-hash"
TARBALL="next-build.tar.gz"

# Run from the repo root regardless of where the script was invoked from.
cd "$(dirname "$0")/.."

CONFIG="deploymentScript/deploy.env"
if [ -f "$CONFIG" ]; then
  # shellcheck disable=SC1090
  . "$CONFIG"
else
  echo "ERROR: $CONFIG not found."
  echo "       cp deploymentScript/deploy.env.example $CONFIG  — then fill it in."
  exit 1
fi

: "${SSH_TARGET:?SSH_TARGET is not set in $CONFIG}"
: "${REMOTE_DIR:?REMOTE_DIR is not set in $CONFIG}"
SSH_PORT="${SSH_PORT:-22}"
# PM2 process name on the server. daredate.in is "dare-fun-web", cheekydeck is
# "cheekydeck", this one is "qrveda".
APP_NAME="${APP_NAME:-qrveda}"
# Port this app listens on. daredate.in uses 3000, cheekydeck 3002, qrveda 3003.
APP_PORT="${APP_PORT:-3003}"
# Public URL used for the post-deploy smoke test.
HEALTH_URL="${HEALTH_URL:-https://qrveda.com}"
# Set SKIP_MIGRATE=1 to deploy code without touching the database. Rarely right
# — only when a migration is known-bad and you are rolling code forward anyway.
SKIP_MIGRATE="${SKIP_MIGRATE:-0}"

SSH_OPTS=(-p "$SSH_PORT")
RSYNC_SSH="ssh -p $SSH_PORT"

echo ""
echo "=========================================="
echo " Deploying $APP_NAME (built locally)"
echo "   to $SSH_TARGET:$REMOTE_DIR"
echo "=========================================="

# ---------------------------------------------------------------------------
echo ""
echo "==> [1/7] Pre-flight"

# QRVeda has no NEXT_PUBLIC_* variables: the Razorpay key id reaches the browser
# from the checkout API response, not from the bundle, and every other secret is
# server-side. That means a local build cannot bake local config into the live
# site — the failure mode the sibling scripts spend fifty lines guarding against.
#
# This check exists so that stops being true LOUDLY rather than silently.
PUBLIC_REFS="$(grep -rlE 'process\.env\.NEXT_PUBLIC_' app src 2>/dev/null || true)"
if [ -n "$PUBLIC_REFS" ]; then
  echo ""
  echo "ERROR: this repo now reads NEXT_PUBLIC_* variables:"
  echo "$PUBLIC_REFS" | sed 's/^/         /'
  echo ""
  echo "       Those are INLINED INTO THE BUNDLE at build time, and this script"
  echo "       builds on your machine. Without a .env.production.local holding"
  echo "       production values you would ship your local ones into the live"
  echo "       HTML."
  echo ""
  echo "       Add the production values to .env.production.local, then port the"
  echo "       resolve_public_env() check from"
  echo "       ../cheekydeck/deploymentScript/deploy-local.sh into this script"
  echo "       before deploying again. Nothing was built or uploaded."
  exit 1
fi
echo "    No NEXT_PUBLIC_* in the source — nothing is baked into the bundle."

# Deploying a dirty tree means shipping a build that matches no commit, which
# makes "what is actually live?" unanswerable later.
LOCAL_DIRTY="$(git status --porcelain --untracked-files=no || true)"
if [ -n "$LOCAL_DIRTY" ]; then
  echo ""
  echo "WARNING: uncommitted changes to tracked files here:"
  echo "$LOCAL_DIRTY" | sed 's/^/         /'
  echo ""
  echo "         The BUILD comes from your working tree, but the server pulls"
  echo "         $BRANCH from git. Anything above is in the bundle and not in the"
  echo "         source the server checks out."
  printf "         Continue anyway? [y/N] "
  read -r reply
  case "$reply" in
    [yY]*) ;;
    *) echo "         Aborted. Nothing was built or uploaded."; exit 1 ;;
  esac
fi

echo "    Local HEAD: $(git rev-parse --short HEAD) on $(git rev-parse --abbrev-ref HEAD)"

# ---------------------------------------------------------------------------
echo ""
echo "==> [2/7] Building into $BUILD_DIR (this machine, not the server)"
rm -rf "$BUILD_DIR"
NEXT_DIST_DIR="$BUILD_DIR" npm run build

# ---------------------------------------------------------------------------
echo ""
echo "==> [3/7] Packing the build"
# .next/cache is build-time only (webpack/SWC caches) and is by far the biggest
# part of the directory — it must not be shipped.
rm -rf "${BUILD_DIR:?}/cache"
rm -f "$TARBALL"
# COPYFILE_DISABLE stops macOS bsdtar writing AppleDouble/xattr headers that
# GNU tar on the server cannot read — without it the unpack step prints a
# "LIBARCHIVE.xattr.com.apple.provenance" warning per file and buries the
# output that matters.
COPYFILE_DISABLE=1 tar -czf "$TARBALL" "$BUILD_DIR"
echo "    $TARBALL — $(du -h "$TARBALL" | awk '{print $1}')"

# ---------------------------------------------------------------------------
echo ""
echo "==> [4/7] Uploading to $SSH_TARGET"
rsync -az --progress -e "$RSYNC_SSH" "$TARBALL" "$SSH_TARGET:$REMOTE_DIR/$TARBALL"

# ---------------------------------------------------------------------------
echo ""
echo "==> [5/7] Pulling, installing and migrating on the server"

# Everything below runs ON THE SERVER. Quoted heredoc: expansions happen there,
# so the values we want from here are passed in explicitly on the command line.
ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "APP_NAME='$APP_NAME' REMOTE_DIR='$REMOTE_DIR' BRANCH='$BRANCH' \
   LIVE_DIR='$LIVE_DIR' BUILD_DIR='$BUILD_DIR' PREV_DIR='$PREV_DIR' \
   PKG_HASH_FILE='$PKG_HASH_FILE' TARBALL='$TARBALL' APP_PORT='$APP_PORT' \
   SKIP_MIGRATE='$SKIP_MIGRATE' bash -s" <<'REMOTE'
set -euo pipefail
cd "$REMOTE_DIR"

echo "    [server] Pulling $BRANCH (source, config, public assets, migrations)"
git fetch origin

# `next build` rewrites tsconfig.json (it injects the Next TS plugin and the
# generated-types path, which points at whatever distDir was used), and
# TypeScript rewrites tsconfig.tsbuildinfo on every run. Both are tracked, so
# every build the server ever ran left them dirty — and a dirty tracked file
# aborts the pull. They are generated, never hand-edited: discard them.
# Building locally means the server stops dirtying them from here on.
for f in tsconfig.json tsconfig.tsbuildinfo next-env.d.ts; do
  if git ls-files --error-unmatch "$f" >/dev/null 2>&1 && ! git diff --quiet -- "$f"; then
    echo "    [server]   discarding generated changes to $f"
    git checkout -- "$f"
  fi
done

# Anything still dirty is a real edit somebody made on the server. Stop and say
# so rather than quietly throwing their work away.
DIRTY="$(git status --porcelain --untracked-files=no)"
if [ -n "$DIRTY" ]; then
  echo ""
  echo "ERROR: the server has uncommitted changes to tracked files:"
  echo "$DIRTY"
  echo ""
  echo "       These are NOT build artifacts, so this script will not touch them."
  echo "       On the server, either keep them:   git stash"
  echo "                        or discard them:  git checkout -- <file>"
  echo "       then re-run the deploy. Nothing was swapped; the site is untouched."
  exit 1
fi

git checkout "$BRANCH"
git pull origin "$BRANCH"
echo "    [server] Now at $(git rev-parse --short HEAD)"

# Dependencies. NOTE: package-lock.json is gitignored in this repo, so it never
# arrives from a pull and `npm ci` would install from whatever lockfile happens
# to be sitting on the server — which is not reproducible and not what the local
# build was compiled against. Hashing package.json and running `npm install` is
# the honest version of the same idea: it reacts to a real dependency change and
# resolves it here.
#
# The proper fix is to commit package-lock.json and switch this back to
# `npm ci`; it is listed under housekeeping in PLAN.md.
echo "    [server] Installing dependencies if package.json changed"
NEW_PKG_HASH="$(sha1sum package.json | awk '{print $1}')"
if [ ! -f "$PKG_HASH_FILE" ] || [ "$(cat "$PKG_HASH_FILE")" != "$NEW_PKG_HASH" ]; then
  echo "    [server] package.json changed — running npm install"
  npm install --no-audit --no-fund
  echo "$NEW_PKG_HASH" > "$PKG_HASH_FILE"
else
  echo "    [server] package.json unchanged — skipping install"
fi

# Migrations run BEFORE the swap, so the new bundle never serves against an old
# schema. The runner is idempotent — it applies only drizzle/*.sql files absent
# from the _migrations table — so this is a no-op on a code-only deploy.
#
# Ordering caveat: files are applied in FILENAME order, and there are currently
# two 0003_* migrations. Both are already applied in production, so it is inert
# today, but renaming one to 0004_ is on the housekeeping list in PLAN.md.
if [ "$SKIP_MIGRATE" = "1" ]; then
  echo "    [server] SKIP_MIGRATE=1 — not touching the database"
else
  echo "    [server] Applying database migrations"
  npm run db:migrate
fi

echo "    [server] Unpacking the uploaded build"
rm -rf "$BUILD_DIR"
tar -xzf "$TARBALL"
rm -f "$TARBALL"

# The bundle was compiled against the Mac's node_modules, but the packages in
# `serverExternalPackages` (next.config.ts) are require()'d at runtime from the
# server's. A major-version drift between the two is the one way a locally built
# bundle can pass every check here and still throw at runtime, so say so out loud.
#
# `sharp` matters most: it ships a per-platform native binary, so a Mac build
# tells you nothing about whether the Linux one is present and loadable.
echo "    [server] Runtime versions of externalised packages:"
# Resolve the package's entry point, then walk up to the package.json that owns
# it. The obvious `require('<pkg>/package.json')` cannot be used: a package with
# an `exports` map that does not list ./package.json makes Node refuse the path
# outright (ERR_PACKAGE_PATH_NOT_EXPORTED). A check that cries wolf is worse
# than no check — it trains you to ignore a real MISSING.
for pkg in postgres bcryptjs sharp; do
  ver="$(node -p "(()=>{try{const f=require('fs'),p=require('path');let d=p.dirname(require.resolve('$pkg'));for(;;){const j=p.join(d,'package.json');if(f.existsSync(j)){const m=JSON.parse(f.readFileSync(j,'utf8'));if(m.name==='$pkg')return m.version}const u=p.dirname(d);if(u===d)break;d=u}return 'MISSING'}catch(e){return 'MISSING'}})()" 2>/dev/null || echo '?')"
  echo "    [server]   $pkg $ver"
done
REMOTE

# ---------------------------------------------------------------------------
echo ""
echo "==> [6/7] Swapping the build in and reloading"

ssh "${SSH_OPTS[@]}" "$SSH_TARGET" \
  "APP_NAME='$APP_NAME' REMOTE_DIR='$REMOTE_DIR' \
   LIVE_DIR='$LIVE_DIR' BUILD_DIR='$BUILD_DIR' PREV_DIR='$PREV_DIR' \
   APP_PORT='$APP_PORT' bash -s" <<'REMOTE'
set -euo pipefail
cd "$REMOTE_DIR"

echo "    [server] Swapping $BUILD_DIR into $LIVE_DIR"
rm -rf "$PREV_DIR"
if [ -d "$LIVE_DIR" ]; then
  mv "$LIVE_DIR" "$PREV_DIR"
fi
mv "$BUILD_DIR" "$LIVE_DIR"

echo "    [server] Reloading PM2"
if pm2 describe "$APP_NAME" > /dev/null 2>&1; then
  pm2 reload "$APP_NAME" --update-env
else
  echo "    [server] PM2 process '$APP_NAME' not found — starting fresh"
  PORT="$APP_PORT" pm2 start npm --name "$APP_NAME" -- start
fi
pm2 save --force > /dev/null
pm2 status "$APP_NAME"
REMOTE

# ---------------------------------------------------------------------------
echo ""
echo "==> [7/7] Smoke-testing the redirect path"

# PLAN.md's architecture principle: "the redirect path is sacred". Every printed
# QR code points at {domain}/{code}, so this is the one endpoint whose breakage
# is unrecoverable — the stickers are already on the tables.
#
# A code that cannot exist is the right probe: a 404 proves the route is mounted
# AND that the database lookup ran. A 502/500 means the app is down or the
# database is unreachable, which is exactly what we need to catch here rather
# than from a customer.
sleep 3
PROBE="$HEALTH_URL/zzzzzzz"
CODE="$(curl -s -o /dev/null -w '%{http_code}' --max-time 15 "$PROBE" || echo '000')"
echo "    GET $PROBE -> $CODE"

if [ "$CODE" = "404" ]; then
  echo "    Redirect path is answering."
else
  echo ""
  echo "WARNING: expected 404 from the redirect path, got $CODE."
  if [ "$CODE" = "000" ]; then
    echo "         The request did not complete at all (DNS, TLS or timeout)."
  else
    echo "         5xx means the app or its database is unhappy."
  fi
  echo ""
  echo "         Check:    ssh -p $SSH_PORT $SSH_TARGET 'pm2 logs $APP_NAME --lines 50'"
  echo "         Rollback: ssh -p $SSH_PORT $SSH_TARGET 'cd $REMOTE_DIR && rm -rf $LIVE_DIR && mv $PREV_DIR $LIVE_DIR && pm2 reload $APP_NAME'"
  echo ""
  echo "         The previous build is still on the server as $PREV_DIR."
fi

# ---------------------------------------------------------------------------
echo ""
echo "==> Cleaning up locally"
rm -f "$TARBALL"
rm -rf "$BUILD_DIR"

echo ""
echo "=========================================="
echo " Deployment complete"
echo "=========================================="
echo ""
echo "Tail logs:  ssh -p $SSH_PORT $SSH_TARGET 'pm2 logs $APP_NAME'"
echo "Rollback:   ssh -p $SSH_PORT $SSH_TARGET 'cd $REMOTE_DIR && rm -rf $LIVE_DIR && mv $PREV_DIR $LIVE_DIR && pm2 reload $APP_NAME'"
echo ""
