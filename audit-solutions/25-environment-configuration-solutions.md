# 25 — Environment, Configuration & Secrets: Solutions

Answers [audit/25-environment-configuration.md](../audit/25-environment-configuration.md). Owns **ENV-01 (TD-01 residual), TD-40, ENV-04, ENV-05**. TD-41 (dev sign-in) is owned by [09](09-installation-solutions.md).

---

## ENV-04 — One typed settings module (foundation for the rest)

**Goal:** One place declares every environment variable, with its default, whether production requires it, and which feature depends on it. Docs and example files are generated from that place, so they cannot drift.

**Approach:** Add a `pydantic-settings` `Settings` class in `backend/core/settings.py`. Move consumers over gradually. Start with the security-relevant variables.

**Proposed change (sketch)**
```python
# backend/core/settings.py
from functools import lru_cache
from typing import Literal
from pydantic import Field, field_validator
from pydantic_settings import BaseSettings, SettingsConfigDict

Env = Literal["development", "testing", "production"]

class Settings(BaseSettings):
    model_config = SettingsConfigDict(env_file=None, extra="ignore")

    app_env: Env = Field("production", alias="APP_ENV")   # unset ⇒ production (fail closed)
    database_url: str = Field(..., alias="DATABASE_URL")
    otp_hash_secret: str = Field("", alias="OTP_HASH_SECRET")

    # Feature keys. Empty means the feature is disabled (fail closed) and reported at startup.
    two_factor_encryption_key: str = Field("", alias="TWO_FACTOR_ENCRYPTION_KEY")
    pass_signing_secret: str = Field("", alias="PASS_SIGNING_SECRET")
    dpdp_archive_key: str = Field("", alias="DPDP_ARCHIVE_KEY")
    dpdp_archive_retention_days: int | None = Field(None, alias="DPDP_ARCHIVE_RETENTION_DAYS")
    integrations_encryption_key: str = Field("", alias="INTEGRATIONS_ENCRYPTION_KEY")

    # Local-only conveniences, ignored unless app_env is development/testing.
    seed_demo_data: bool = Field(False, alias="SEED_DEMO_DATA")
    dev_otp_console: bool = Field(False, alias="DEV_OTP_CONSOLE")

    @field_validator("app_env", mode="before")
    @classmethod
    def unknown_is_production(cls, v: object) -> str:
        v = str(v or "").strip().lower()
        return v if v in ("development", "testing") else "production"

    @property
    def is_dev_or_test(self) -> bool:
        return self.app_env in ("development", "testing")

@lru_cache
def settings() -> Settings:
    return Settings()  # type: ignore[call-arg]
```
`pydantic-settings` is a new dependency. Add it to `backend/config/requirements.txt` with an exact pin (rule: never invent a dependency without adding it to the lockfile).

**Steps**
1. Add the module and a unit test covering unset, unknown and mixed-case `APP_ENV`.
2. Replace direct `os.getenv("APP_ENV"…)` reads one module at a time. Start with the ENV-01 list below.
3. Add a script `backend/scripts/env_table.py` that prints a Markdown table of the fields. CI fails if `docs/configuration.md` differs from its output.

**Verify:** `git grep 'getenv("APP_ENV"'` returns 0 hits in `backend/services` and `backend/app`.
**Effort:** M (incremental). **Depends on:** none.

---

## ENV-01 — One `APP_ENV` meaning everywhere

**Goal:** An unset or unknown `APP_ENV` behaves as production in every module.

**Changes (sketch, all using `settings()`)**
| File | Today | Change |
|---|---|---|
| `backend/app/main.py:17` | `os.getenv("APP_ENV", "development")` | `APP_ENV = settings().app_env` |
| `backend/services/workflow_auth.py:93` | `secure=os.getenv("APP_ENV") == "production"` | `secure=not settings().is_dev_or_test` |
| `backend/services/otp_delivery.py:47` | `os.getenv("APP_ENV", "development") != "production"` | `settings().is_dev_or_test` |
| `backend/services/demo_seed.py`, `twofa_store.py`, `workflow_auth.py` `dev_console_delivery_enabled` | own parsing | `settings()` |

**Verify:** new test `test_app_env_defaults.py`. With `APP_ENV` unset:
- the startup guard requires `OTP_HASH_SECRET`;
- `lifespan` runs migrations, or refuses if the migration job hasn't run (see [16](16-database-solutions.md));
- the `sacare_session` cookie has the `Secure` flag;
- `available_channels()` returns `[]` when no provider is configured.

**Effort:** S. **Risk:** A local developer who never set `APP_ENV` now gets production behaviour. That is intended; `.env.dev.example` sets `APP_ENV=development`. Note it in CONTRIBUTING.

