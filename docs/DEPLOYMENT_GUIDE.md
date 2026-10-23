# Deployment Guide

## Prerequisites

### Infrastructure
- Kubernetes cluster (v1.28+) - EKS, GKE, AKS, or self-managed
- Helm v3.12+
- kubectl configured
- cert-manager installed (for TLS)
- External DNS controller (for ingress)
- Managed PostgreSQL (RDS, CloudSQL, or self-managed with Patroni)
- Managed Redis (ElastiCache, Memorystore, or self-managed)

### Secrets Management
- HashiCorp Vault, AWS Secrets Manager, or SealedSecrets
- Required secrets:
  - `DATABASE_URL`
  - `OTP_HASH_SECRET`
  - `SENTRY_DSN`
  - `ALERTMANAGER_WEBHOOK_SECRET`
  - `SLACK_WEBHOOK_URL`
  - `GRAFANA_ADMIN_PASSWORD`
  - TLS certificates

### Monitoring Accounts
- Sentry SaaS project created
- Slack workspace with `#ops-alerts` channel
- Slack App with `chat:write` permission

---

## Quick Start (Docker Compose)

```bash
# 1. Copy environment
cp .env.dev.example .env
# Edit .env with your values

# 2. Start stack
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d --build

# 3. Verify
curl -f http://localhost:8000/api/health
curl -f http://localhost:3000
curl -f http://localhost:9090/-/healthy
curl -f http://localhost:3001/api/health
docker compose ps worker   # should be "healthy" within ~1 minute
```

---

## Scheduled Jobs Worker (required)

The periodic jobs in `backend/services/workflow_scheduler.py` (`PERIODIC_JOBS`)
only run on a timer if a worker is running. Without it, outbox messages
(including `BLOOD_SOS` and SOS acknowledgements), account erasures and campus
departures happen only at backend startup or when a super-admin presses
"run now".

Crisis signals are **not** pushed. Counsellors see them only by opening the
crisis queue (`GET /api/ops/crisis-events`). Staff a rota to watch it;
nothing pages anyone.

The worker is the backend image with a different command:

```bash
python -m scripts.workflow_worker --loop --heartbeat-file /tmp/workflow-worker.heartbeat
```

- It polls every 15 s (`--poll-seconds`, 1–300) and runs whatever is due.
  Outbox delivery (`reminder_reconcile`) is due every 45 s, so an SOS is
  picked up within about a minute. `slack_selftest` runs hourly, every other
  job every 2 hours.
- Each job run takes a lease on its `care_scheduled_jobs` row (an atomic
  conditional UPDATE, so it works through PgBouncer and on SQLite). Several
  workers, backend replicas running their startup pass, and "run now" never run
  the same job at the same time; "run now" on a busy job returns 409. A lease
  left by a crashed worker expires after 15 minutes.
- `SIGTERM` finishes the current pass and exits 0. Allow a stop grace period
  of at least 120 s.
- It does not run migrations. Start it after the backend has migrated the
  database (lease columns come from migration `a1c7e93f5d20`).
- Health: the heartbeat file is touched after every completed pass; it is
  healthy while the file is less than 2 minutes old. The image's default
  HTTP healthcheck does not apply to the worker; replace it.

- Outbox delivery never repeats a send: each event is committed as `SENDING`
  before the provider is called and its outcome right after. If a worker is
  killed in between, the event is marked `FAILED`
  (`delivery_interrupted_outcome_unknown`) once its 15-minute claim lapses;
  check with the recipient, then requeue it from the admin outbox if needed.
- A failed attempt is retried after 1 min, then 5 min (safety alerts: 15 s,
  then 60 s); the third failure is final. Quiet-hours deferrals wait until
  the window ends, so they never fill the 25-per-pass batch.

### Helm
`deploy/helm/studentkare/templates/04-worker.yaml` (values: `worker:` in
`values/production.yaml`) runs the same command with the backend image and
secrets, a heartbeat liveness probe, a `/tmp` emptyDir (read-only root) and a
120 s termination grace period.

### Docker Compose
`docker compose up` starts the `worker` service (see `docker-compose.yml`;
the production overlay gives it the same secrets as `backend`).

