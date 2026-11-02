# Tier 1 plan: emergency card in the phone wallet (2026-10-24)

**Decision (Krishna Chintakayala, founder and named reviewer, 24 Oct 2026):** the emergency card can be
added to the phone's wallet (Apple Wallet, Google Wallet) so it is there without a connection. This
reverses D6-2 ("no offline card") for the wallet only: nothing is stored by the Studentkare app on the
phone; the copy lives in the wallet the student chose.

**Also decided:** the Profile line `m2.prof.emergencyBody` said "Works offline" while the card said it is
not kept on the phone. The words now follow the facts: until the student has a pass in a wallet it says
the card is not kept on the phone; once a pass is in a wallet it says "In your phone's wallet". The
delete-account grace period stays 7 days (`privacy.deletion_grace_days`, unchanged).

**Reviewers still owed:** legal (the consent wording, the lock-screen and Google-server statements) and
the clinical lead (which fields are on by default). Until they sign, both wallets stay **off** through
the settings registry (`emergency_card.wallet_apple_enabled`, `emergency_card.wallet_google_enabled`,
default `false`); nothing a student sees changes except the honest Profile line.

---

## 1. What the student gets

On the emergency card (phone `/emergency-card`, desktop `/emergency-card`, Expo `EmergencyCard`):

- **Add to Apple Wallet** and/or **Add to Google Wallet**, shown only when that wallet is turned on in
  settings **and** its credentials are present on the server. No credentials → no button, no promise.
- Before adding, a sheet: **"Choose what goes on the pass"**.
  - On by default: name, blood group, one emergency contact (name and number), "Call 112" and
    Tele-MANAS 14416.
  - Off by default, each its own switch in plain words: allergies, health conditions, medicines.
  - Above the switches, always visible: *anyone holding your phone can read a wallet pass from the
    lock screen.* For Google: *Google Wallet keeps passes on Google's servers* and an explicit consent
    tick (recorded with its wording version). For Apple: *the pass is kept on your Apple devices; we
    don't send its contents to Apple.*
- Status under the buttons: "In Apple Wallet · updated <time>", "In Google Wallet · updated <time>",
  "Not in your phone's wallet", "Removing…" while a removal is still being sent.
- **Remove from wallet**: voids the pass (see §3) and, for Google, the consent stays as it was (the
  student withdraws it on Privacy & consent, which also removes the pass).
- Profile "Emergency card" row: "… Not kept on this phone." or "… In your phone's wallet."
- Digital ID: not changed. The check-in pass is a separate thing and carries no clinical value.

## 2. Privacy analysis

