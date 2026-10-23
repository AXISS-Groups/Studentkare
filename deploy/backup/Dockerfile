# Postgres backup + restore-drill image. Build context: repo root
# (docker build -f deploy/backup/Dockerfile .). Pushed by release.yml as
# studentkare-backup:sha-<12>, used by the compose `backup` service and the Helm
# CronJob. pg_dump must be the same major as the server or newer: keep this at
# the production Postgres major (16).
FROM postgres:16-alpine

# aws-cli: optional upload to S3-compatible storage (BACKUP_S3_URI).
RUN apk add --no-cache aws-cli coreutils

COPY deploy/backup/pg-backup.sh /usr/local/bin/pg-backup
COPY scripts/ops/restore-check.sh /usr/local/bin/restore-check
RUN chmod 0755 /usr/local/bin/pg-backup /usr/local/bin/restore-check

# Run as the image's unprivileged postgres user; /backups is the dump volume.
RUN mkdir -p /backups && chown postgres:postgres /backups
USER postgres
WORKDIR /backups

ENTRYPOINT []
CMD ["pg-backup"]