### Dokploy
Run the worker as a second application from the same repository:

1. Create a new Application (or a second service in the Compose app) that
   builds `backend/Dockerfile` with build context `backend`, exactly like the
   backend app.
2. Set the start command / command override to
   `python -m scripts.workflow_worker --loop --heartbeat-file /tmp/workflow-worker.heartbeat`.
3. Copy every environment variable and secret from the backend app
   (`DATABASE_URL`, `APP_ENV`, `OTP_HASH_SECRET`, integration and messaging
   credentials, `SENTRY_DSN`, ...). It sends messages and erases accounts, so
   it needs the same credentials.
4. No domain and no port: it serves no HTTP traffic.
5. Health check: replace the inherited `curl :8000/api/health` with
   `python -c "import os,sys,time; sys.exit(0 if time.time() - os.path.getmtime('/tmp/workflow-worker.heartbeat') < 120 else 1)"`,
   or turn the health check off for this app.
6. Restart policy: always / unless-stopped. One replica is enough; more are
   safe.
7. Deploy the backend first (it applies migrations), then the worker.
8. Check: the super-admin scheduled-jobs list (`GET .../ops/jobs`) shows `reminder_reconcile` with a
   `lastRunAt` within the last minute.

### Single-container deploys
If you cannot run a second service, set `SCHEDULER_IN_PROCESS=true` on the
backend. Every backend process then runs the same loop in a background thread,
using the same lease. Default is off; prefer the dedicated worker so job
runs do not compete with API requests.

---

## Production Deployment (Helm)

### 1. Prepare Values File

```bash
# Copy production values
cp deploy/helm/studentkare/values/production.yaml deploy/helm/studentkare/values/my-production.yaml

# Edit with your values:
# - global.domain
# - global.monitoringDomain
# - image tags
# - resource limits
# - storage classes
# - replica counts
```

### 2. Create Secrets

```bash
# Option A: SealedSecrets (recommended for GitOps)
kubectl create secret generic studentkare-secrets \
  --namespace studentkare \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=OTP_HASH_SECRET="..." \
  --from-literal=SENTRY_DSN="https://xxx@o123.ingest.sentry.io/456" \
  --from-literal=ALERTMANAGER_WEBHOOK_SECRET="..." \
  --from-literal=TWO_FACTOR_ENCRYPTION_KEY="<fernet key>" \
  --from-literal=PASS_SIGNING_SECRET="..." \
  --from-literal=DPDP_ARCHIVE_KEY="<fernet key>" \
  --from-literal=DPDP_ARCHIVE_RETENTION_DAYS="<days>" \
  --from-literal=INTEGRATIONS_ENCRYPTION_KEY="<fernet key>" \
  --dry-run=client -o yaml | kubeseal -o yaml > deploy/helm/studentkare/values/secrets.yaml

# Option B: Direct apply (dev only)
kubectl create secret generic studentkare-secrets \
  --namespace studentkare \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=OTP_HASH_SECRET="..." \
  --from-literal=SENTRY_DSN="https://xxx@o123.ingest.sentry.io/456" \
  --from-literal=ALERTMANAGER_WEBHOOK_SECRET="..." \
  --from-literal=TWO_FACTOR_ENCRYPTION_KEY="<fernet key>" \
  --from-literal=PASS_SIGNING_SECRET="..." \
  --from-literal=DPDP_ARCHIVE_KEY="<fernet key>" \
  --from-literal=DPDP_ARCHIVE_RETENTION_DAYS="<days>" \
  --from-literal=INTEGRATIONS_ENCRYPTION_KEY="<fernet key>"
```

Generate each Fernet key with
`python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"`.
The backend and the worker read the same secret. If a feature key is missing the
service still starts, logs `[FEATURES] <feature> disabled: <reason>` and raises a
CRITICAL `FEATURE_KEYS_MISSING` event on the super-admin activity feed.

### 3. Deploy

