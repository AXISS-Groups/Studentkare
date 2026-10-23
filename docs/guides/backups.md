# Postgres backups and the monthly restore drill

Studentkare holds students' health records. A backup that has never been restored
is a hope, not a backup. This guide covers what runs, where the dumps go, and the
drill that proves they restore.

## What runs

| Deploy | What | Where the dumps go |
|---|---|---|
| Helm | CronJob `studentkare-pg-backup` (`templates/06-backup.yaml`), `backup.schedule` (default 20:30 UTC = 02:00 IST) | PVC `studentkare-backups` (kept on `helm uninstall`), plus `backup.s3Uri` when set |
| Compose (prod) | Service `backup`, every `BACKUP_INTERVAL_SECONDS` (default 86400) | Volume `pg-backups`, plus `BACKUP_S3_URI` when set |

Both run `pg-backup` from the `studentkare-backup` image (`deploy/backup/`, built by
`release.yml` with the same `sha-<12>` tag as the backend). Each run:

1. `pg_dump --format=custom` of `DATABASE_URL` to `studentkare-<UTC timestamp>.dump`;
2. `pg_restore --list` on it (an unreadable dump fails the run) and writes a `.sha256`;
3. uploads both to S3-compatible storage when configured;
4. deletes dumps older than the retention (`backup.retentionDays` / `BACKUP_RETENTION_DAYS`,
   default 14 days) locally and in the bucket;
5. writes `last-success`. The compose service is unhealthy when that is over 26 hours old;
   on Kubernetes a failed Job shows in `kubectl get jobs` (alert on `kube_job_failed` if
   kube-state-metrics is installed).

These are logical backups. If the managed database also offers point-in-time recovery,
keep it on: PITR covers the last minutes, these dumps cover "the provider lost it" and
"we need yesterday's copy somewhere else".

### Settings

| Compose env | Helm value | Meaning |
|---|---|---|
| `BACKUP_DATABASE_URL` (falls back to `DATABASE_URL`) | secret `DATABASE_URL` | Database to dump. Must be a direct connection, not PgBouncer in transaction mode |
| `BACKUP_RETENTION_DAYS` | `backup.retentionDays` | Days kept, locally and in S3 |
| `BACKUP_INTERVAL_SECONDS` | `backup.schedule` | How often |
| `BACKUP_S3_URI` | `backup.s3Uri` | `s3://bucket/prefix`; empty = volume only |
| `BACKUP_S3_ENDPOINT_URL` | `backup.s3EndpointUrl` | For MinIO, Cloudflare R2, DigitalOcean Spaces, ... |
| `BACKUP_AWS_ACCESS_KEY_ID`, `BACKUP_AWS_SECRET_ACCESS_KEY`, `BACKUP_AWS_REGION` | `backup.secrets.AWS_ACCESS_KEY_ID`, `backup.secrets.AWS_SECRET_ACCESS_KEY`, `backup.awsRegion` | Upload credentials. Give them write + list + delete on that prefix only |

Use a bucket in a different account or provider from the database, with versioning or
object lock, so one compromised credential cannot delete both. The dumps contain health
data: the bucket must be private and encrypted at rest, in India (DPDP), and access logged.
`pg_dump` must be the same major version as the server or newer; the image is Postgres 16.

## Monthly restore drill

Owner: on-call engineer, first working Monday of the month. Takes about 15 minutes.

1. **Get a scratch server.** Never restore into production. Any Postgres 16 you can create a
   database on: a throwaway container on the ops host
   (`docker run --rm -d --name restore-scratch -e POSTGRES_PASSWORD=<pw> -p 127.0.0.1:55432:5432 postgres:16-alpine`),
   or a small scratch instance from the provider.
2. **Run the drill** against the newest backup.
   - Compose, on the host:
     ```sh
     docker compose -f docker-compose.yml -f docker-compose.prod.yml run --rm \
       -e RESTORE_ADMIN_URL='postgresql://postgres:<pw>@<scratch host>:55432/postgres' \
       backup restore-check
     ```
   - Kubernetes (reads the bucket; needs `backup.s3Uri`):
     ```sh
     kubectl -n studentkare run restore-check --rm -it --restart=Never \
       --image=ghcr.io/axiss-groups/studentkare-backup:<sha tag> \
       --env RESTORE_ADMIN_URL='postgresql://...scratch.../postgres' \
       --env BACKUP_S3_URI='s3://...' --env AWS_ACCESS_KEY_ID=... --env AWS_SECRET_ACCESS_KEY=... \
       -- restore-check
     ```
   - Anywhere with `psql`/`pg_restore` 16: `RESTORE_ADMIN_URL=... BACKUP_DIR=<dir> scripts/ops/restore-check.sh`
     (or `RESTORE_FILE=<path to .dump>`).

   `restore-check` picks the newest `studentkare-*.dump`, verifies its checksum, fails if it is
   older than `RESTORE_MAX_AGE_HOURS` (48), restores it into a new `restore_check_<time>`
   database (`--no-owner --no-acl --exit-on-error`), runs the smoke queries (Alembic head,
   table count, `care_accounts` readable), prints `PASS`, and drops the scratch database
   (`RESTORE_KEEP=1` keeps it).
3. **Compare.** The Alembic head it prints should match production
   (`SELECT version_num FROM alembic_version` there, or `/api/info`), and the
   `care_accounts` count should be close to production's.
4. **Record it** in the ops log: date, backup file name and age, restore time, Alembic head,
   row count, PASS/FAIL, who ran it. A FAIL is a P1 incident: fix the backups before
   anything else.
5. **Clean up** the scratch server (`docker rm -f restore-scratch`). It held real health data.

Once a quarter, also time a full restore into a staging-sized instance and point a staging
backend at it, to measure the real recovery time against the runbook's RTO
(`docs/runbooks/DISASTER_RECOVERY.md`).
