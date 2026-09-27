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
```

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
  --dry-run=client -o yaml | kubeseal -o yaml > deploy/helm/studentkare/values/secrets.yaml

# Option B: Direct apply (dev only)
kubectl create secret generic studentkare-secrets \
  --namespace studentkare \
  --from-literal=DATABASE_URL="postgresql://..." \
  --from-literal=OTP_HASH_SECRET="..." \
  --from-literal=SENTRY_DSN="https://xxx@o123.ingest.sentry.io/456" \
  --from-literal=ALERTMANAGER_WEBHOOK_SECRET="..."
```

### 3. Deploy

```bash
# Add Helm repo (if using chart registry)
helm repo add studentkare ./deploy/helm/studentkare
helm repo update

# Install
helm install studentkare ./deploy/helm/studentkare \
  -f deploy/helm/studentkare/values/my-production.yaml \
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
# A record: studentkare.in → <ingress-ip>
# A record: monitoring.studentkare.in → <ingress-ip>
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
    email: ops@studentkare.in
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
curl -f https://studentkare.in/api/health
curl -f https://studentkare.in/
curl -f https://monitoring.studentkare.in/api/health

# Check Prometheus targets
curl -s https://monitoring.studentkare.in/prometheus/api/v1/targets | jq '.data.activeTargets[] | select(.health=="up") | .labels.job'

# Check Grafana
curl -f https://monitoring.studentkare.in/api/health

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
| `APP_ENV` | `production` or `development` | Yes |
| `ALLOWED_ORIGINS` | Comma-separated CORS origins | Yes |

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
# Update image tag
helm upgrade studentkare ./deploy/helm/studentkare \
  -f values/my-production.yaml \
  --set backend.image.tag=v1.2.3 \
  --set frontend.image.tag=v1.2.3 \
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
```

### Database Migrations
```bash
# Migrations run automatically on backend startup (production)
# For manual migration:
kubectl exec -n studentkare deploy/studentkare-backend -- python -m services.migrations
```

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
curl -u admin:password https://monitoring.studentkare.in/api/datasources

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
- [ ] Commerce firewall (Rule L) enforced at DB level