```bash
# Add Helm repo (if using chart registry)
helm repo add studentkare ./deploy/helm/studentkare
helm repo update

# Install. Images are built by .github/workflows/release.yml for every main
# commit that passes CI and tagged sha-<first 12 chars of the commit>; there is
# no "latest". The chart refuses to render without a tag.
TAG=sha-$(git rev-parse --short=12 origin/main)
helm install studentkare ./deploy/helm/studentkare \
  -f deploy/helm/studentkare/values/my-production.yaml \
  --set backend.image.tag=$TAG --set frontend.image.tag=$TAG \
  --namespace studentkare \
  --create-namespace \
  --wait --timeout 10m

# Verify
helm status studentkare -n studentkare
kubectl get pods -n studentkare
```

### 4. Configure DNS

```bash
# Get ingress IP
kubectl get ingress studentkare-frontend -n studentkare -o jsonpath='{.status.loadBalancer.ingress[0].ip}'

# Create DNS records
# A record: studentkare.co → <ingress-ip>
# A record: monitoring.studentkare.co → <ingress-ip>
```

### 5. Configure TLS (cert-manager)

```bash
# Create ClusterIssuer (Let's Encrypt)
cat <<EOF | kubectl apply -f -
apiVersion: cert-manager.io/v1
kind: ClusterIssuer
metadata:
  name: letsencrypt-prod
spec:
  acme:
    server: https://acme-v02.api.letsencrypt.org/directory
    email: ops@studentkare.co
    privateKeySecretRef:
      name: letsencrypt-prod
    solvers:
      - http01:
          ingress:
            class: nginx
EOF
```

### 6. Configure Slack Alerting

1. Create Slack App at `https://api.slack.com/apps`
2. Add OAuth scopes: `chat:write`, `channels:read`
3. Install to workspace
4. Copy `Webhook URL` to `SLACK_WEBHOOK_URL` secret
5. Invite bot to `#ops-alerts` channel

### 7. Configure Sentry

1. Create project at `https://sentry.io/organizations/studentkare/projects/`
2. Copy DSN to `SENTRY_DSN` and `VITE_SENTRY_DSN` secrets
3. Set environment: `production`
4. Configure alert rules in Sentry UI

### 8. Verify Deployment

```bash
# Check all pods running
kubectl get pods -n studentkare

# Check services
kubectl get svc -n studentkare

# Check ingress
kubectl get ingress -n studentkare

# Health checks
curl -f https://studentkare.co/api/health
curl -f https://studentkare.co/
curl -f https://monitoring.studentkare.co/api/health

# Check Prometheus targets
curl -s https://monitoring.studentkare.co/prometheus/api/v1/targets | jq '.data.activeTargets[] | select(.health=="up") | .labels.job'

# Check Grafana
curl -f https://monitoring.studentkare.co/api/health

# Test alert
kubectl exec -n studentkare alertmanager-0 -- amtool alert query
```

---

## Environment Variables Reference

### Backend Required
| Variable | Description | Required |
|---|---|---|
| `DATABASE_URL` | PostgreSQL connection string | Yes |
| `OTP_HASH_SECRET` | Secret for OTP hashing (32+ chars) | Yes |
| `JWT_SECRET` | Alternative to OTP_HASH_SECRET | No |
| `SENTRY_DSN` | Sentry DSN for error tracking | No |
| `ALERTMANAGER_WEBHOOK_SECRET` | HMAC secret for Alertmanager webhook | No |
| `OTEL_EXPORTER_OTLP_ENDPOINT` | OTel collector endpoint | No |
| `APP_ENV` | `production`, `development` or `testing`. Only an explicit `development` or `testing` is non-production; unset or anything else (`prod`, `staging`) behaves as production (secret guard, migrations, Secure cookies, no demo accounts) | Yes |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Yes |
| `RULE_L_REQUIRE_GRANTS` | `1` (production default in compose and Helm) refuses commerce requests when they cannot run as `sk_commerce`. `0` passes them through as the app role; use it only while roles are being provisioned. `GET /api/ops/rule-l` shows whether grants are in force | No |
| `DB_POOL_SIZE` / `DB_MAX_OVERFLOW` | In-process connection pool per process when talking to Postgres directly (default 5 + 5, clamped to 1–50 / 0–50). Size so replicas × (size + overflow), plus the worker, stays under Postgres `max_connections`. Ignored with `USE_PGBOUNCER=true`, where PgBouncer pools instead | No |
| `SCHEDULER_IN_PROCESS` | `true` runs the periodic-job loop inside the backend (single-container deploys only; default off, see "Scheduled Jobs Worker") | No |
| `TWO_FACTOR_ENCRYPTION_KEY` | Fernet key sealing 2FA secrets. Without it, super admins and counsellors cannot finish the 2FA setup they are required to do | Yes (production) |
| `PASS_SIGNING_SECRET` | Signs rotating check-in pass codes (32+ random bytes) | Yes (production) |
| `DPDP_ARCHIVE_KEY` | Fernet key sealing DPDP erasure archives; erasure is paused without it | Yes (production) |
| `DPDP_ARCHIVE_RETENTION_DAYS` | Whole days a sealed archive is kept before destruction; confirm with legal counsel | Yes (production) |
| `INTEGRATIONS_ENCRYPTION_KEY` | Fernet key sealing provider secrets saved from the admin console | Yes (production) |
| `FORWARDED_ALLOW_IPS` | Comma-separated IPs/CIDRs of the reverse proxy or ingress in front of the backend. Their `X-Forwarded-For` is trusted so rate limits key on the real client. Image default `127.0.0.1` (trust nothing remote); compose and Helm set the private ranges. Narrow it to your proxy's network | Recommended |

