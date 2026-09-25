# Disaster Recovery (DR) & Point-In-Time Recovery (PITR) Strategy

**Recovery Time Objective (RTO)**: **< 1 hour**  
**Recovery Point Objective (RPO)**: **< 5 minutes**  
**Encryption**: AWS KMS AES-256 Envelope Encryption for all backups in transit and at rest

---

## 1. Backup Schedule & Strategy

- **Continuous Archiving**: PostgreSQL Write-Ahead Logs (WAL) continuously streamed to secondary region bucket (`ap-south-1` -> `ap-southeast-1`).
- **Daily Full Snapshot**: Encrypted snapshot taken daily at 02:00 IST with 30-day retention window.
- **Crypto-Shredding Protection**: Backups contain encrypted PHI ciphertext; keys managed in KMS.

---

## 2. Recovery Rehearsal & DR Drills

- DR drills are conducted **quarterly** using `DrBackupManager`.
- Rehearsal results are logged to compliance evidence store.

---

## 3. Observability Stack Recovery

### Component Recovery Priorities

| Priority | Component | RTO | RPO | Recovery Method |
|---|---|---|---|---|
| **P0** | PostgreSQL (Clinical Data) | < 1 hour | < 5 min | PITR from WAL + daily snapshots |
| **P1** | Prometheus (Metrics) | < 30 min | < 15 min | Snapshot restore / re-scrape |
| **P1** | Alertmanager (Alerts) | < 15 min | < 5 min | Config from Git, silence from backup |
| **P2** | Grafana (Dashboards) | < 15 min | N/A | GitOps (dashboards as code) |
| **P2** | Loki (Logs) | < 1 hour | < 1 hour | S3/GCS backup restore |
| **P2** | Tempo (Traces) | < 1 hour | < 1 hour | S3/GCS backup restore |
| **P3** | Blackbox Exporter | < 30 min | N/A | Config from Git |
| **P3** | Sentry (Errors) | N/A | N/A | SaaS (vendor managed) |

### Prometheus Recovery
```bash
# 1. Stop Prometheus
kubectl scale statefulset prometheus --replicas=0 -n studentkare

# 2. Restore from snapshot
# Option A: Local snapshot
kubectl exec -n studentkare prometheus-0 -- promtool tsdb create-blocks-from-snapshot /prometheus/snapshots/<snapshot-name>

# Option B: S3/GCS restore (if using remote storage)
# Download latest snapshot from s3://studentkare-backups/prometheus/
# Extract to /prometheus

# 3. Restart
kubectl scale statefulset prometheus --replicas=2 -n studentkare

# 4. Verify
curl -s http://prometheus:9090/api/v1/status/config
```

### Alertmanager Recovery
```bash
# Config is in Git (deploy/alertmanager-prod.yml)
# Silences are in local storage - restore from backup if needed

# 1. Apply config
kubectl apply -f deploy/helm/studentkare/templates/03-monitoring.yaml -n studentkare

# 2. Verify
kubectl exec -n studentkare alertmanager-0 -- amtool alert query
```

### Grafana Recovery
```bash
# Dashboards and datasources are provisioned from Git (GitOps)
# 1. Re-apply ConfigMaps
kubectl apply -f deploy/helm/studentkare/templates/03-monitoring.yaml -n studentkare

# 2. Or manual dashboard import via API
curl -X POST https://monitoring.studentkare.in/api/dashboards/db \
  -H "Authorization: Bearer <admin-token>" \
  -d @deploy/grafana/dashboards/api-overview.json

# 3. Verify
curl -s https://monitoring.studentkare.in/api/health
```

### Loki Recovery
```bash
# 1. Stop Loki
kubectl scale statefulset loki --replicas=0 -n studentkare

# 2. Restore from S3/GCS backup
# Download from s3://studentkare-backups/loki/
# Extract to /loki

# 3. Restart
kubectl scale statefulset loki --replicas=2 -n studentkare

# 4. Verify
curl -s http://loki:3100/ready
```

### Tempo Recovery
```bash
# 1. Stop Tempo
kubectl scale deployment tempo --replicas=0 -n studentkare

# 2. Restore from S3/GCS backup
# Download from s3://studentkare-backups/tempo/
# Extract to /var/tempo/traces

# 3. Restart
kubectl scale deployment tempo --replicas=2 -n studentkare

# 4. Verify
curl -s http://tempo:3200/ready
```

