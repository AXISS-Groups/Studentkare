# Preventive care API

Implemented by `backend/services/preventive_care.py` and
`backend/core/preventive_models.py`. All URLs below are relative to
`/api/preventive`. JSON keys are camelCase. All timestamps are **Unix seconds**,
not milliseconds or ISO strings. Currency is INR; prices are integer paise.

## Setup and authentication

- Apply Alembic revision `8b741c9d2e10`, following `fe83ff8b6dc6`. Production's
  existing migration runner applies it; development `create_all_tables()` also
  registers the new models. The migration seeds no providers or offerings.
- Public listing GETs need no account. Other routes use the existing session
  cookie. Every mutation requires the session's `X-CSRF-Token`.
- Admin routes require `SUPER_ADMIN`. Clinical queue/review routes require
  **`NMC_DOCTOR`**, not the general staff role and not an admin override.
- No additional dependency, external API key, worker, OCR service, scraper,
  LLM, notification provider, or 1mg partnership is activated by this module.
- Errors use the existing `detail` envelope: 401 unauthenticated, 403 denied or
  invalid CSRF, 404 missing/inaccessible resource, 409 stale/terminal review,
  422 invalid body or assignment. Unknown body fields are rejected.

## Pagination

Every collection returns:

```ts
type Page<T> = { items: T[]; total: number; offset: number; limit: number };
```

All collection routes accept `offset` (default 0, range 0–10000) and `limit`
(default 20, range 1–100). Ordering is stable, including an ID tie-breaker.

## Provider directory

### Public GET `/providers`

Optional `query` (maximum 160 characters) searches stored provider names.
Returns `Page<Provider>`, containing only active listings.

```ts
type ProviderInput = {
  name: string;                    // trimmed, 2–160 characters
  sourceUrl: string;               // HTTPS, <=2000 characters; no URL credentials
  bookingUrl?: string | null;      // same HTTPS validation; default null
  lastVerifiedAt?: number | null;  // >0, not in the future; default null
  expiresAt?: number | null;       // must follow lastVerifiedAt; default null
  active?: boolean;               // default true
};
type Provider = Required<ProviderInput> & {
  id: string;
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'EXPIRED';
};
```

### Admin POST `/ops/providers`

Body: `ProviderInput`. Returns `Provider` with HTTP 201.

### Admin PATCH `/ops/providers/{providerId}`

Body: a nonempty subset of `ProviderInput`. Returns `Provider`.
Omitted fields retain their values. Nullable fields can be explicitly cleared.
Required/non-null fields cannot be set to null.

A manually checked 1mg listing can use an actual HTTPS source/booking URL,
exactly like any other provider. No provider listing is bundled or fetched.

## Vaccine offerings

### Public GET `/vaccines`

Optional filters combine with AND:

- `query`: maximum 160 characters; literal case-insensitive search of vaccine
  name or provider name (SQL wildcard characters are escaped).
- `pincode`: exact six-digit Indian pincode with a nonzero first digit.
- `provider`: exact stored **provider ID**, not a brand name.

Returns `Page<Vaccine>`. Both the offering and provider must be active.

```ts
type VaccineInput = {
  providerId: string;              // existing active provider; 1–80 characters
  vaccineName: string;             // trimmed, 2–160 characters
  pincode: string;                 // /^[1-9][0-9]{5}$/
  region?: string;                // trimmed, <=100 characters; default ''
  sourceUrl: string;               // HTTPS, <=2000 characters; no URL credentials
  lastVerifiedAt?: number | null;  // default null
  expiresAt?: number | null;       // default null
  pricePaise?: number | null;      // integer 0–100000000; null means unknown
  availability?: 'UNKNOWN' | 'CONFIRMED'; // default UNKNOWN
  active?: boolean;               // default true
};
type Vaccine = Required<VaccineInput> & {
  id: string;
  providerName: string;
  bookingUrl: string | null;
  currency: 'INR';
  verificationStatus: 'UNVERIFIED' | 'VERIFIED' | 'EXPIRED';
};
```

`CONFIRMED` requires a manually supplied verification timestamp and future
expiry. The public response downgrades availability to `UNKNOWN` if either
the offering or provider is unverified/expired. An expired offering or provider
also suppresses the displayed price to null. `verificationStatus` on an
offering describes that offering's provenance. Provider provenance is available
from `/providers`. These are directory statements, not stock reservations,
clinical eligibility decisions, confirmed appointments, or immunization records.

### Admin POST `/ops/vaccines`

Body: `VaccineInput`. Returns `Vaccine` with HTTP 201.

### Admin PATCH `/ops/vaccines/{offeringId}`

Body: nonempty partial `VaccineInput`; omitted values are preserved, nullable
values can be cleared. Returns `Vaccine`. Updating an expired confirmation
normalizes its stored availability to `UNKNOWN` unless fresh confirmation
evidence is supplied. A price of zero is distinct from an unknown price.

## Personal preventive preferences

### Authenticated GET `/preferences`

Returns `PreventivePreferences`. With no stored row, both opt-ins are false,
region is empty, topics are empty, consentVersion is 1, and updatedAt is null.

### Authenticated PUT `/preferences`

Full replacement body; **both booleans must be supplied explicitly**:

