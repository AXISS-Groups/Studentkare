# Incident Response Runbook & Kill-Switch Procedures

**Owner**: Incident Response & Security Operations  
**Compliance**: CERT-In 6-hour Incident Reporting Mandate & DPDP Act 2023

---

## 1. Severity Ladder

| Severity | Definition | Response SLA | Emergency Action |
|---|---|---|---|
| **P0 Crisis** | Active data breach or compromised auth keys | **< 15 minutes** | Immediate global kill-switch, session purge |
| **P1 Major** | Critical feature outage or DB degradation | **< 30 minutes** | Feature kill-switch activated |
| **P2 Moderate** | Non-clinical service interruption | **< 2 hours** | Degraded mode routing |
| **P3 Low** | Minor anomaly or non-critical error spike | **< 24 hours** | Ticket triage |

---

## 2. Emergency Breach Notification Checklist

1. Activate relevant feature kill-switch in `IncidentKillSwitch`.
2. Notify CERT-In (`incident@cert-in.org.in`) within 6 hours of discovery.
3. Notify impacted Data Fiduciaries / Students under DPDP Act rules.
4. Execute Post-Mortem analysis and submit corrective action report.

---

## 3. Observability Stack Integration

### Primary Diagnostic Tools

| Tool | Purpose | Access |
|---|---|---|
| **Grafana** | Dashboards, alerting, log visualization | `https://monitoring.studentkare.in` |
| **Prometheus** | Metrics query, alerting rules | `https://monitoring.studentkare.in/prometheus` |
| **Alertmanager** | Alert routing, silencing | `https://monitoring.studentkare.in/alertmanager` |
| **Loki** | Log aggregation, querying | Internal (via Grafana) |
| **Tempo** | Distributed tracing | Internal (via Grafana) |
| **Sentry** | Exception tracking, error context | `https://sentry.io/organizations/studentkare` |

### Incident Triage Flow

```
1. Alert fires (Prometheus → Alertmanager → Slack)
       │
       ▼
2. Open Grafana → "API Overview" or "Error Tracking" dashboard
       │
       ▼
3. Check Sentry for exception context (stack traces, user impact)
       │
       ▼
4. Query Loki for correlated logs (filter by trace_id, time window)
       │
       ▼
5. If latency issue → Open Tempo → Search by trace_id / service / duration
       │
       ▼
6. Correlate: Metrics (Prometheus) + Logs (Loki) + Traces (Tempo) + Errors (Sentry)
```

### Key Dashboards for Triage

| Incident Type | Primary Dashboard | Secondary |
|---|---|---|
| High 5xx rate | API Overview → Error Rate | Error Tracking |
| High Latency | API Overview → Latency p50/p95/p99 | DB Connections |
| DB Issues | DB Connections | API Overview |
| Synthetic Down | Blackbox Exporter (Grafana) | API Overview |
| Guardrail Violation | Error Tracking → Guardrail | Sentry |

---

## 4. Kill-Switch Procedures

### Global Kill-Switch (P0 Only)
```bash
# Activate via API (requires SUPER_ADMIN)
curl -X POST https://api.studentkare.in/api/v1/ops/kill-switch \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"reason": "Active data breach - CERT-In notification pending"}'
```

### Feature Kill-Switches
| Feature | Endpoint | Effect |
|---|---|---|
| Payments | `POST /api/v1/ops/kill-switch/payments` | Blocks all payment flows |
| Appointments | `POST /api/v1/ops/kill-switch/appointments` | Cancels pending, blocks new |
| Pharmacy | `POST /api/v1/ops/kill-switch/pharmacy` | Blocks orders, dispensing |
| Blood SOS | `POST /api/v1/ops/kill-switch/blood-sos` | Disables emergency matching |

### Reset Kill-Switch
```bash
curl -X POST https://api.studentkare.in/api/v1/ops/kill-switch/reset \
  -H "Authorization: Bearer <token>"
```

---

## 5. Observability-Specific Incident Procedures

### P1: High Error Rate (5xx > 1% for 5min)
1. **Grafana**: API Overview → Error Rate panel
2. **Sentry**: Filter by time → Top issues by frequency
3. **Loki**: `{job="studentkare-backend"} | level="ERROR" | json`
4. **Tempo**: Search traces with `http.status_code >= 500`
5. **Action**: Rollback deploy / scale pods / check DB

### P1: High Latency (p99 > 2s for 5min)
1. **Grafana**: API Overview → Latency panel (group by route)
2. **Tempo**: Filter traces with `duration > 2s`
3. **DB**: Database Connections → Query latency p95/p99
4. **Action**: Check for N+1 queries, missing indexes, external API delays

### P1: Database Pool Exhaustion
1. **Grafana**: DB Connections → Pool Utilization > 85%
2. **Check**: `SELECT count(*) FROM pg_stat_activity WHERE state='active';`
3. **Action**: Increase pool size, kill long queries, add read replica

### P1: Synthetic Probe Down
1. **Grafana**: Blackbox Exporter panel
2. **Test**: `curl -v https://api.studentkare.in/api/health`
3. **DNS**: `dig api.studentkare.in`
4. **TLS**: `openssl s_client -connect api.studentkare.in:443`

### P0: Guardrail Violation
1. **Grafana**: Error Tracking → Guardrail Violations
2. **Sentry**: Search for `guardrail_violation` tag
3. **Action**: Page Security Lead + CTO immediately

---

## 6. Post-Incident Process

1. **Create Incident Record**: Include timeline, impact, root cause
2. **Grafana Snapshot**: Export dashboard snapshots for post-mortem
3. **Sentry Link**: Attach Sentry issue URL to incident
4. **Trace Export**: Download relevant Tempo traces
5. **Log Export**: Export Loki logs for time window
6. **Post-Mortem**: Within 5 business days
7. **Action Items**: Track in project board with owners

---

## 7. Related Documents

- [Observability Runbook](./OBSERVABILITY.md)
- [Disaster Recovery](./DISASTER_RECOVERY.md)
- [Deployment Guide](../DEPLOYMENT_GUIDE.md)