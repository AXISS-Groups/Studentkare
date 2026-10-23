#!/bin/sh
# Restore drill: restore the newest backup into a scratch database, run smoke
# queries, report, and drop the scratch database. docs/guides/backups.md.
#
#   RESTORE_ADMIN_URL      required  a server/role that may CREATE DATABASE, e.g.
#                                    postgresql://postgres:pw@scratch-host:5432/postgres
#                                    Never the production server: use a scratch instance.
#   BACKUP_DIR             /backups  where to look for studentkare-*.dump
#   BACKUP_S3_URI          (unset)   when set, the newest dump is fetched from here instead
#   BACKUP_S3_ENDPOINT_URL (unset)   S3-compatible endpoint
#   RESTORE_FILE           (unset)   restore this file instead of the newest
#   RESTORE_MAX_AGE_HOURS  48        fail when the newest backup is older than this
#   RESTORE_KEEP=1                   keep the scratch database for inspection
#
# Exit 0 = the backup restored and the smoke queries passed. Prints no secrets.
set -eu

: "${RESTORE_ADMIN_URL:?Set RESTORE_ADMIN_URL to a scratch Postgres server (not production)}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_S3_URI="${BACKUP_S3_URI:-}"
BACKUP_S3_ENDPOINT_URL="${BACKUP_S3_ENDPOINT_URL:-}"
RESTORE_MAX_AGE_HOURS="${RESTORE_MAX_AGE_HOURS:-48}"
WORK="$(mktemp -d)"
SCRATCH_DB="restore_check_$(date -u +%Y%m%d%H%M%S)"

log() { echo "[restore-check] $*"; }
fail() { echo "[restore-check] FAIL: $*" >&2; exit 1; }

aws_s3() {
  if [ -n "$BACKUP_S3_ENDPOINT_URL" ]; then aws --endpoint-url "$BACKUP_S3_ENDPOINT_URL" s3 "$@"; else aws s3 "$@"; fi
}

# The admin URL with its database swapped for the scratch one (keeps ?sslmode=...).
scratch_url() {
  printf '%s' "$RESTORE_ADMIN_URL" | sed -E "s#^(postgres(ql)?://[^/]+)/[^?]*#\1/${SCRATCH_DB}#"
}

cleanup() {
  status=$?
  if [ "${RESTORE_KEEP:-0}" != "1" ]; then
    psql --no-password -q -d "$RESTORE_ADMIN_URL" -c "DROP DATABASE IF EXISTS \"$SCRATCH_DB\"" >/dev/null 2>&1 || true
  else
    log "kept scratch database $SCRATCH_DB"
  fi
  rm -rf "$WORK"
  exit $status
}
trap cleanup EXIT INT TERM

# 1. Pick the backup.
if [ -n "${RESTORE_FILE:-}" ]; then
  dump="$RESTORE_FILE"
elif [ -n "$BACKUP_S3_URI" ]; then
  key=$(aws_s3 ls "${BACKUP_S3_URI%/}/" | awk '{print $4}' | grep -E '^studentkare-[0-9]{8}T[0-9]{6}Z\.dump$' | sort | tail -n 1)
  [ -n "$key" ] || fail "no studentkare-*.dump under $BACKUP_S3_URI"
  aws_s3 cp --only-show-errors "${BACKUP_S3_URI%/}/$key" "$WORK/$key"
  aws_s3 cp --only-show-errors "${BACKUP_S3_URI%/}/$key.sha256" "$WORK/$key.sha256" || true
  dump="$WORK/$key"
else
  dump=$(ls -1 "$BACKUP_DIR"/studentkare-*.dump 2>/dev/null | sort | tail -n 1 || true)
  [ -n "$dump" ] || fail "no studentkare-*.dump in $BACKUP_DIR"
fi
[ -s "$dump" ] || fail "$dump is missing or empty"
name=$(basename "$dump")
log "backup: $name ($(wc -c < "$dump") bytes)"

# 2. Integrity and age.
if [ -f "$dump.sha256" ]; then
  (cd "$(dirname "$dump")" && sha256sum -c "$name.sha256" >/dev/null) || fail "checksum mismatch for $name"
  log "checksum ok"
fi
stamp=$(echo "$name" | sed -n 's/^studentkare-\([0-9]\{8\}\)T\([0-9]\{2\}\)\([0-9]\{2\}\)\([0-9]\{2\}\)Z\.dump$/\1 \2:\3:\4/p')
if [ -n "$stamp" ] && [ -z "${RESTORE_FILE:-}" ]; then
  d=$(echo "$stamp" | cut -c1-8)
  taken=$(date -u -d "$(echo "$d" | cut -c1-4)-$(echo "$d" | cut -c5-6)-$(echo "$d" | cut -c7-8) ${stamp#* }" +%s)
  age_h=$(( ($(date -u +%s) - taken) / 3600 ))
  log "age: ${age_h}h (limit ${RESTORE_MAX_AGE_HOURS}h)"
  [ "$age_h" -le "$RESTORE_MAX_AGE_HOURS" ] || fail "newest backup is ${age_h}h old: backups have stopped"
fi

# 3. Restore into a fresh scratch database. Owners and grants are skipped: the
# scratch server need not have the production roles (sk_commerce, ...).
psql --no-password -q -v ON_ERROR_STOP=1 -d "$RESTORE_ADMIN_URL" -c "CREATE DATABASE \"$SCRATCH_DB\"" >/dev/null
log "restoring into $SCRATCH_DB"
start=$(date +%s)
pg_restore --no-password --no-owner --no-acl --exit-on-error --dbname="$(scratch_url)" "$dump"
log "restored in $(( $(date +%s) - start ))s"

# 4. Smoke queries: schema at a migration head, tables present, core rows readable.
smoke() {
  psql --no-password -X -q -t -A -v ON_ERROR_STOP=1 -d "$(scratch_url)" -c "$1"
}
head=$(smoke "SELECT string_agg(version_num, ',') FROM alembic_version") || fail "alembic_version unreadable"
[ -n "$head" ] || fail "alembic_version is empty"
tables=$(smoke "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public'")
[ "$tables" -gt 10 ] || fail "only $tables tables restored"
accounts=$(smoke "SELECT count(*) FROM care_accounts") || fail "care_accounts unreadable"
log "alembic head: $head; tables: $tables; care_accounts rows: $accounts"
log "PASS"