```ts
type Topic = 'vaccines' | 'seasonal-health' | 'health-camps' | 'wellbeing';
type PreferenceInput = {
  seasonalEducationEnabled: boolean;
  promotionsEnabled: boolean;
  region?: string;                 // <=100 characters; defaults to ''
  topics?: Topic[];                // unique, maximum 4; defaults to []
};
type PreventivePreferences = Required<PreferenceInput> & {
  consentVersion: number;          // consent policy version, currently 1
  updatedAt: number | null;
};
```

Returns the saved `PreventivePreferences`. The authenticated account is always
the owner; the caller cannot provide an account ID. Setting either opt-in false
persists withdrawal immediately. This module never enqueues or delivers messages.
Any future campaign worker must re-read these preferences at delivery time.
Existing appointment/reminder preferences are separate.

## Report follow-up

```ts
type SourceRef = { title: string; url: string }; // title 2–160; HTTPS URL <=2000
type Guidance = {
  summary: string;
  questions: string[];
  nextSteps: string[];
  sourceRefs: SourceRef[];
};
type ReportReview = {
  id: string;
  documentId: string;
  status: 'REQUESTED' | 'ASSIGNED' | 'APPROVED' | 'REJECTED' | 'WITHDRAWN';
  version: number;
  assignedClinicianId: string | null;
  createdAt: number;
  updatedAt: number;
  reviewedBy: string | null;
  reviewedAt: number | null;
  guidance: Guidance | null;       // only non-null when APPROVED
};
```

### Owner POST `/report-reviews`

Body: `{ "documentId": "..." }`. The document must belong to the session account
and have category `LAB`, `CAMP_REPORT`, or `DISCHARGE_SUMMARY`.

Returns `ReportReview`, initially `REQUESTED`, version 1, guidance null, HTTP 201.
One review exists per document, enforced by a database unique constraint.
Repeats return the existing review with HTTP 200, including terminal/withdrawn
reviews; they never silently reactivate consent. A new upload is required for a
new review after a terminal decision/withdrawal or changed source document.

The document bytes are hashed as evidence. This does not extract or interpret
them. Synthetic radiology/voice-prescription document categories are excluded.

### Owner GET `/report-reviews`

Returns `Page<ReportReview>` for the signed-in account. Unapproved guidance is
never returned. Deleted source documents are excluded. No other owner's
document or review is exposed.

### Owner POST `/report-reviews/{reviewId}/withdraw`

No body. Returns `ReportReview` with `WITHDRAWN` and guidance null; increments
version once. Repeated withdrawal is idempotent. Withdrawal removes the request
from the clinician queue and prevents subsequent review. Prior review evidence
is retained privately; document-sharing grants can also be revoked separately.

### Admin GET `/ops/report-reviews`

Returns `Page<ReportReview>` for pending `REQUESTED`/`ASSIGNED` work, suitable for
assignment. It does not expose document bytes or grant clinical review authority.

### Admin POST `/ops/report-reviews/{reviewId}/assign`

Body: `{ "clinicianId": "...", "expectedVersion": 1 }`.

Requires an active `NMC_DOCTOR` and a current non-revoked owner-granted document
share. Assignment alone never creates consent. Returns the review with
`ASSIGNED`, an incremented version and guidance null. Pending work may be
reassigned with a current expectedVersion and eligible share. Terminal reviews
cannot be reassigned.

The owner creates a share through the existing route:

```http
POST /api/records/shares
X-CSRF-Token: <session token>

{"documentId":"...","clinicianEmail":"...","expiresInDays":7}
```

### Clinician GET `/work/report-reviews`

Returns `Page<ReportReview & { shareId: string }>` for `ASSIGNED` requests only,
filtered by both clinician assignment and a current share. Use the existing
`GET /api/records/shares/{shareId}/document` for source access; it independently
checks grant validity. Expired/revoked shares disappear from the queue.

### Clinician POST `/work/report-reviews/{reviewId}/review`

Body:

```ts
type ReviewDecision = {
  expectedVersion: number;         // integer >=1; from current queue item
  decision: 'APPROVED' | 'REJECTED';
  summary?: string;                // trimmed, <=4000 characters
  questions?: string[];            // <=10 items, each nonblank and <=1000
  nextSteps?: string[];            // <=10 items, each nonblank and <=1000
  sourceRefs?: SourceRef[];        // <=10 entries
};
```

Approval requires nonblank summary, at least one next step, and at least one
HTTPS source reference. Questions are optional. Rejection must omit/empty all
guidance fields. Returns `ReportReview` with incremented version, authenticated
reviewer ID and review timestamp. The exact guidance content hash and document
hash are persisted. Final decisions are immutable; repeats/stale versions return
409. Content is authored by the clinician: no agent, model, medication generator,
or automatic prescribing endpoint is invoked.

Execution rechecks assignment, status, version, live share and unchanged source
bytes. Vendors, campus admins, students, unassigned doctors and super-admins
cannot use the clinical review endpoint. Database compare-and-set updates prevent
overwriting decisions or reviving withdrawn requests.

## Tests

`backend/tests/test_preventive_care.py` covers the HTTP/session/CSRF/database
contracts, access isolation, listing validation/expiry, consent withdrawal and
review lifecycle. `backend/tests/test_preventive_migration.py` checks upgrade,
empty new tables, ORM/schema parity, downgrade, preservation of an existing
account, and re-upgrade against isolated SQLite storage.
