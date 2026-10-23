# 28 — Privacy, Consent & Data Governance (DPDP): Solutions

Answers [audit/28-privacy-consent-data-governance.md](../audit/28-privacy-consent-data-governance.md). Owns **TD-27** (plaintext documents), **TD-47** (campus consoles without consent), **PRIV-03** (archive key custody) and **PRIV-06** (SOS disclosure).

Related items owned elsewhere:
- PRIV-01 (missing keys, TD-40): [25](25-environment-configuration-solutions.md).
- PRIV-05 (unreviewed consent translations, TD-44): [27](27-i18n-accessibility-solutions.md).
- PRIV-07 (Rule L, TD-03): [16](16-database-solutions.md).

> Everything here touches Tier 1 behaviour (consent, clinical data, erasure). Each change needs a named reviewer, and the legal points need counsel.

---

## TD-47 — Campus consoles: consent gate and aggregate-only by default

**Goal:** Campus admins never see a named student's clinical data unless that student gave specific, recorded consent for that purpose. Population views are aggregated, with small-count suppression on the server.

**Steps**
1. **Inventory** the campus console screens (MEO, counsellor, meal/diet, medical leave, isolation; per the team's plan). For each, write down the data it would show and its purpose.
2. **Consent purposes:** extend `ConsentRecord.purposes` (from the `e5a7b3c90d14` model) with campus-specific purposes, for example `campus.medical_leave`. Consent is granular, revocable and versioned, the same as signup consent.
3. **Server gate:** a dependency `require_student_consent(purpose)` that every campus endpoint returning per-student data must use. Default deny.
   ```python
   def campus_student_view(student_id: str, purpose: str, user=Depends(require_campus_admin), db=Depends(workflow_db)):
       if not has_active_consent(db, student_id, purpose):
           raise HTTPException(403, "The student has not shared this with the campus.")
   ```
4. **Aggregates:** campus dashboards read only from views that apply k-anonymity suppression (counts under 5 shown as "<5") in SQL, not in the UI. The `sk_readonly_ops` role ([16](16-database-solutions.md) TD-03) can read only those views.
5. **Audit:** every per-student campus read is written to the audit log with the purpose. Students can see who viewed their data ("Access history"); the break-glass log screen already exists in admin.
6. **Test:** a campus admin without consent gets 403; with consent revoked, 403; aggregates never return a count under 5.

**Verify:** the guard tests pass; no campus endpoint returns per-student fields without the dependency. Add this to the route audit allow-list check ([15](15-api-solutions.md)).
**Effort:** M. **Must land before** any campus clinical endpoint is wired.

---

## TD-27 / PRIV-02 — Encrypt health documents; align backups with the erasure promise

**Goal:** Document bytes are unreadable from a DB dump or backup without a key. Erasure can make data unrecoverable even inside backups (crypto-shredding).

**Approach:** Envelope encryption with a per-account data key.
1. New table `account_keys(account_id, wrapped_dek, created_at)`. The DEK is 32 random bytes, wrapped by `DOCUMENT_MASTER_KEY` (Fernet or AES-GCM; `core/crypto_service.py` already has AES-GCM code, so wire it instead of deleting it, per [03](03-architecture-solutions.md)).
2. `Document.content` stores `nonce || ciphertext`. Read and write go through `services/documents.py`.
3. Migration (expand/contract): add `content_encrypted`, encrypt existing rows in a batch job, switch reads, then drop the plaintext column.
4. **Erasure:** delete the account's `account_keys` row. Every copy of that account's documents, including in backups, becomes unreadable. Update the erasure docstring and the student-facing text accordingly.
5. **Object storage (later):** move the ciphertext to S3-compatible storage, with the DB holding only a pointer. This reduces DB size and backup time ([19](19-scalability-solutions.md)).
6. **Backup retention:** document it in `docs/runbooks/DISASTER_RECOVERY.md` and state it in the privacy notice. With crypto-shredding, the backup retention period no longer conflicts with erasure.

**Verify:**
- `SELECT content FROM care_documents` shows no `%PDF-` magic bytes.
- After erasure plus key deletion, decryption fails.
- An upload and download round-trip test passes.

**Effort:** M–L. **Depends on:** TD-40 key plumbing ([25](25-environment-configuration-solutions.md)).

---

## PRIV-03 — Erasure archive key custody
1. **Runbook** `docs/runbooks/DPDP_ARCHIVE_KEYS.md`:
   - who holds `DPDP_ARCHIVE_KEY` (vault path, at least 2 custodians);
   - how to rotate it (re-wrap the archives, below);
   - how archives are destroyed at the end of retention;
   - how super-admin reads are approved and logged (the code already requires a reason).
2. **Per-archive keys:** each archive gets its own data key, wrapped by the master key. Destroying an archive means deleting its wrapped key, and rotating the master key means re-wrapping the small keys, not re-encrypting the data.
3. **Retention job alerting:**
   - an alert when an archive passes its retention date and still exists;
   - an alert when erasure requests are due but paused for a missing key (PRIV-01).
4. **Legal:** confirm `DPDP_ARCHIVE_RETENTION_DAYS` with counsel, as the `.env.example` comment already asks, and record the answer in an ADR ([10](10-documentation-solutions.md) ADR-0008).

**Effort:** S (runbook and alerts), M (per-archive keys).

---

## PRIV-06 — SOS third-party disclosure
- **Privacy notice and DPIA entry:** SOS sends the student's name, time and location to the configured campus security numbers and the emergency contact via WhatsApp, through OpenWA. Name WhatsApp/Meta as the processor or channel.
- **In-product:** the first time a student sets an emergency contact, or before the first SOS, say in plain words who gets told and what is sent. This is a Tier 1 copy change, so it needs a reviewer.
- **Data minimisation:** the location text should be the coarsest that is still useful, such as a campus building rather than raw GPS, unless the student opts in to precise location. Confirm with the product owner.

**Effort:** S.

---

## Ongoing governance
- Keep a **Record of Processing** (`docs/security/PROCESSING_REGISTER.md`): purpose, data, legal basis or consent purpose, retention and processors for each feature. Update it in the same PR as any new data flow (PR template checkbox).
- Run a **quarterly DPDP review** covering consent versions, erasure SLA metrics, archive destruction and processor list changes (`VENDOR_REGISTER.md`).
- **Ayush chat history:** the team's open question is how to clear chats kept before `0e10f97` for students who never opted in. Recommended: a one-off migration that deletes chat content for every account without the history opt-in, run after a product-owner decision. It is a data deletion, so make a backup snapshot first and log the count.
