# WP-17 · Super admin governance, safety and money: Tier 1 canvas plans

**Approved by:** _(name, date)_

**Status:** proposed. Plans only; no screen code has been written for this package.
**Rule:** `CLAUDE.md`, `DESIGN.md` §5–6, `AGENTS.md` (guardrails 1, 4, 6, 9, 11). These screens
govern break-glass, consent policy, erasure, the Rule L firewall, prices and keys. Each needs a
named design reviewer **and** legal/DPO (or clinical, where marked) sign-off before its branch
opens. One screen = one ticket, one branch, one PR.
**Source:** `docs/plans/canvas-gap-audit-2026-10-20.md` (§7 Super admin, WP-17). Boards under
`design/screens/source/08-super-admin/`, pictures under `design/screens/screenshots/08-super-admin/`.
Super-admin screens were **not rendered** in the audit (2FA hold on the demo admin): gaps below
are from brief, board source and code.

## Summary

| # | Screen | Route / files today | check-icons | Data today | Blocking decision |
|---|---|---|---|---|---|
| 1 | SuperAdminConsole | `/admin` · `features/admin/views/OperationsOverviewView.tsx` | 0/26 · lucide, glyphs | real `/ops/summary`, `/ops/feed/counts` | Board's dual-custody break-glass form: build, or remove from the overview |
| 2 | AuditExplorer | `/admin/audit` · `AuditExplorerView.tsx` | 0/23 | real `/ops/audit` (id, actor, action, resource, time) | "Chain integrity: verified to tip" — there is no hash chain |
| 3 | AiGovernance | `/admin/ai-governance` · `AiGovernanceView.tsx` | 0/23 | real `/ops/agents/ayush/quality` | Pipeline-stage counts and module register sources |
| 4 | Integrations | `/admin/integrations` · `SuperAdminScreens.tsx` + legacy `IntegrationsSettingsModule.tsx` | 1/23 | real `/admin/integrations`, `/ops/integration-health`, `/ops/knowledge/index-status` | Retire the legacy panel |
| 5 | DpdpQueue | `/admin/erasure` · `screens/workspace/ErasurePanel.tsx` | 0/24 | real `/ops/erasure` | Statutory window length (setting) |
| 6 | AdminOps | `/admin/ops` · `SafetyEventsView.tsx` | 0/23 · glyph | real `/ops/feed`; `/ops/sos` exists | API availability and median-to-responder sources |
| 7 | AdminSurveillance | `/admin/surveillance` · `SurveillanceView.tsx` | 0/23 · glyph | not connected | Suppression floor; state-authority notification |
| 8 | AdminRuleL | `/admin/rule-l` · `NotConnectedView.tsx` | 0/23 | **not connected — but `GET /ops/rule-l` exists** | Wire it; drop board rows that describe services we don't have |
| 9 | AdminConsentPolicy | `/admin/consent-policy` · `ReadOnlyAdminView.tsx` | 0/23 | read-only empty | Which rules exist as settings; locked rows |
| 10 | AdminHandover | `/admin/handover` · `ReadOnlyAdminView.tsx` | 0/23 | read-only empty | Countersign model (24 h) |
| 11 | AdminBreakGlassLog | `/admin/break-glass-log` · `BreakGlassLogView.tsx` | 0/27 | not connected (`break_glass_sessions` has no route) | Review outcomes incl. "suspend break-glass" |
| 12 | AdminPlansPricing | `/admin/plans` · `PlansPricingView.tsx` + `PlansPricingViewModel` | 0/28 | real `/billing/plans` | Edit via settings registry; two-admin approval |
| 13 | AdminTemplates | `/admin/templates` · `MessageTemplatesView.tsx` | 0/25 | not connected | Template model; leak checker |
| 14 | AdminKnowledge | `/admin/knowledge` · `KnowledgeView.tsx` | 0/25 · lucide | real `/knowledge/sources`, `/ops/knowledge`, index status, reindex | "Test a question" retrieval preview |
| 15 | AdminCheckins | `/admin/checkins` · `NotConnectedView.tsx` | 0/23 | not connected | Source: `DIGITAL_ID_*` audit rows? |
| 16 | AdminCase | `/admin/case` · `CaseView.tsx` | 0/21 · glyphs | not connected | "This wasn't me" case model; counter-photo access |
| 17 | AdminPriceFix | `/admin/price-fix` · `PriceFixView.tsx` | 0/23 · glyph | catalogue only | Retire: SK-006 is resolved by the settings registry |
| 18 | AdminApiKeys | `/admin/api-keys` · `SuperAdminScreens.tsx` `ApiKeys` | 0/23 · glyphs | not connected; `apilayer` routes behind `require_super_admin` | Remove the old-product proxy routes |