---

## TD-40 — Supply feature keys to every deploy path; report missing keys

**Goal:** Production deploys from the repo's own configs have every key that 2FA, passes, erasure and the integration vault need. Any missing key is visible at startup and in health output.

**Steps**
1. Add the keys to `.env.prod.example` (placeholders only):
   ```dotenv
   # Fernet keys: python -c "from cryptography.fernet import Fernet; print(Fernet.generate_key().decode())"
   TWO_FACTOR_ENCRYPTION_KEY=<FILL_VIA_VAULT>
   DPDP_ARCHIVE_KEY=<FILL_VIA_VAULT>
   INTEGRATIONS_ENCRYPTION_KEY=<FILL_VIA_VAULT>
   # 32+ random bytes: openssl rand -hex 32
   PASS_SIGNING_SECRET=<FILL_VIA_VAULT>
   # Days the sealed erasure archive is kept. Confirm with legal counsel.
   DPDP_ARCHIVE_RETENTION_DAYS=<NUMBER>
   ```
2. In `docker-compose.prod.yml` `backend.environment`, require them:
   ```yaml
   TWO_FACTOR_ENCRYPTION_KEY: ${TWO_FACTOR_ENCRYPTION_KEY:?Set from vault}
   PASS_SIGNING_SECRET: ${PASS_SIGNING_SECRET:?Set from vault}
   DPDP_ARCHIVE_KEY: ${DPDP_ARCHIVE_KEY:?Set from vault}
   DPDP_ARCHIVE_RETENTION_DAYS: ${DPDP_ARCHIVE_RETENTION_DAYS:?Set retention days}
   INTEGRATIONS_ENCRYPTION_KEY: ${INTEGRATIONS_ENCRYPTION_KEY:?Set from vault}
   ```
3. In Helm `templates/01-backend.yaml`, add `secretKeyRef` entries from `studentkare-secrets`, following the existing pattern for `OTP_HASH_SECRET`. Also add them to the `values/production.yaml` `secrets:` placeholder list and to the `kubectl create secret` command in `docs/DEPLOYMENT_GUIDE.md`.
4. Add a startup feature report (does not refuse to boot, because the features already fail closed individually):
   ```python
   # backend/app/main.py, inside lifespan()
   FEATURE_KEYS = {
       "two_factor": ["TWO_FACTOR_ENCRYPTION_KEY"],
       "check_in_pass": ["PASS_SIGNING_SECRET"],
       "dpdp_erasure": ["DPDP_ARCHIVE_KEY", "DPDP_ARCHIVE_RETENTION_DAYS"],
       "integration_vault": ["INTEGRATIONS_ENCRYPTION_KEY"],
   }
   disabled = {f: [k for k in keys if not os.getenv(k)] for f, keys in FEATURE_KEYS.items()}
   disabled = {f: ks for f, ks in disabled.items() if ks}
   for feature, keys in disabled.items():
       logger.error("feature %s DISABLED: missing %s", feature, ",".join(keys))  # names only, never values
   app.state.disabled_features = sorted(disabled)
   ```
   Expose `disabledFeatures` (names only) on a super-admin readiness endpoint, and alert when `two_factor` or `dpdp_erasure` is disabled in production.
5. Consider refusing to boot in production when `TWO_FACTOR_ENCRYPTION_KEY` is missing. Without it, super admins are locked out by the enforced-2FA policy. Decide with the owner; it is a defensible fail-closed choice.

**Verify:**
- The compose prod-overlay config check in CI fails without the vars. Update the CI step to pass dummy values.
- A test asserts the startup log line appears when a key is missing.

**Effort:** S. **Depends on:** ENV-04 is helpful but not required.

---

## ENV-05 — Alertmanager webhook must not accept unsigned requests outside dev
`backend/services/alerts.py:77-80`: when the secret is unset and the environment is not dev/test, return 503 or 401 instead of processing the request.
```python
secret = os.getenv("ALERTMANAGER_WEBHOOK_SECRET", "")
if not secret:
    if not settings().is_dev_or_test:
        raise HTTPException(503, "Alert webhook is not configured.")
else:
    ...existing verification...
```
**Verify:** test with `APP_ENV` unset and no secret → 503. **Effort:** S.

---

## Ongoing hygiene
- Every new environment variable PR updates `core/settings.py`. CI regenerates the table (ENV-04 step 3).
- Secrets go only into the vault, Helm SealedSecrets, or a local `.env`, never into `EXPO_PUBLIC_*` or `VITE_*` variables. Add a gitleaks rule for `EXPO_PUBLIC_.*(KEY|SECRET)`.
