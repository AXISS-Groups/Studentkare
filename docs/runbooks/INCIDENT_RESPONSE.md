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