### Frontend Build Args
| Variable | Description | Required |
|---|---|---|
| `VITE_API_BASE_URL` | API base path (default: `/api`) | No |
| `VITE_SENTRY_DSN` | Sentry DSN for frontend | No |
| `VITE_APP_VERSION` | Release version | No |

---

## Scaling Guidelines

### Backend HPA
```yaml
# Already configured in Helm chart
# CPU > 70% → scale up
# CPU < 30% → scale down
# Min: 3, Max: 10
```

### Database Connection Pool
```bash
# Tune based on load
DB_POOL_SIZE=15        # Default: 15
DB_MAX_OVERFLOW=25     # Default: 25
DB_POOL_TIMEOUT=30     # Seconds
DB_POOL_RECYCLE=1800   # 30 minutes
```

### Prometheus Retention
```yaml
# In values.yaml
prometheus:
  retention: 30d
  retentionSize: 10GB
  storage:
    size: 50Gi
```

### Loki Retention
```yaml
# In values.yaml
loki:
  config:
    limits_config:
      reject_old_samples_max_age: 168h  # 7 days
```

### Tempo Retention
```yaml
# In values.yaml
tempo:
  config:
    compactor:
      compaction:
        block_retention: 72h  # 3 days
```

---

## Maintenance Procedures

### Rolling Updates
```bash
# Update image tag: a released sha-<commit> (or a v* tag, which release.yml
# pushes as a second tag on the same build). The worker uses the backend tag.
helm upgrade studentkare ./deploy/helm/studentkare \
  -f values/my-production.yaml \
  --set backend.image.tag=sha-<commit> \
  --set frontend.image.tag=sha-<commit> \
  --namespace studentkare

# Check rollout
kubectl rollout status deployment/studentkare-backend -n studentkare
kubectl rollout status deployment/studentkare-frontend -n studentkare
```

### Rollback
```bash
# Quick rollback
helm rollback studentkare -n studentkare

# Or specific revision
helm rollback studentkare 3 -n studentkare

# Or redeploy a known-good commit: helm upgrade ... --set backend.image.tag=sha-<previous>
```

Migrations only move forward. Rolling back to an image older than the
current schema works only if that migration was backwards-compatible.

### Database Migrations
Migrations run automatically when the backend starts in production. Every
replica tries, but `services/migrations.run_migrations` holds a Postgres
advisory lock around the upgrade, so one replica migrates and the others wait
and then find the database already at head. Write migrations so the previous
release still runs against the new schema (add columns and tables first, remove
them a release later), because old pods keep serving during a rolling deploy.

```bash
# Run migrations by hand (same lock, safe while the backend is running):
kubectl exec -n studentkare deploy/studentkare-backend -- \
  python -c "from services.migrations import run_migrations; print(run_migrations())"
```

In development, the backend also migrates an empty or Alembic-tracked database
at startup. A local database that was built earlier without Alembic keeps using
`create_all` and logs how to switch.

