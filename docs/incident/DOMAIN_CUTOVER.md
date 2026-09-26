# Own-Domain Readiness & Cutover Runbook (G0.4)

## Overview
This runbook documents environment variable settings, cookie domain scoping, CORS origin management, Content Security Policy (CSP), and DNS cutover steps for transitioning StudentKare from temporary development hostnames to the production domain (`studentkare.co` / `care.studentkare.co`).

---

## 1. Environment Variables Configuration

### Production Environment (.env.production)
```ini
APP_BASE_URL=https://care.studentkare.co
API_BASE_URL=https://care.studentkare.co/api
COOKIE_DOMAIN=.studentkare.co
ALLOWED_ORIGINS=https://care.studentkare.co,https://studentkare.co
DEFAULT_FROM_EMAIL="Studentkare Support <noreply@studentkare.co>"
POSTAL_FROM_EMAIL="Studentkare Support <noreply@studentkare.co>"
JWT_SECRET=<PRODUCTION_RANDOM_SECRET_MIN_64_CHARS>
OTP_HASH_SECRET=<PRODUCTION_RANDOM_SECRET_MIN_64_CHARS>
APP_ENV=production
```

### Staging Environment (.env.staging)
```ini
APP_BASE_URL=https://staging.studentkare.co
API_BASE_URL=https://staging.studentkare.co/api
COOKIE_DOMAIN=.staging.studentkare.co
ALLOWED_ORIGINS=https://staging.studentkare.co
DEFAULT_FROM_EMAIL="Studentkare Staging <noreply@staging.studentkare.co>"
JWT_SECRET=<STAGING_RANDOM_SECRET_MIN_64_CHARS>
OTP_HASH_SECRET=<STAGING_RANDOM_SECRET_MIN_64_CHARS>
APP_ENV=staging
```

---

## 2. Cookie & Session Security Scoping
- **Cookie Name**: `sacare_session`, `sacare_challenge`, `sacare_signup`
- **Domain Scope**: Scoped to exact application domain (e.g. `COOKIE_DOMAIN` env config). Never wildcarded across untrusted subdomains.
- **Flags**:
  - `HttpOnly`: `true` (unreadable via Client JavaScript)
  - `Secure`: `true` in production and staging (`https://`)
  - `SameSite`: `Lax` (prevents cross-site request forgery while preserving navigation context)
  - `Path`: `/api`

---

## 3. CORS & CSP Header Specification

### CORS Configuration (`backend/main.py`)
- Explicit allowlist derived strictly from `ALLOWED_ORIGINS` environment variable.
- Wildcards (`*`) forbidden when `allow_credentials=True`.

### Content Security Policy (CSP)
```http
Content-Security-Policy: default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline' https://fonts.googleapis.com; font-src 'self' https://fonts.gstatic.com; img-src 'self' data: blob: https:; connect-src 'self' https://care.studentkare.co; frame-ancestors 'none'; object-src 'none'; base-uri 'self';
```

---

## 4. DNS & Infrastructure Cutover Steps (Do NOT execute until clinical sign-off)

1. **DNS Record Setup**:
   - Create CNAME record `care.studentkare.co` -> Cloudfront / Ingress Load Balancer domain.
   - Create TXT records for SPF, DKIM, and DMARC email authentication for `studentkare.co`.
2. **TLS Certificate Issuance**:
   - Provision Let's Encrypt / AWS ACM wildcard TLS certificate for `*.studentkare.co`.
3. **Environment Deployment**:
   - Inject `APP_BASE_URL`, `COOKIE_DOMAIN`, `ALLOWED_ORIGINS`, and production secrets into Vault / Cloud Run environment manager.
4. **Health Check Verification**:
   - Query `GET /api/options` to verify 200 OK status and zero CORS origin warnings.