## Applies to every screen in this package

**Prerequisites.** S3 admin shell icons (`feat/canvas-s3`: lucide out of
`screens/workspace/admin/SuperAdminShell.tsx` and `superAdminNavigation.ts`); S9 console table
(today `AdminPage` + `NotConnectedTable`); S7 dialogs/drawers.

**Will change (all eighteen).**
- Icons: `<Icon>` / `<Icon3d>` exact brief names (`shield--p5` on PriceFix/ApiKeys);
  `→` → `arrow-right`, `←` → `arrow-left`, `✓` → `check` per brief (the `sk-admin-back` "← "
  span and other glyphs go).
- Copy: already through `useT` (`admin.*`); add missing board strings in en/te/hi.
- States: data, loading, empty, error (`Ref …`), not connected; offline = read-only, all
  approvals, reviews, edits, rotations disabled.

**Will NOT change (all eighteen).** `require_super_admin` and 2FA on every route; audit writes;
Rule L planes; erasure semantics (`services/erasure.py`); settings validation and history
(`settings_api.py`); no compliance state written as a constant (guardrail 6) — every "holding /
verified / compliant" label must come from a computed response.

**Accessibility baseline.** As WP-11. Review decisions are radio groups with visible labels;
destructive actions (suspend, remove route, complete erasure) use the S7 confirm dialog.

**Tests baseline.** `features/admin/viewmodels/__tests__/*` for every wired viewmodel (state +
fail-closed write); a test per screen that no compliance claim renders without a computed
source; `check-icons --screen`; implementation-map entry moved to `screens`.

---

## 1. SuperAdminConsole — platform overview

**Approved by:** _(design reviewer, legal/DPO — date)_

**Board vs today.** Board: header "3 tenants · 4,940 activated seats · all services nominal";
"Audit ledger writing · Append-only · DELETE revoked for every role"; a **break-glass request
form** (stated reason, scope chips Lab diagnostics / Prescriptions / Clinical vitals / Discharge
notes, "Dual approver required · Dr. Aris Thorne · Chief Medical Officer", "Max 4h", "Request
authorised break-glass access", "Previous trail AUD-8842 · Section 12 compliant"); "Guardrails —
should read zero" tiles. Today: overview with summary and feed counts (copy 52%).

**Will change.** Board header and tiles from `/ops/summary`; guardrail tiles only for counters the
API computes, "—" otherwise; icons.

**Will NOT change.** No break-glass form here until decision 1 is made.

**Safety-critical.** "All services nominal", "DELETE revoked for every role" and "Section 12
compliant" are compliance claims: shown only if computed (e.g. from `/ops/rule-l` grant checks
and `/ops/integration-health`); otherwise omitted.

**Open decisions.** (1) Dual-custody, scoped, 4-hour break-glass for super admins vs the campus
board's single-actor 15-minute emergency card (WP-11 §3) — one model or two? (2) Drop the
"Section 12 compliant" string entirely (nothing computes it).

## 2. AuditExplorer

**Approved by:** _(design reviewer, legal/DPO — date)_

**Board vs today.** Board: tabs All access / Break-glass / Denied; rows actor · outcome · rule
("Rule-K1") · what · hash · when; "Chain integrity · Verified to tip · 1,284,902 entries
recomputed from genesis"; signing-key fingerprint note; guardrails should be zero. Today: list
from `/ops/audit` (copy 36%).

**Will change.** Tabs filter by action (server query param needed — verify), board columns that
exist (actor, action, resource, time); hash, rule and outcome columns not connected.

**Safety-critical.** **There is no hash chain or signing key in the backend.** The integrity
panel is not shown (guardrail 6) until one exists.

**Open decisions.** Build a hash-chained audit ledger (backend project) or remove the panel from
the design?

## 3. AiGovernance

**Approved by:** _(design reviewer, AI governance owner, clinical lead — date)_