### Blackbox Exporter Recovery
```bash
# Config is in Git
kubectl apply -f deploy/helm/studentkare/templates/03-monitoring.yaml -n studentkare

# Verify
curl -s http://blackbox:9115/probe?target=https://api.studentkare.in/api/health&module=http_2xx
```

### Sentry Recovery
- **SaaS Vendor Managed**: No action required
- Verify: `https://sentry.io/organizations/studentkare/projects/`
- Check: Project settings → Data retention (30 days default)

---

## 4. Full Region Failover Procedure

### Prerequisites
- Secondary region: `ap-southeast-1` (Singapore)
- All Helm charts deployed to secondary cluster
- External DNS configured for failover (Route 53 / Cloud DNS)
- Database read replica promoted to primary

### Steps
```bash
# 1. Promote DR database
# Via cloud console: Promote read replica in ap-southeast-1

# 2. Update DNS (RTO: < 5 min)
# Route 53: Failover alias record to secondary ALB
aws route53 change-resource-record-sets --hosted-zone-id Z123456 \
  --change-batch file://dns-failover.json

# 3. Scale secondary cluster
kubectl scale deployment studentkare-backend --replicas=5 -n studentkare
kubectl scale deployment studentkare-frontend --replicas=5 -n studentkare

# 4. Verify health
curl -f https://api.studentkare.in/api/health
curl -f https://studentkare.in/

# 5. Update monitoring
# Prometheus: Update scrape targets to new endpoints
# Grafana: Dashboards auto-discover via service discovery

# 6. Notify stakeholders
# Slack: #ops-alerts "DR Failover Complete - Region: ap-southeast-1"
```

---

## 5. Data Integrity Verification

### Post-Recovery Checks
```bash
# 1. Database integrity
psql $DATABASE_URL -c "SELECT count(*) FROM care_accounts;"
psql $DATABASE_URL -c "SELECT count(*) FROM care_readings;"
psql $DATABASE_URL -c "SELECT count(*) FROM care_documents;"

# 2. PHI encryption verification
psql $DATABASE_URL -c "SELECT count(*) FROM care_documents WHERE content IS NOT NULL LIMIT 1;"
# Verify content is encrypted (not plaintext)

# 3. Audit log continuity
psql $DATABASE_URL -c "SELECT max(created_at) FROM care_workflow_audit;"
# Should be within RPO window

# 4. Metrics continuity
curl -s "http://prometheus:9090/api/v1/query?query=up{job='studentkare-backend'}"
# Should return 1

# 5. Alerting verification
curl -s http://alertmanager:9093/api/v2/alerts | jq '.[] | select(.status.state=="firing")'
# Should match expected active alerts

# 6. Tracing verification
# Send test trace via OTel
# Verify in Tempo: Search for test service name
```

---

## 6. Recovery Validation Checklist

| Check | Target | Verification Method |
|---|---|---|
| API Health | 200 OK | `curl -f /api/health` |
| Database | Rows accessible | `SELECT 1;` + row counts |
| PHI Encryption | No plaintext | Sample document content |
| Audit Logs | Continuous | Max timestamp < RPO |
| Metrics | All targets UP | Prometheus targets page |
| Alerts | No stale alerts | Alertmanager API |
| Traces | Ingesting | Tempo search |
| Logs | Ingesting | Loki query |
| Synthetic | All probes pass | Blackbox + Grafana |
| Sentry | Receiving events | Test exception capture |

---

## 7. Communication Plan

| Event | Channel | Audience | Template |
|---|---|---|---|
| DR Declared | Slack #ops-alerts + Email | Engineering, Security, Leadership | "DR Failover Initiated - Region: X" |
| DR Complete | Slack #ops-alerts | All Engineering | "DR Failover Complete - RTO: X min" |
| Recovery Verified | Slack #ops-alerts | On-Call, Tech Lead | "Recovery Validated - All Checks Pass" |
| Post-Mortem Scheduled | Calendar Invite | All Stakeholders | "DR Post-Mortem - Date/Time" |

---

## 8. Related Documents

- [Incident Response](./INCIDENT_RESPONSE.md)
- [Observability Runbook](./OBSERVABILITY.md)
- [Deployment Guide](../DEPLOYMENT_GUIDE.md)
- [Architecture](../ARCHITECTURE.md)