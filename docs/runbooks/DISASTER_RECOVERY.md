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
