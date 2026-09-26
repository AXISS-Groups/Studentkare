# Observability Runbook

## Overview

This runbook covers the Studentkare observability stack: **Prometheus + Grafana + Loki + Tempo + Alertmanager + Blackbox Exporter + Sentry**.

## Architecture

```
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Backend    │────▶│  OTel        │────▶│  Tempo      │
│  (FastAPI)  │     │  Collector   │     │  (Traces)   │
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │                    │
       ▼                    ▼                    ▼
┌─────────────┐     ┌──────────────┐     ┌─────────────┐
│  Prometheus │     │  Prometheus  │     │  Grafana    │
│  (Metrics)  │◀───▶│  (Metrics)   │────▶│  (Dashboards)│
└─────────────┘     └──────────────┘     └─────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌──────────────┐
│  Alertmgr   │     │  Loki        │
│  (Alerts)   │     │  (Logs)      │
└─────────────┘     └──────────────┘
       │                    │
       ▼                    ▼
┌─────────────┐     ┌──────────────┐
│  Slack      │     │  Grafana     │
│  (Ops)      │     │  (Logs)      │
└─────────────┘     └─────────────┘
```

## Access URLs

| Service | Internal URL | External URL |
|---------|--------------|--------------|
| Grafana | `http://grafana:3000` | `https://monitoring.studentkare.in` |
| Prometheus | `http://prometheus:9090` | `https://monitoring.studentkare.in/prometheus` |
| Alertmanager | `http://alertmanager:9093` | `https://monitoring.studentkare.in/alertmanager` |
| Loki | `http://loki:3100` | Internal only |
| Tempo | `http://tempo:3200` | Internal only |
| Blackbox | `http://blackbox:9115` | Internal only |

## Dashboards

| Dashboard | UID | Purpose |
|-----------|-----|---------|
| API Overview | `studentkare-api-overview` | Request rates, latency p50/p95/p99, error rates, in-flight requests |
| Database Connections | `studentkare-db-connections` | Pool utilization, query latency, connection counts |
| Error Tracking | `studentkare-error-tracking` | Slack alert delivery, guardrail violations, telemetry errors |
| Business Ops | `studentkare-business-ops` | API activity, log levels, operational warnings |

## Key Metrics

### HTTP Metrics
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `http_requests_total` | Counter | method, route, status_class | Total requests |
| `http_request_duration_seconds` | Histogram | method, route | Request latency |
| `http_requests_in_flight` | Gauge | - | Active requests |

### Database Metrics
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `db_pool_checked_out` | Gauge | - | Connections in use |
| `db_pool_idle` | Gauge | - | Idle connections |
| `db_pool_overflow` | Gauge | - | Overflow connections |
| `db_query_duration_seconds` | Histogram | operation | Query latency |

### Custom Metrics
| Metric | Type | Labels | Description |
|--------|------|--------|-------------|
| `slack_alerts_total` | Counter | kind, result | Slack delivery tracking |
| `guardrail_violations_total` | Counter | - | Safety violations (should be 0) |
| `activity_telemetry_errors_total` | Counter | - | Telemetry write failures |

## Alerting Rules

### Critical Alerts (Page Immediately)
| Alert | Condition | SLO |
|-------|-----------|-----|
| `SLOAvailabilityBurnRateHigh` | 5xx rate > 0.1% for 5m | 99.9% |
| `SLOLatencyBurnRateHigh` | p99 > 2s for 5m | p99 < 2s |
| `SLODBPoolExhaustion` | Pool > 85% for 5m | - |
| `SyntheticProbeDown` | Probe fails for 2m | - |
| `GuardrailViolation` | Any violation > 0 | 0 |

### Warning Alerts (Notify, Don't Page)
| Alert | Condition |
|-------|-----------|
| `SLOAvailabilityBurnRateMedium` | 5xx rate > 0.01% for 15m |
| `SLOLatencyBurnRateMedium` | p95 > 1s for 15m |
| `SLOErrorBudgetWarning` | Monthly budget > 50% consumed |
| `SyntheticProbeHighLatency` | Connect > 2s for 5m |

## Incident Response Procedures

### 1. High Error Rate (5xx Spike)
1. **Check Grafana**: API Overview dashboard → Error Rate panel
2. **Check Logs**: Loki → `job="studentkare-backend" | level="ERROR"`
3. **Check Sentry**: Open Sentry project → Issues → Filter by time
4. **Check Traces**: Tempo → Search by `http.status_code >= 500`
5. **Common Causes**:
   - Database connection pool exhausted
   - External API timeout (payment, SMS, email)
   - Unhandled exception in new code deploy
2. **Mitigation**:
   - Rollback if recent deploy
   - Scale backend replicas: `kubectl scale deployment studentkare-backend --replicas=5`
   - Check DB connections: `kubectl exec -it postgres -- psql -c "SELECT count(*) FROM pg_stat_activity;"`