### Certificate Renewal
- Automatic via cert-manager (Let's Encrypt)
- Check: `kubectl get certificates -n studentkare`
- Force renewal: `kubectl delete secret studentkare-tls -n studentkare`

---

## Troubleshooting

### Backend Not Starting
```bash
# Check logs
kubectl logs -n studentkare -l app=studentkare-backend -f

# Check events
kubectl get events -n studentkare --sort-by='.lastTimestamp'

# Common issues:
# - DATABASE_URL incorrect
# - OTP_HASH_SECRET missing
# - Migration failed (check init container logs)
```

### Frontend Not Loading
```bash
# Check nginx config
kubectl exec -n studentkare <pod> -- cat /etc/nginx/conf.d/default.conf

# Check build
kubectl logs -n studentkare -l app=studentkare-frontend -f
```

### Prometheus Not Scraping
```bash
# Check config
kubectl exec -n studentkare prometheus-0 -- cat /etc/prometheus/prometheus.yml

# Check targets
curl -s http://prometheus:9090/api/v1/targets | jq '.data.activeTargets[] | select(.health=="down")'
```

### Grafana Dashboards Empty
```bash
# Check datasource
curl -u admin:password https://monitoring.studentkare.co/api/datasources

# Re-provision
kubectl delete configmap grafana-datasources grafana-dashboards -n studentkare
kubectl rollout restart deployment/grafana -n studentkare
```

---

## Security Hardening

### Network Policies
- Enabled by default in Helm chart
- Backend only accessible from frontend namespace
- Monitoring namespace can scrape metrics
- No external egress except DNS

### Pod Security Standards
```yaml
# Enforced via PodSecurityPolicy or Kyverno
- runAsNonRoot: true
- runAsUser: 1000
- fsGroup: 1000
- readOnlyRootFilesystem: true
- dropCapabilities: [ALL]
```

### Secrets Rotation
```bash
# Rotate OTP_HASH_SECRET (requires all users to re-login)
kubectl create secret generic studentkare-secrets \
  --from-literal=OTP_HASH_SECRET="new-secret" \
  --dry-run=client -o yaml | kubectl replace -f -

# Restart backend pods
kubectl rollout restart deployment/studentkare-backend -n studentkare
```

---

## Cost Optimization

### Resource Requests/Limits
| Component | CPU Request | CPU Limit | Memory Request | Memory Limit |
|---|---|---|---|---|
| Backend | 1000m | 2000m | 1Gi | 2Gi |
| Frontend | 250m | 500m | 256Mi | 512Mi |
| Prometheus | 1000m | 2000m | 2Gi | 4Gi |
| Grafana | 500m | 1000m | 512Mi | 1Gi |
| Loki | 1000m | 2000m | 1Gi | 2Gi |
| Tempo | 1000m | 2000m | 1Gi | 2Gi |
| Alertmanager | 100m | 500m | 128Mi | 256Mi |
| Blackbox | 100m | 250m | 64Mi | 128Mi |
| OTel Collector | 500m | 1000m | 512Mi | 1Gi |

### Storage
| Component | Size | Class |
|---|---|---|
| Prometheus | 50Gi | fast-ssd |
| Loki | 50Gi | fast-ssd |
| Tempo | 100Gi | fast-ssd |
| Grafana | 10Gi | standard |
| Alertmanager | 2Gi | standard |

---

## Compliance Checklist

- [ ] All PHI encrypted at rest (PostgreSQL TDE + App-level)
- [ ] PHI encrypted in transit (TLS 1.3 everywhere)
- [ ] Audit logging enabled (care_workflow_audit table)
- [ ] Access logging (nginx + Loki)
- [ ] Encryption keys in KMS/HSM
- [ ] DR drills quarterly
- [ ] CERT-In 6-hour notification tested
- [ ] DPDP Act 2023 compliance (Data Fiduciary obligations)
- [ ] ABDM FHIR R4 compliance
- [ ] No PHI in logs/metrics (verified via guardrails)
- [ ] Commerce firewall (Rule L) enforced at DB level: `GET /api/ops/rule-l` reports `enforced: true` and `RULE_L_REQUIRE_GRANTS=1`