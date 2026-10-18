# Tier 1 audit fixes: plans awaiting review

**Status:** active. These are plans only; no code has been written for any of them.
**Rule:** `CLAUDE.md`, Tier 1 (safety, consent, identity, clinical values). Each plan needs
approval from a named reviewer before its branch is opened. Write the approver's name and the
date in the **Approved by** line.

Each plan is one ticket, one branch and one PR.

---

## 1. SCALE-01: personal SOS sends through the urgent outbox

**Approved by:** _(clinical lead or repository owner)_

**Today.** `POST /api/emergency/sos` (`backend/services/emergency_api.py`, `raise_sos`) commits
the alert and the console event. It then sends each campus-security WhatsApp and the
emergency-contact WhatsApp **inline**, one after another, before it responds. With a slow
provider, the student's screen waits on the HTTP timeouts, and a request that dies mid-loop
leaves some sends unattempted.

**Change.**
1. In the same transaction as the alert, enqueue one `OutboxEvent` per recipient with
   `event_type="SOS_CONTACT"` and dedupe key `sos:<alert_id>:<recipient>`, then return
   straight away. Add `SOS_CONTACT` to `URGENT_EVENT_TYPES` and `EXTERNAL_EVENT_TYPES`. It
   runs first in every worker pass (`URGENT_JOBS`, audit TD-49).
2. Record each `SosDelivery` row as `QUEUED`. The worker's delivery outcome updates it to
   `SENT` or `FAILED` with the provider's reason. The student and campus console show the real
   status (the SOS screen already polls `GET /api/emergency/sos`).
3. The message text stays the same and is built at enqueue time. The outbox payload holds only
   what the message needs (name, time, location note), never health data.
4. No repeat sends. An unknown outcome is surfaced for a human (existing outbox semantics); it
   is never retried automatically.

**Tests.** Response time does not depend on the provider (fake transport sleeps 10 s, response
< 1 s). One outbox row per recipient. A second press creates nothing. A failed send shows
`FAILED` with a reason. The worker delivers urgent rows before other jobs.

**Risk.** If the worker is down, nothing is sent. The `UrgentDeliveryStale` alert (TD-49) must
be deployed **before** this change ships.

---

## 2. PRIV-08 and TD-47: lawful basis for the counsellor crisis queue; consent gate for campus consoles

**Approved by:** _(clinical lead and DPO, or privacy owner)_

**Today.** `GET /api/ops/crisis-events` shows campus counsellors crisis signals from students
on their campus. No decision record names the lawful basis, and the privacy notice does not say
so. Other campus consoles (MEO, diet, leave, isolation) were built to show named students'
clinical data and have not been traced (TD-47).

**Change.**
1. A decision record (ADR) stating the lawful basis for the queue (for example, vital interest
   or consent at sign-up), signed off by the clinical lead.
2. One sentence in the privacy notice and the sign-up consent text: crisis signals reach your
   campus counsellor. This changes consent copy, so it needs the same review as below (section 3).
3. A server-side gate, `require_campus_consent(scope)`. Every campus endpoint that returns a
   named student's clinical data checks a recorded, unrevoked consent for that scope, and
   refuses (fail closed) without one. This is added before any further campus clinical
   endpoint ships. Existing ones are traced and listed in the PR.

**Tests.** No consent: 403. Revoked: 403. A different campus: 404. The audit log records each read.

---

## 3. TD-44: unreviewed Telugu/Hindi copy on crisis and consent surfaces

**Approved by:** _(clinical lead for crisis wording; native-speaker reviewer)_

**Today.** `REVIEW_STATUS = { te: 'unreviewed', hi: 'unreviewed' }` (`src/i18n/index.tsx`).
Users can select them, and the UI only shows an info note.

**Change (pick one with the reviewer).**
- **A. Surface gate (recommended).** Crisis, SOS, consent and clinical-result keys
  (`crisis.*`, `sos.*`, `member.consent.*`, `auth.consent.*` and others; the list goes in the
  PR) render in English, next to the translation, while their language is `unreviewed`. The
  rest of the UI stays translated.
- **B. Language gate.** Hide te/hi in production builds until review.

Either way, flipping a language to `reviewed` requires the reviewer's name in the commit.

**Tests.** With `te` selected, the crisis screen and consent block show the English text.
Other screens show Telugu.

---

## 4. TD-27: health documents stored as plaintext `bytea`

**Approved by:** _(repository owner; security reviewer)_

**Today.** `Document.content` and two other `LargeBinary` columns
(`backend/core/workflow_models.py`) hold uploaded reports in plaintext in Postgres.

**Change.**
1. Envelope encryption. Each document gets a random data key and AES-GCM. The data key is
   wrapped by `DOCUMENT_KEK` (a Fernet or KMS key from the vault). New columns: `content_enc`,
   `wrapped_key` and `key_id`.
2. A migration adds the columns. A batched worker job encrypts existing rows and then clears
   `content`, recording progress. Reads accept both forms until the backfill reports zero
   plaintext rows. A later migration then drops `content`.
3. Erasure: destroying the wrapped key makes the ciphertext unreadable (crypto-shred). This
   fits ADR 0001, because the sealed archive keeps its own encryption.
4. No key means no upload and no download (fail closed). Feature-key reporting covers
   `DOCUMENT_KEK` (`services/feature_keys.py`).

**Tests.** Round-trip. A wrong key fails. The backfill is idempotent and resumable. No
plaintext remains after the backfill. Erasure leaves nothing readable.

---

## 5. Move `src/modules/m04-emergency` (SOS) into `src/features/emergency`

**Approved by:** _(repository owner)_

**Today.** The SOS screen, view model, store and repository live in `src/modules/m04-emergency`.
They are imported by `src/features/emergency/screens/SosRouteScreen.tsx`, `src/native/App.tsx`
and `src/modules/index.ts`. All other `src/modules` slices were removed
(`chore/delete-src-modules`).

**Change.** A pure move, with no behaviour change:
`view/` → `features/emergency/views/`, `viewmodel/` → `features/emergency/viewmodel/`,
`state/` → `features/emergency/store/`, `data/` → `features/emergency/model/`, and the tests
alongside. The duplicate pairs (`EmergencyRepository.ts`/`emergency.repository.ts`,
`EmergencyStore.ts`/`emergency.store.ts`) are resolved to one file each, keeping the one that is
imported. Imports are updated, `src/modules` is deleted, and the m04 exception is dropped from
the ESLint module ban.

**Tests.** Existing SOS tests pass unchanged apart from paths. Manual check on web and native:
press SOS, see delivery statuses, cancel.
