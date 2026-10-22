#!/bin/sh
# Logical Postgres backup: pg_dump (custom format) of DATABASE_URL into
# BACKUP_DIR, checked with pg_restore --list, optionally copied to S3-compatible
# storage, and pruned after BACKUP_RETENTION_DAYS. docs/guides/backups.md.
#
# Runs once (Helm CronJob), or every BACKUP_INTERVAL_SECONDS when that is set
# (the compose `backup` service).
#
#   DATABASE_URL            required  postgresql://user:pass@host:5432/db?sslmode=require
#   BACKUP_DIR              /backups  where dumps are written (a volume)
#   BACKUP_RETENTION_DAYS   14        dumps older than this are deleted, locally and in S3
#   BACKUP_S3_URI           (unset)   s3://bucket/prefix — also upload there when set
#   BACKUP_S3_ENDPOINT_URL  (unset)   for S3-compatible storage (MinIO, R2, Spaces, ...)
#   AWS_ACCESS_KEY_ID / AWS_SECRET_ACCESS_KEY / AWS_DEFAULT_REGION   for the upload
#   BACKUP_INTERVAL_SECONDS (unset)   loop forever with this sleep between runs
#
# Never prints DATABASE_URL (it holds the password).
set -eu

: "${DATABASE_URL:?Set DATABASE_URL to the database to back up}"
BACKUP_DIR="${BACKUP_DIR:-/backups}"
BACKUP_RETENTION_DAYS="${BACKUP_RETENTION_DAYS:-14}"
BACKUP_S3_URI="${BACKUP_S3_URI:-}"
BACKUP_S3_ENDPOINT_URL="${BACKUP_S3_ENDPOINT_URL:-}"
BACKUP_PREFIX="studentkare"

case "$BACKUP_RETENTION_DAYS" in
  ''|*[!0-9]*) echo "[backup] BACKUP_RETENTION_DAYS must be a whole number of days" >&2; exit 2 ;;
esac
if [ "$BACKUP_RETENTION_DAYS" -lt 1 ]; then
  echo "[backup] BACKUP_RETENTION_DAYS must be at least 1" >&2; exit 2
fi

log() { echo "[backup] $(date -u +%Y-%m-%dT%H:%M:%SZ) $*"; }

aws_s3() {
  if [ -n "$BACKUP_S3_ENDPOINT_URL" ]; then
    aws --endpoint-url "$BACKUP_S3_ENDPOINT_URL" s3 "$@"
  else
    aws s3 "$@"
  fi
}

# Timestamps in names sort lexically, so "older than the cutoff" is a string compare.
cutoff_stamp() {
  now=$(date -u +%s)
  date -u -d "@$((now - BACKUP_RETENTION_DAYS * 86400))" +%Y%m%dT%H%M%SZ
}

stamp_of() {  # studentkare-20261023T203000Z.dump -> 20261023T203000Z
  basename "$1" | sed -n "s/^${BACKUP_PREFIX}-\([0-9]\{8\}T[0-9]\{6\}Z\)\.dump$/\1/p"
}

prune_local() {
  cutoff=$(cutoff_stamp)
  for f in "$BACKUP_DIR"/"$BACKUP_PREFIX"-*.dump; do
    [ -e "$f" ] || continue
    s=$(stamp_of "$f")
    if [ -n "$s" ] && [ "$s" \< "$cutoff" ]; then
      rm -f "$f" "$f.sha256"
      log "pruned $(basename "$f") (older than ${BACKUP_RETENTION_DAYS}d)"
    fi
  done
}

prune_s3() {
  cutoff=$(cutoff_stamp)
  aws_s3 ls "${BACKUP_S3_URI%/}/" | awk '{print $4}' | while read -r key; do
    s=$(stamp_of "$key")
    if [ -n "$s" ] && [ "$s" \< "$cutoff" ]; then
      aws_s3 rm "${BACKUP_S3_URI%/}/$key" >/dev/null
      aws_s3 rm "${BACKUP_S3_URI%/}/$key.sha256" >/dev/null 2>&1 || true
      log "pruned s3 $key (older than ${BACKUP_RETENTION_DAYS}d)"
    fi
  done
}

backup_once() {
  mkdir -p "$BACKUP_DIR"
  stamp=$(date -u +%Y%m%dT%H%M%SZ)
  name="${BACKUP_PREFIX}-${stamp}.dump"
  tmp="$BACKUP_DIR/.${name}.partial"
  trap 'rm -f "$tmp"' EXIT

  log "dumping to $BACKUP_DIR/$name"
  pg_dump --format=custom --compress=6 --no-password --dbname="$DATABASE_URL" --file="$tmp"
  # A dump that pg_restore cannot read is not a backup.
  pg_restore --list "$tmp" >/dev/null
  mv "$tmp" "$BACKUP_DIR/$name"
  trap - EXIT
  (cd "$BACKUP_DIR" && sha256sum "$name" > "$name.sha256")
  size=$(wc -c < "$BACKUP_DIR/$name")
  log "ok $name ($size bytes)"

  if [ -n "$BACKUP_S3_URI" ]; then
    aws_s3 cp --only-show-errors "$BACKUP_DIR/$name" "${BACKUP_S3_URI%/}/$name"
    aws_s3 cp --only-show-errors "$BACKUP_DIR/$name.sha256" "${BACKUP_S3_URI%/}/$name.sha256"
    log "uploaded to ${BACKUP_S3_URI%/}/$name"
    prune_s3
  fi
  prune_local
  # Read by the restore drill and by anyone checking backups are current.
  date -u +%Y-%m-%dT%H:%M:%SZ > "$BACKUP_DIR/last-success"
}

if [ -n "${BACKUP_INTERVAL_SECONDS:-}" ]; then
  log "every ${BACKUP_INTERVAL_SECONDS}s, keeping ${BACKUP_RETENTION_DAYS}d"
  while :; do
    # Each run is its own process, so `set -e` stops a failing run (it would be
    # ignored inside `||`); the loop logs it and tries again next interval.
    BACKUP_INTERVAL_SECONDS= sh "$0" || log "FAILED (see above); next attempt in ${BACKUP_INTERVAL_SECONDS}s"
    sleep "$BACKUP_INTERVAL_SECONDS"
  done
else
  backup_once
fi