| Question | Answer |
|---|---|
| What leaves Studentkare? | Only the fields the student switched on, plus the fixed 112 / Tele-MANAS lines. Built server-side from the student's own profile (`GET /api/profile` data) and active medication plan names (medicines, only if switched on). |
| Where does it go? | **Apple:** a signed `.pkpass` file downloaded to the device; Apple Wallet keeps it on the device (and the student's other Apple devices if iCloud syncs Wallet). Update notices go through Apple Push (APNs) with an **empty payload**; the device then fetches the new pass from our server with the pass's own token. **Google:** the pass object is written to Google's Wallet API, so its contents are stored and processed by Google (third-party processing, DPDP s.8) — hence explicit consent. |
| Lock screen | Wallet passes can be opened from the lock screen by anyone holding the phone. That is the point of an emergency card, and the student is told so before adding. Default fields are the ones a responder needs; clinical detail is opt-in. |
| Consent | Google: a new optional purpose `WALLET_GOOGLE` in the consent ledger (`care_consent_records`, wording version `wallet-google-2026-10-24`), recorded when the student adds the pass, listed on Privacy & consent, withdrawable there. **Withdrawing revokes the Google pass.** It can't be turned on from the privacy page (it needs the field picker first). Apple: no third party holds the contents, so no separate consent; adding the pass is the student's own action, audited. |
| Revocation | Removing the pass, deleting the card's contents does not remove a pass (the pass simply updates); **requesting account deletion, withdrawing Google consent, leaving campus** (on the effective date) void every pass. Voided passes are rewritten with **no health data** before they are voided, so the copy left on a phone or on Google says only "removed". Apple: `voided: true` + push; Google: object state `INACTIVE`, text cleared. |
| URLs | No health data in any URL. Apple web service paths carry only the pass type id, a random 32-hex serial and Apple's device id. The Google "save" link is a signed JWT that names the object id only; the object itself is written server-to-server first. Pass downloads use a single-use random token (5 minutes, `emergency_card.wallet_download_minutes`). |
| Logs, analytics | None of the pass contents, tokens or push tokens are logged; audit rows carry action + pass id only. No analytics events. |
| Secrets | Apple Pass Type ID certificate + key, WWDR certificate, team id; Google issuer id + service-account key — environment variables (vault / Helm secret), never committed. A missing or unreadable secret means that wallet is off (fail closed). |
| Rule L | New tables `care_wallet_passes`, `care_wallet_registrations` are on the **clinical** plane (they hold which health fields a student chose and device push tokens tied to that). |
| Erasure | Both tables hang off `care_accounts`, so the erasure sweep seals and deletes them. Passes are voided when deletion is **requested** (not at erasure), so the 7-day grace does not leave a live pass behind; cancelling deletion does not bring the pass back — the student adds it again. |

## 3. How it works (server)

- `services/wallet_passes.py` (router `/api/wallet/emergency-card` for the student, `/api/wallet/apple/v1/...`
  for Apple's PassKit web service).
- `services/wallet_apple.py`: builds `pass.json` (generic style), `manifest.json` (SHA-1 of each file),
  `signature` (PKCS#7 detached, SHA-256, pass cert + WWDR chain, `cryptography`), zips the `.pkpass`.
  The per-pass `authenticationToken` is an HMAC of the serial under `APPLE_WALLET_AUTH_SECRET` (never
  stored). APNs: HTTP/2 to `api.push.apple.com` with the pass certificate, topic = Pass Type ID, body `{}`.
- `services/wallet_google.py`: RS256 JWTs from the service-account key (`cryptography`), OAuth token
  for scope `wallet_object.issuer`, class insert once, object insert / update, `INACTIVE` to revoke; save
  link `https://pay.google.com/gp/v/save/<jwt>` with `genericObjects: [{id}]` only.
- Content changes: after a profile save, and in a `wallet_passes` worker job every 5 minutes, each active
  pass's content is rebuilt and hashed; a changed hash bumps `updated_at` and queues a push. Pushes that
  fail stay queued and are retried by the job (audited).
- Settings: `emergency_card.wallet_apple_enabled`, `emergency_card.wallet_google_enabled` (bool, public,
  default false), `emergency_card.wallet_download_minutes` (int, 5).

## 4. States

Loading (wallet status skeleton), not available (no buttons; nothing said about wallets), available and
not added, picker open, adding (busy), add failed (calm error, nothing added, nothing recorded), added
(status with time), update pending, removing, removed, Google consent withdrawn elsewhere (shows "Not in
your phone's wallet"), offline (buttons disabled with "Needs a connection"). Call 112 stays in every state.

## 5. Not changing

Field rules on the card; allergies red; hidden middle digits on the card itself (the pass shows the full
number: a responder must be able to dial it); print; the 7-day deletion grace; Digital ID.

## 6. Risks

- **Out-of-date data on a lock screen.** Mitigated by pushes on every change and the 5-minute sweep;
  the pass shows "Updated <date>". A device that is offline keeps the last copy — that is the purpose.
- **A third party holding health data (Google).** Off by default, explicit consent, opt-in fields,
  revocation on withdrawal.
- **A pass outliving the account.** Voided at deletion request, campus departure and consent withdrawal.
- **Wrong-person.** The pass is built only from the signed-in student's own records; the download token
  is single-use and short-lived.

## 7. Tests

Pass content only includes opted-in fields; Google needs consent; withdraw / delete request / leave
campus revoke; a profile change queues and sends an update; no health data in logs; `.pkpass` manifest
and PKCS#7 signature verify against a test certificate made in the test; JWT claims (iss, aud, typ,
origins, object id only); Apple web-service auth; availability hidden without credentials.

> **Decision:** ☑ Approved by Krishna Chintakayala, 2026-10-24 (build). ☐ Legal sign-off on wording.
> ☐ Clinical lead sign-off on default fields. Both wallets stay off until both are ticked.