### 2. High Latency (p99 > 2s)
1. **Check Grafana**: API Overview → Latency panel
2. **Identify Slow Routes**: Group by `route` label
3. **Check DB**: Database Connections dashboard → Query latency
4. **Check Traces**: Tempo → Filter by `duration > 2s`
5. **Common Causes**:
   - Missing DB index
   - N+1 query in new code
   - External API slow (payment gateway, SMS provider)
   - GC pressure in Python

### 3. Database Pool Exhaustion
1. **Check Grafana**: DB Connections → Pool Utilization
2. **Check Active Queries**: `kubectl exec -it postgres -- psql -c "SELECT pid, query, state, query_start FROM pg_stat_activity WHERE state = 'active';"`
3. **Mitigation**:
   - Increase pool size: `kubectl set env deployment/studentkare-backend DB_POOL_SIZE=20`
   - Kill long-running queries
   - Scale DB read replicas

### 4. Synthetic Probe Down
1. **Check Blackbox**: `http://blackbox:9115/probe?target=https://api.studentkare.in/api/health&module=http_2xx`
2. **Check DNS**: `dig api.studentkare.in`
3. **Check TLS**: `openssl s_client -connect api.studentkare.in:443 -servername api.studentkare.in`
4. **Common Causes**:
   - Ingress controller down
   - TLS certificate expired
   - Backend pods not ready
   - Network policy blocking

### 5. Guardrail Violation (Critical)
1. **Check Grafana**: Error Tracking → Guardrail Violations
2. **Check Logs**: Loki → `guardrail_violations_total > 0`
3. **Immediate Action**: This indicates PHI leak, safety bypass, or commerce firewall breach
5. **Escalation**: Page Security Lead + CTO immediately

## Scaling Procedures

### Horizontal Pod Autoscaler (HPA)
```bash
# Backend HPA (already configured)
kubectl get hpa studentkare-backend -n studentkare

# Manual scale
kubectl scale deployment studentkare-backend --replicas=5 -n studentkare
```

### Database Scaling
```bash
# Read replica (if using Cloud SQL/RDS)
# Add read replica via cloud console

# Connection pool tuning
kubectl set env deployment/studentkare-backend \
  DB_POOL_SIZE=20 \
  DB_MAX_OVERFLOW=30 \
  -n studentkare
```

## Backup & Recovery

### Prometheus
- Retention: 30 days / 10GB
- Backup: `promtool tsdb snapshot /prometheus`
- Restore: Copy snapshot to `/prometheus/snapshots/`

### Loki
- Retention: 7 days
- Backup: S3/GCS export via `loki` CLI
- Restore: Re-ingest from backup

### Tempo
- Retention: 3 days
- Backup: S3/GCS export
- Restore: Re-ingest traces

### Grafana
- Dashboards: Git (this repo)
- Datasources: Git (this repo)
- Settings: `grafana.ini` in ConfigMap

## Maintenance Windows

| Task | Frequency | Window |
|------|-----------|--------|
| Prometheus compaction | Daily | 03:00-04:00 UTC |
| Loki retention cleanup | Daily | 04:00-05:00 UTC |
| Tempo compaction | Hourly | Continuous |
| Cert renewal (Let's Encrypt) | 60 days | Auto |
| Dependency updates | Weekly | Sunday 02:00 UTC |

## Useful Commands

```bash
# Port forward for local debugging
kubectl port-forward -n studentkare svc/grafana 3000:3000
kubectl port-forward -n studentkare svc/prometheus 9090:9090
kubectl port-forward -n studentkare svc/alertmanager 9093:9093
kubectl port-forward -n studentkare svc/tempo 3200:3200

# View logs
kubectl logs -n studentkare -l app=studentkare-backend -f
kubectl logs -n studentkare -l app=prometheus -f

# Check alert status
kubectl exec -n studentkare alertmanager-0 -- amtool alert query

# Silence alert
kubectl exec -n studentkare alertmanager-0 -- amtool silence add --comment "Maintenance" alertname=SLOAvailabilityBurnRateHigh

# Check SLO error budget
curl -s "http://prometheus:9090/api/v1/query?query=sum(rate(http_requests_total{status_class='5xx'}[30d]))/sum(rate(http_requests_total[30d]))"
```

## Escalation Contacts

| Role | Name | Slack | Phone |
|------|------|-------|-------|
| Primary On-Call | Rotating | @oncall | +91-XXX-XXX-XXXX |
| Secondary | Rotating | @oncall-backup | +91-XXX-XXX-XXXX |
| Tech Lead | - | @tech-lead | +91-XXX-XXX-XXXX |
| Security Lead | - | @security-lead | +91-XXX-XXX-XXXX |
| CTO | - | @cto | +91-XXX-XXX-XXXX |

## Related Documents

- [Incident Response](./INCIDENT_RESPONSE.md)
- [Disaster Recovery](./DISASTER_RECOVERY.md)
- [Deployment Guide](./DEPLOYMENT_GUIDE.md)
- [Architecture](../ARCHITECTURE.md)