**Board vs today.** Board: "Agent Ayush · seven stages, five can refuse"; where-the-pipeline-stops
bars (crisis gate etc., last 7 days); grounding note ("Retrieval is character n-gram hashing…");
module register ("Three of the unreachable modules are safety checks. Wire those, delete the
rest."). Today: quality figures from `/ops/agents/ayush/quality` (copy 34%).

**Will change.** Stage bars only for stages the quality endpoint reports; grounding note text
must match `services/embeddings.py` / `vector_store.py` as they are (verify before copying the
board's sentence); module register not connected.

**Safety-critical.** Guardrail 3: an unreachable constitution module is a bug to report, not a
row to display — the register needs a computed import check.

**Open decisions.** Source for the module register (static import graph in CI?).

## 4. Integrations

**Approved by:** _(design reviewer — date)_

**Board vs today.** Board: dependency table (ABDM/ABHA gateway… "if it stops", state); note
"Eight third-party proxies from a previous product are still mounted"; knowledge index card (184
sources) with "Publishing a source does not rebuild the index"; source freshness bars. Today:
new page wrapping the legacy `IntegrationsSettingsModule` (copy 35%).

**Will change.** Board table from `/admin/integrations` + `/ops/integration-health`; index card
from `/ops/knowledge/index-status`; retire the legacy module.

**Will NOT change.** Secret vault behaviour (`integration_secret_vault.py`); test endpoint.

**Open decisions.** Is the reindex-not-automatic behaviour still true? If so, fix it (backend)
rather than describe it.

## 5. DpdpQueue — erasure requests

**Approved by:** _(design reviewer, legal/DPO — date)_

**Board vs today.** Board: rows account · requested · statutory clock bar (days left / breached) ·
action; "1 past the window"; note that the ledger keeps the fact of an erasure, not the data.
Today: `ErasurePanel` (copy 34%) on real `/ops/erasure`.

**Will change.** Board layout, clock bars computed from request time and a window setting.

**Will NOT change.** Erasure execution, archive open (`/ops/erasure/archives/{id}/open`) and audit.

**Safety-critical.** "Complete" needs the S7 destructive confirm and states what is erased.

**Open decisions.** The statutory window: legal to fix the number; store as a non-public setting.

## 6. AdminOps — operations & SOS

**Approved by:** _(design reviewer, clinical lead — date)_

**Board vs today.** Board: tiles SOS live / campuses up / API availability 30 days / median SOS to
first responder; rows alert · campus & detail · raised · responders · state; note "never the
student's condition". Today: `SafetyEventsView` on `/ops/feed` (copy 46%).

**Will change.** Add SOS rows from `/ops/sos` (super admin sees all campuses); tiles only where
computed (availability has no source → "—").

**Safety-critical.** Live SOS rows sort first and are never paginated away. No condition field.

**Open decisions.** None beyond sources.

## 7. AdminSurveillance

**Approved by:** _(design reviewer, clinical/public-health lead, legal — date)_

**Board vs today.** Board: clusters (region, campuses, signal "Fever rate 3.1× baseline, 72 h",
cohort n, state); "n ≥ 80 smallest cohort released"; "Campuses named to each other: 0"; "Mental
health signals: suppressed, never surfaced". Today: not-connected table.

**Will change.** Copy, icons; not connected.

**Safety-critical.** Suppression and mental-health exclusion in the query. Campuses never see
each other's numbers.

**Open decisions.** Floor value (see WP-11 decision 1.1); legal basis for notifying a state
health authority.

## 8. AdminRuleL — firewall

**Approved by:** _(design reviewer, security lead — date)_

**Board vs today.** Board: "7 of 7 holding"; grants table (commerce ranking service reading
clinical tables, recommendation job, analytics export, campus dashboard below k = 5, Ayush agent
reading the vault, marketing export, consented clinician read) with last verified and result.
Today: **not-connected table, although `GET /ops/rule-l` returns live grant checks**
(`rule_l_status`: enforced, reasons, checks, commerce paths and run-as role).

**Will change.** Wire to `/ops/rule-l`; show the checks it returns, `enforced`, `reasons`, and
the commerce endpoint list. Board rows naming services we do not run (`reco-worker`,
`warehouse`, `growth`) are **not** shown.

**Will NOT change.** `core/rule_l.py`, grants, the check itself.

**Safety-critical.** "Holding" only when `enforced` is true; on SQLite/dev it must say "not
enforced in this environment" (the endpoint reports it).

**Open decisions.** Check interval ("4 min") — the endpoint checks on request; schedule it?

## 9. AdminConsentPolicy

**Approved by:** _(design reviewer, legal/DPO — date)_

**Board vs today.** Board: rules with "set to", "changeable by", state (max share 90 days,
default 7 days, artefact retention 7 years — statutory/locked, Ayush transcript retention 30 days
— under review, age gate 18 — locked, suppression floor k = 5 — not configurable downward,
mental health in any aggregate — never). Today: read-only empty table pending this review.

**Will change.** Rows read from the settings registry where a setting exists; locked rows shown
as locked with the reason; rows with no enforcement source are not shown.

**Will NOT change.** The 18+ gate (DESIGN D4, constitution); no field can lower the floor.

**Open decisions.** Which of these become settings (none exist today); the 90/7-day share
values; transcript retention.

## 10. AdminHandover — casualty handover

**Approved by:** _(design reviewer, clinical lead, legal — date)_

**Board vs today.** Board: transfers (case, route + reason, authorised by, record opened —
emergency override / consent already active, audit — countersigned / awaiting countersign 19 h);
"an uncountersigned override escalates here". Today: read-only empty table.

**Will change.** Copy, icons; not connected.

**Safety-critical.** Reason on a transfer row is clinical ("head injury") — super admin only.

**Open decisions.** Countersign model and 24 h window; link to break-glass sessions.

## 11. AdminBreakGlassLog

**Approved by:** _(design reviewer, legal/DPO — date)_

**Board vs today.** Board: tiles openings this term / needs review (oldest 26 h) / pattern
alerts / median open time ("auto-closes at 15"); filters All / Needs review / Pattern alerts /
Reviewed; rows audit id · when · campus · opened by · student (initials + masked roll) · reason ·
open for · review; "Export for DPO"; review drawer (reason given, what was seen — field names
only, pattern alert, decision: Real emergency / Ask for an explanation (48 h) / Misuse — suspend
break-glass). Today: tiles, chips and an empty not-connected table.

**Will change.** Board drawer and columns, not connected until `break_glass_sessions` routes exist
(WP-11 §3 backend ticket).

**Safety-critical.** "What was seen" lists field names, never values. "Suspend" removes the
permission server-side and alerts the campus lead.

**Open decisions.** 48 h review window and pattern rule (3 in 24 h) as settings; DPO export
format.

## 12. AdminPlansPricing

**Approved by:** _(design reviewer, founder/finance — date)_

**Board vs today.** Board: plan cards Basic (₹0 forever) / Premium / Care Circle / Enterprise;
mismatch banner ("checkout charges ₹99 for Premium, the plans page says ₹199"); "Where prices
appear" table (Web checkout / Mobile plan & billing / Ayush replies / Marketing site / Invoices —
reads catalogue vs hard-coded); change history; edit drawer (monthly price incl. GST, included
rows with locked "never gate care" rows, effective from, "students will see", "Send for second
approval"). Today: cards from `/billing/plans`, no edit, empty "where" and "history".

**Founder prices (2026-10-20).** Student Plus ₹149/month, Student Plus 3-month package ₹2,199,
Premium from ₹499 — declared in `backend/core/settings_registry.py` as
`billing.student_plus.monthly_inr`, `billing.student_plus.quarter_package_inr`,
`billing.premium.from_monthly_inr` on the in-flight `feat/plan-prices` branch (not yet merged),
which also returns `priceFrom` and `packages` from `GET /billing/plans`.

**Will change.** Cards show the server's plans incl. `priceFrom` ("from ₹499") and packages;
"Edit plan" opens the drawer and writes through `PATCH /api/ops/settings/{key}` (reason required,
audited); change history from `GET /api/ops/settings/{key}/history`; the mismatch banner is
computed — the plan-prices branch refuses checkout when the Razorpay plan amount differs from
the registry, and the screen shows that state.

**Will NOT change.** Care is never plan-gated; locked rows cannot be toggled.

**Open decisions.** (1) Two-admin approval: `settings_api` is single-admin + reason today — add
a pending/approve step for `billing.*` keys? (2) "Where prices appear" needs a real check (e.g.
a CI scan); drop the table until then? (3) Plan names: board Basic / Premium / Care Circle vs
server Free / Student Plus / Premium / Campus / Enterprise (same question as WP-01).

## 13. AdminTemplates — message templates

**Approved by:** _(design reviewer, legal — date)_

**Board vs today.** Board: template list (refill_due, otp_login, collection_slot, camp_invite,
crisis_followup with category and Meta status), editor, checks ("no health value ever leaves the
app"), preview with sample values, "Submit to Meta for approval". Today: three empty sections and
a link to the outbox.

**Will change.** Copy, icons; not connected.

**Safety-critical.** The leak checker must run server-side on save; the board's sample preview
("Metformin", "Vitamin D") shows exactly what must be rejected — the preview never renders a
medicine name or value in a template body.

**Open decisions.** Template model and Meta submission integration in scope?

## 14. AdminKnowledge — knowledge base

**Approved by:** _(design reviewer, clinical lead — date)_

**Board vs today.** Board: "412 chunks live · last index 06:00"; sources with owner, signer and
state (Live / Needs sign-off / Expired · hidden); "Test a question" retrieval preview ("No
signed-off source matches. Ayush will say it doesn't know…"). Today: sources, publish, index
status and reindex are real (copy 36%); lucide.

**Will change.** Board layout; icons; "Test a question" not connected unless a retrieval-preview
endpoint is added.

**Safety-critical.** Nothing searchable until clinician sign-off — enforced by the publish flow,
unchanged.

**Open decisions.** Add a read-only retrieval preview endpoint (same pipeline as Ayush, no
answer generation)?

## 15. AdminCheckins — check-in audit

**Approved by:** _(design reviewer, legal/DPO — date)_

**Board vs today.** Board: tiles check-ins today / matched first time / stopped — mismatch /
"this wasn't me" reports / manual checks; rows time · provider · visit · result · reason ·
outcome; providers to watch ("three mismatches in 7 days pauses a counter"); "What this page
never shows" (face photos, what was bought/tested, ID numbers). Today: not-connected table.

**Will change.** Board layout; rows from `DIGITAL_ID_VERIFIED` / `DIGITAL_ID_REFUSED_STALE`
audit entries if the reviewer accepts that source (time, actor's provider, result); mismatch,
reports and manual checks not connected.

**Safety-critical.** The never-shows card is enforced by the projection (no photo, no order
contents).

**Open decisions.** Use audit rows as the source, or a dedicated check-in table? Counter pause
rule as a setting.

## 16. AdminCase — "This wasn't me" case

**Approved by:** _(design reviewer, legal/DPO — date)_

**Board vs today.** Board: case header with SLA; timeline; evidence (on-file photo vs counter
photo, "Opening it is logged. It's deleted when the case closes"); partner's counter log; call
the student (masked number, language); outcome (fraud / mistake / unclear) and close. Today: empty
sections; `←` glyph.

**Will change.** Copy, `arrow-left` / `check` icons; not connected.

**Safety-critical.** Counter photo opens only with an open case and writes an audit entry.

**Open decisions.** Case model, photo retention, refund path (commerce plane) without the
commerce side learning the order's clinical contents.

## 17. AdminPriceFix — SK-006

**Approved by:** _(design reviewer, founder/finance — date)_

**Board vs today.** Board: three steps (point every surface at the catalogue; set the Premium
price; second admin approves), surface table ("₹99 hard-coded in Checkout.tsx"…), "412 students
paid ₹99", "Demo: second admin approves". Today: a page reading the catalogue.

**Proposal.** Retire this screen. With the settings registry, every surface reads one key; the
price is set in AdminPlansPricing (§12); legacy subscribers are covered by
`billing.student_plus.min_entitling_receipt_inr` on the plan-prices branch. The "Demo: second
admin approves" button must never ship.

**Open decisions.** Retire (redirect to §12) or keep as a guided wrapper over §12?

## 18. AdminApiKeys — API access & keys

**Approved by:** _(design reviewer, security lead — date)_

**Board vs today.** Board: "All 14 proxy routes now need a signed service token"; route table
(route, used for, auth, key age, calls 24 h, blocked); rotate key (second admin, reveal once,
1-hour grace); "Nine routes are left over from an older product — remove them". Today:
not-connected table. Code: `services/apilayer.py` routes (`/numverify`, `/weatherstack`,
`/fixer`, `/positionstack`, `/resume-parser`, …) are mounted behind `require_super_admin`, not a
service token.

**Will change.** Route table from the mounted router (names and auth as they are); rotation not
connected.

**Safety-critical.** Board copy "need a signed service token" is false today and is not shown.
The revealed key is never stored client-side.

**Open decisions.** Remove the old-product proxy routes (backend change, recommended) before
building this screen?
