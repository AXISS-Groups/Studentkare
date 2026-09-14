# Member profiles, Digital ID, and ambient interface

Implemented in the authenticated **web workspace** on 14 September 2026.

## Member experience

- Open **My profile** (`/#/profile`) to edit your name, birth date, campus/roll details, blood group, emergency contact, allergies and long-term conditions. Changes are validated and saved to the signed-in account.
- Sign-in email/phone remain read-only: changing a verified login identifier needs its own verification flow.
- Changing name, birth date, university or roll number resets identity verification and revokes the existing QR. Existing campus submissions return to pending review.
- Campus submissions and administrator decisions now synchronize university/roll details with the account. Only campus administrators and super administrators can approve affiliations; self-approval is rejected.
- **Print contact card / save PDF** prints a separate self-reported contact/blood-group card. It intentionally excludes the private medical lists. Physical copies cannot be remotely updated.
- Open **Digital ID** (`/#/digital-id`) and choose **Create Digital ID**. The QR is generated locally by the backend with `qrcode==8.2`; no third-party QR service receives its content.
- Download the actual SVG QR, print the full member card, replace the QR, or revoke it. Replacement invalidates the previous code. These actions do not delete the account.

## Staff verification

Campus administrators, clinicians and super administrators can open **Digital ID → Verify a member card**. Read the QR as text using a scanner/camera app and paste its `SACARE-ID:…` value into the form. In-app camera scanning is not implemented in this release.

Verification requires an authenticated session and CSRF token. It returns only the member number, name, campus, roll number and current affiliation status. It does not return birth date, contact information, blood group, allergies or health records. Possession of a valid QR does not prove the presenter is the named individual.

The code contains an account reference plus a cryptographically random secret, with no embedded clinical data. It is a revocable online lookup code, not a signed offline credential. Current affiliation status is read at verification time. Verification fails after revocation, replacement or account deactivation; it is rate-limited and audited. Audit records omit QR secrets and profile field values.

## API and persistence

| Endpoint | Access | Behavior |
| --- | --- | --- |
| `GET /api/profile` | Owner | Whitelisted profile fields; `Cache-Control: no-store`. |
| `PATCH /api/profile` | Owner + CSRF | Partial update; rejects extra/privileged fields, nulls, invalid dates/phones and oversized lists. |
| `GET /api/identity` | Owner | Current card and QR if issued; does not create one on read. |
| `POST /api/identity` | Owner + CSRF | Issue/replace with a new random secret; limited to 20 per hour. |
| `DELETE /api/identity` | Owner + CSRF | Revoke the current secret; idempotent. |
| `POST /api/identity/verify` | Campus/clinical/super-admin + CSRF | Check current validity; limited to 60 attempts per minute per staff account. |

Uses the existing `care_accounts.profile` JSON column and campus verification table, so no schema migration is required. The owner-only QR secret is never included in the session or profile payload. Sensitive responses use `no-store`; QR codes and medical fields are not persisted in browser local storage. Account writes acquire the account row lock on databases supporting `SELECT FOR UPDATE`.

This is a **Studentkare member ID**, not an ABHA account, Aadhaar verification, medical eligibility proof, Apple Wallet pass or Google Wallet pass. Those require separate partner/issuer integrations. The legacy flow screens remain unmounted; new functionality uses the active route registry and authenticated APIs.

## Visual layer

`AmbientBackground` adds lavender/mint/peach radial gradients, gently moving vector orbits and wave lines behind the shared app shell. `CareLoader` supplies the vector loading mark for route and data-loading states. Animation uses CSS transforms/opacity without a JavaScript frame loop or external image assets.

Supports light/dark appearance and the existing **Display settings → Reduce interface motion** preference, as well as the system `prefers-reduced-motion` setting. Decorative layers do not accept pointer events, are hidden from assistive technology and are removed when printing.

## Verification

- `PYTHONPATH=backend backend/.venv/bin/pytest`
- `npm test`
- `npm run lint`
- `npm run build`
- `node tests/member-profile.smoke.mjs` (requires Playwright, or `PLAYWRIGHT_MODULE` pointing to a compatible browser driver).

The smoke runner starts isolated loopback API/Vite servers and a temporary database, checks persisted profile editing, QR reload/download/replacement/revocation, staff verification, print visibility, 320/390px layouts, and reduced motion. `SCREENSHOT_DIR` optionally saves visual evidence; `WORKFLOW_TEST_TMP` chooses its temporary parent directory. No production records are used.

For next development priorities and the researched integration shortlist, see [100 open-source healthcare candidates](research/healthcare-open-source-100.md).
