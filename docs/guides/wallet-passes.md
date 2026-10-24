# Emergency card in the phone wallet: setting it up

For Krishna (or whoever holds the Apple and Google accounts). Plan and privacy analysis:
`docs/plans/tier1-emergency-card-wallet-2026-10-24.md`.

Both wallets are **off** until two things are true:

1. **Credentials** are set on the server (below). Without them the button is never shown.
2. **The setting** is turned on: Super admin → Settings → `emergency_card.wallet_apple_enabled` /
   `emergency_card.wallet_google_enabled` (reason required, audited). Do this only after legal has signed
   the wording (`src/i18n/areas/wallet.ts`, `backend/core/wallet_copy.py`, the plan) and the clinical lead
   has signed the default fields.

Every variable goes in the vault / Helm `backend.secrets` (`deploy/helm/studentkare/values/production.yaml`)
or the prod compose environment. Nothing is committed. `APP_BASE_URL` must be `https://…`: Apple Wallet only
talks to an https web service, and Google checks the origin of the save button.

---

## Apple Wallet

You need a paid Apple Developer account (the one the iOS app is published from).

1. **Pass Type ID.** developer.apple.com → Certificates, Identifiers & Profiles → Identifiers → **+** →
   *Pass Type IDs* → description "Studentkare emergency card", identifier
   `pass.co.studentkare.emergency` (any `pass.` id you own). → `APPLE_WALLET_PASS_TYPE_ID`.
2. **Team id**: top right of the developer site (10 characters). → `APPLE_WALLET_TEAM_ID`.
3. **Certificate.** On a Mac: Keychain Access → Certificate Assistant → *Request a Certificate From a
   Certificate Authority* → save to disk. On the Pass Type ID page → *Create Certificate* → upload the
   request → download `pass.cer`. Then:
   ```sh
   openssl x509 -inform DER -in pass.cer -out pass-cert.pem
   # Export the private key from Keychain as pass.p12 (set a password), then:
   openssl pkcs12 -in pass.p12 -nocerts -out pass-key.pem          # asks for the .p12 password, then a PEM password
   ```
   → `APPLE_WALLET_CERT_PEM` (contents of `pass-cert.pem`), `APPLE_WALLET_KEY_PEM` (contents of
   `pass-key.pem`), `APPLE_WALLET_KEY_PASSWORD` (the PEM password; leave empty if you used `-nodes`).
   A value may be the PEM text itself or `base64 -w0` of it (easier in some vaults).
4. **WWDR intermediate.** Download *Worldwide Developer Relations – G4* from
   apple.com/certificateauthority, then `openssl x509 -inform DER -in AppleWWDRCAG4.cer -out wwdr.pem`.
   → `APPLE_WALLET_WWDR_PEM`.
5. **Auth secret.** `openssl rand -hex 32` → `APPLE_WALLET_AUTH_SECRET`. Each pass's web-service token is
   derived from it; changing it stops every existing pass from updating (students would add the card again).
6. The certificate also signs update pushes to APNs (HTTP/2, `api.push.apple.com:443`): the backend and the
   worker must be able to reach that host. The certificate expires after a year: renew it before then and
   replace the two PEM values (the Pass Type ID stays the same, so existing passes keep working).

Apple calls `https://<APP_BASE_URL>/api/wallet/apple/v1/...` (register, unregister, list updated passes, get
the latest pass, log). The ingress already routes `/api`.

## Google Wallet

1. pay.google.com/business/console → *Google Wallet API* → create the issuer account (business name
   "Studentkare"). Note the **Issuer ID** (digits). → `GOOGLE_WALLET_ISSUER_ID`.
2. Google Cloud console (any project you own) → enable **Google Wallet API** → IAM → Service accounts →
   create `studentkare-wallet` → Keys → *Add key* → JSON. → `GOOGLE_WALLET_SERVICE_ACCOUNT_JSON` (the JSON
   text, or `base64 -w0` of it).
3. Back in the Wallet console → *Users* → invite the service account's email as **Developer**.
4. New issuers start in **demo mode**: only test accounts you add can save passes. Ask Google for publishing
   access (Wallet console → *Google Wallet API* → *Request publishing access*); they review the pass design.
   The class `<issuer>.studentkare_emergency_card` is created by the backend on the first pass.

## Testing

- **Backend**: `cd backend && python -m pytest tests/test_wallet_passes.py -q` (makes its own test
  certificate; nothing reaches Apple or Google).
- **Apple, for real**: with the variables set on staging (https), turn on
  `emergency_card.wallet_apple_enabled`, open the emergency card in Safari on an iPhone (or the iOS app) →
  *Add to Apple Wallet* → choose fields → Apple's "Add" sheet. Then change your blood group: the pass should
  update within seconds (or at the next `wallet_passes` worker run, every 5 minutes). *Remove from Apple
  Wallet* turns the pass into an empty "removed" card. Settings → Developer → *Allow HTTP Services* is
  **not** needed because the web service is https.
- **Google, for real**: in demo mode add your Google account as a test user, turn on
  `emergency_card.wallet_google_enabled`, tick the consent, save. Withdraw "Emergency card in Google Wallet"
  on Privacy & consent: the pass turns inactive and empty.
- **Ops**: a pass update that keeps failing raises a CRITICAL ops event `WALLET_PASS_PUSH_FAILED` after
  `emergency_card.wallet_push_max_attempts` tries. Audit actions start with `WALLET_PASS_`.

## What students see (and what they don't)

- Default on the pass: name, blood group, one emergency contact (full number so a responder can call), Call
  112 and Tele-MANAS 14416. Allergies, health conditions and medicines only if the student switches each on.
- Told before adding: anyone holding the phone can read the pass from the lock screen; Google stores Google
  passes (explicit consent, wording `wallet-google-2026-10-24`); Apple passes stay on their Apple devices.
- The pass is voided and emptied when they remove it, withdraw the Google consent, ask to delete their
  account, or leave campus.
