# Tier 1 web ↔ mobile parity, phase 3: plans for approval (2026-10-24)

**Named reviewer:** Krishna Chintakayala (founder). **Approved by:** _(name, date, per section or "approve all")_
**Clinical lead:** sections 2–8 and 21 (clinical values, records, emergency card). **AI-constitution owner:** sections 9–10 (Ayush).
**Status:** plan only. No code until the decision box of a section is ticked (DESIGN.md §5, CLAUDE.md).
**Basis:** `docs/ux/web-mobile-parity-2026-10-23.md` (phase 3 list and the approved decisions of 23 Oct 2026), the shared responsive M2 pieces on `main` @ `693cdb29` (`src/design-system/m2`: `M2Responsive`, `useM2Layout`, `M2Grid`, `M2WideColumn`, `M2ListRow`, `M2EmptyState`, `M2Header` with `M2HeaderSos`, wide `GradientHeroCard` / `HeroCarousel` / `SoftTileGrid` / `M2SearchField` / `NotYetTile`), and the routing in `src/screens/workspace/WorkspaceScreen.tsx` (desktop `studentWebPage()` switch, lines ~330–390; shared switch ~398–456), `src/features/phoneKit/studentPhoneBoards.tsx` and `src/screens/workspace/PhoneBoards.tsx`.

"Phone" below means the 390 px web phone frame (`StudentPhoneFrame`); the Expo app draws the same feature views where it registers them (`src/native/App.tsx`), and says so where it does not. "Desktop" means 1440 px in `StudentWebShell`.

Not in this file: **Blog / News** are Tier 3 in the parity doc (phase 2, "render inside the shell") and show no health content; they are not a phase 3 screen.

---

## Rules every section keeps (so the sections stay short)

1. **One view, two widths.** Desktop draws the same feature view as the phone, wrapped in `M2WideColumn` (the pattern `M2HomeRoute wide`, `M2CampsRoute wide` already use), with `M2Grid` for columns. No second DOM implementation; the matching `studentweb/views/t1/*` 3b view is deleted once its replacement ships.
2. **What does not change, anywhere in this file, unless a section says so:**
   - view-models, repositories, endpoints and request bodies (no new API, no new column);
   - clinical values, their units, range text, tone rules (outside range = amber `attention`, never red; no score, no celebration) and the "source of every number" lines;
   - consent and share wording, crisis copy (112, Tele-MANAS), identity and deletion logic, and the en/te/hi strings behind them: **byte-identical i18n values** (keys may be reused, never reworded);
   - Rule L: no clinical value, test name or medicine in a route, query or state that a store page can read.
3. **SOS:** on desktop the shell's top bar carries SOS (decision 10), so a board drawn there shows none of its own. Boards use `M2Header` / `M2HeaderSos`, which already draw nothing when no `M2SosProvider` is present.
4. **States** every section lists: loading (skeleton), empty (message + one next step), error (calm copy + retry), offline (read-only, never a fake success), permission denied (the route is `STUDENT_ONLY` in `routeRoles.ts`; a 401 ends the session through the shell, a 403 shows the error state; never a blank or a partial page), revoked/expired where sharing or a pass exists.
5. **Icons:** only names from the brief(s) listed; `node scripts/icons/check-icons.mjs --screen <Screen>` passes for every screen named; files listed in `design/screens/implementation-map.json`; a replaced 3b board goes under `superseded` with this file as `source` (see Q2).
6. **Accessibility:** roles and labels on every control, ≥ 44 px targets, visible focus, `aria-live` for status changes, reduced motion respected; no `lucide-react` in a touched screen.
7. **Screenshots to deliver** (every section): each listed state at **390** and **1440**, plus **320** for the default state and one **te** and one **hi** capture of the longest screen, into `docs/plans/screenshots/tier1-parity/<Screen>-<state>-<width>.png`, with the matching canvas picture beside it in the PR.
8. **Tests baseline** (every section, on top of the listed ones): a render test at `layout="phone"` and `layout="desktop"` (pinned through `M2Responsive`), a "no second SOS on desktop" assertion, and the existing tests for the view-model still pass unchanged.

---

## Questions for Krishna (four; each has a recommended answer)

- **Q1. No Mobile 2.0 board exists for 16 of these screens** (everything except My health, Trends, Report upload, Ask Ayush, Profile). Build them from the shared M2 pieces, taking content, copy, states and icons from each screen's existing approved board (canvas page 2 for phone, 3b for web), with the screenshots above as the design review? Or wait for new canvas boards?
  **Recommended: build from the shared pieces now.** Every one of them already has an approved board for its content; only the look changes.
- **Q2. Retire the 3b web boards these views replace** (WebVault, WebReportInsights, WebConsultSummary, WebAyush, WebEmergencyCard, WebPass, WebDeleteAccount, WebLeaveCampus, and WebAccount for `/profile`): record each as `superseded` in `implementation-map.json`, keeping the 3b-only content that uses the width well (the Ayush "what Ayush will not do" panel, the emergency card's live preview beside the editor, the vault's table on desktop) as the desktop column of the one view?
  **Recommended: yes.**
- **Q3. Report insights.** Fold it as a "Reviewed lab reports" card on My health (newest released StudentKare lab report: the doctor's note verbatim, who and when, Download), and keep `/report-insights?id=` as that card's detail page (history included), restyled, reached from the card and from My lab tests; remove the sidebar item.
  **Recommended: yes.** Dropping the page would break the My lab tests "Insights" link and lose the history list.
- **Q4. Prescriptions.** Move `/prescriptions` into the vault as a **Prescriptions** tab that keeps both of today's sections together (e-prescriptions with Send to pharmacy, and tests your doctor ordered with Choose a time), with `/prescriptions` redirecting to `/records?tab=prescriptions`?
  **Recommended: yes, both sections together.** My health's "collection" link already opens `/prescriptions` for the doctor-ordered test; splitting them would strand that link.

---

## Summary

| # | Screen | Change in one line | Risk | Q? |
|---|---|---|---|---|
| 1 | SOS on every board | Insights, Ask Ayush and Profile stop drawing their own SOS on desktop (they draw a second one today) | Medium | — |
| 2 | My health (M2Insights) | Laid out wide: hero full width, report + note side by side, care cards and body systems in a 3-column grid | High | Q3 |
| 3 | Report insights | Folded into My health as a card; `/report-insights` kept as its detail page, M2 look; sidebar item removed | High | Q3 |
| 4 | Trends | Wide: test chips as a side list, chart + table in the main column | High | — |
| 5 | Report upload | Wide: sources / stepper left, the check-your-values form right | High | — |
| 6 | Health vault | One view at both widths: M2 header, document cards, rows (table on desktop), shares section; replaces `VaultWorkspaceHub` and `WebVaultView` | High | Q1, Q2 |
| 7 | Prescriptions | Becomes the vault's Prescriptions tab; same two sections, M2 cards | High | Q4 |
| 8 | Visit summaries | One view (the phone `VisitSummaryView`) laid out wide; `WebConsultSummaryView` retired | Medium | Q2 |
| 9 | Ask Ayush | One view: M2AskAyush chat column + the web's limits / transcript / talk-to-a-person panel as a second column on desktop | High | Q2 |
| 10 | Ayush widget | Kept (decision 1); its panel draws the M2AskAyush bubbles, chips and crisis strip on the same view-model | Medium | — |
| 11 | Profile (M2Profile) | Wide: hero full width, vitals + On campus in one row, documents beside settings; the web's contact & identity rows become an "Account details" card | Medium | Q2 |
| 12 | Digital ID | Desktop draws the phone's `DigitalIdRoute` (one view-model) instead of `MemberProfilePanel` → `DigitalIdPanel` | High | Q1 |
| 13 | Privacy & consent | Same component, M2 cards and rows; wording untouched | High | Q1 |
| 14 | Data rights | Same component, M2 cards | Medium | Q1 |
| 15 | Consent inbox | M2 rows for shares, same revoke confirm | High | Q1 |
| 16 | Care circle | M2 cards, same honest "nothing is shared" content | Low | Q1 |
| 17 | Sign-in & security | M2 cards around the existing cards; logic untouched | Medium | Q1 |
| 18 | Verify identity | Already one view with a wide mode; M2 cards and header only | Medium | Q1 |
| 19 | Delete account | One view (phone `DeleteAccountView`) wide; `WebDeleteAccountView` retired | High | Q1, Q2 |
| 20 | Leave campus | One view (phone `LeaveCampusView`) wide; `WebLeaveCampusView` retired | Medium | Q1, Q2 |
| 21 | Emergency card | One view: card face + editor; desktop shows editor beside the live card (as 3b) | High | Q1, Q2 |
| 22 | Check-in pass | One view (phone `MyPassBoard`) wide; `WebPassView` retired | High | Q1, Q2 |

## Recommended order of build

Each step is one branch and one PR (CLAUDE.md), smallest risk first so the pattern is proven before clinical screens move.

1. **§1 SOS** (one small PR; safety fix, no layout change).
2. **Low-logic restyles on shared view-models:** §16 Care circle, §15 Consent inbox, §14 Data rights, §8 Visit summaries.
3. **My health package** (clinical lead in review): §2 My health + §3 Report insights, then §4 Trends, §5 Report upload.
4. **Records package:** §6 Vault + §7 Prescriptions (one PR; they share the tab bar and the revoke path).
5. **Identity package:** §11 Profile, §12 Digital ID, §22 Pass, §21 Emergency card.
6. **Account:** §13 Privacy & consent, §17 Security, §18 Verify.
7. **Destructive:** §19 Delete account, §20 Leave campus.
8. **Ayush** (AI-constitution owner in review): §9 Ask Ayush, then §10 widget.

---

## 1. SOS control on every board

**Today.** `M2Header` and `M2HeaderSos` (`src/design-system/m2/M2Parts.tsx`, `m2Sos.tsx`) draw SOS only where a shell provides `M2SosProvider`, so on desktop they correctly draw nothing. Trends and Report upload use them. **Gap found:** `M2InsightsView` (line ~218), `M2AskAyushView` (~157) and `M2ProfileView` (~133) draw their own `SosButton` bound to `links.sos`, which falls back to `navigate('sos')` when there is no phone slot. `/your-care` is drawn on desktop today (`WorkspaceScreen.tsx`, `case 'your-care': return <M2InsightsRoute />`), so desktop My health shows **two SOS controls** (top bar + hero), and the hero one goes to `/sos` instead of the shell's helplines dialog.

**Change.** Those three heroes use `M2HeaderSos` (same pill, same label keys `m2.sos` / `m2.sosSpoken`): phone unchanged (the frame's provider), Expo unchanged (the Expo shell provides it), desktop draws none.

**States.** SOS is drawn in every state of these boards, including loading and error (never behind them). Offline: SOS still opens the dialog (it dials; no network needed).
**Not changing.** SOS colour (`danger-fill`), copy, what the dialog lists.
**Risks.** Removing the phone SOS by mistake. Mitigation: tests below on the phone frame and Expo.
**Tests.** For each of the three views: phone layout with a provider → one SOS that calls the provider; desktop (no provider) → no `*-sos` element; Expo stack → one SOS opening `Emergency`.
**Screenshots.** My health, Ask Ayush, Profile hero at 390 and 1440.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 2. My health (M2Insights) wide

**Today.** Phone: `M2InsightsView` (`src/features/insights/views/M2InsightsView.tsx`) via `M2InsightsRoute`: navy hero with tabs and four counts, latest report (need a look / in range, value rows), doctor's note, "Due from your care" pair, Medicines today, Water, Steps, body systems, vaccine record, more rows. Desktop: the **same phone board in a ~430 px column** (content `maxWidth: size.phoneFrameMax`), plus the double SOS (§1). Board: `M2Insights` (canvas page 9). Expo: `Insights` screen.

**Change.** `M2InsightsRoute` takes `wide` (as `M2RemindersRoute` does) and desktop renders `<M2InsightsRoute wide />` inside `M2WideColumn`:
- hero full width; the four counts in one row (`M2Grid` desktop 4);
- row 2: latest report card | doctor's note (desktop 2 columns);
- row 3: Due from your care (2 cards) + Medicines today + Water (`M2Grid` desktop 4; tablet 2);
- body systems `M2Grid` desktop 4; Steps, vaccine record and "more" rows in a 3-column grid;
- the "Reviewed lab reports" card from §3 joins row 2 as a third cell when Q3 is approved.
Phone layout unchanged (outside `M2Responsive` everything stays `phone`).

**States.** Each card keeps its own state as today: loading skeleton (`m2.ins.valuesLoading`), first report empty (`m2-ins-first`, Add a report), per-card error with retry (`CardError`), offline banner with emergency card and pass links, hero counts "…" loading / "–" failed. Permission denied: route is `STUDENT_ONLY`. Revoked: n/a (shares count only).
**Not changing.** Every value, range text, tone, count rule ("never a count of values"), the doctor's note shown verbatim with name and date, ask-for-review flow, and that no link carries a test or value (Rule L, plan D-M2-9).
**Risks.** Stale values next to fresh ones in a wider grid (each card already loads on its own; no cross-card summary will be added). Value rows wrapping badly at 3 columns: values stay in the report card, which never goes narrower than its phone width.
**Tests.** Desktop layout renders hero + 4 counts in one row; each card's error does not hide the others; value rows keep `clinical-value` mono and amber for outside range at both layouts; no route built from a value.
**Screenshots.** Need a look (default), In range, first report, values error, offline.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 3. Report insights → fold into My health

**Today.** Both widths draw `WebReportInsightsView` (`src/features/studentweb/views/t1/WebReportInsightsView.tsx`, a 3b DOM page reflowed in the phone frame): the newest released StudentKare lab report from `GET /lab-orders?limit=50` (`REPORT_RELEASED` with a document), the reviewing doctor's note verbatim, released / collected dates, Download, "Talk to a doctor", "Add an outside report", and a History tab. Sidebar item "Report insights" (`studentNav.ts`, id `insights`). Linked from `WebMyLabTestsView` (`/report-insights?id=`). Boards: `ReportInsights` (page 2) and `MyReports` are already superseded by M2Insights/M2Trends; `WebReportInsights` (3b) is `inProgress`.

**Change (Q3).**
- My health gets a **"Reviewed lab reports"** card (`M2Card`): the newest released report's test names, the doctor's note verbatim (or the existing "no note" line), "written by … on …", Download, and "All reports (n)" → `/report-insights`. Data: no extra request. `InsightsViewModel.labOrders` already reads `/lab-orders`; its `LabOrder` type gains the fields the same response already carries and `StudentLabTest` already types (`reportDocumentId`, `reviewNote`, `reviewedByDoctor`, `reviewedAt`), and the card picks with the existing `pickReport` rule. To check in the build: `ORDERS_READ` vs the 50 the page reads today.
- `/report-insights` becomes an M2 detail page: `M2Header` (back to My health), the same summary and the history as `M2ListRow`s (table on desktop), same two "next" rows.
- Sidebar "Report insights" removed (the deferred item in the parity doc).
- Check-icons: `M2Insights` plus `WebReportInsights` (or its `superseded` entry, Q2).

**States.** Loading (skeleton), empty ("no released report yet", Open My lab tests), error with retry, offline (cached data read-only, Download disabled with a reason), report with no note.
**Not changing.** The note text, "signed rule" and firewall lines, the release rule (only `REPORT_RELEASED`), Download URL (`apiFileUrl`), the deliberately-not-drawn items listed in the file's header (no body-system table from PDFs, no AI draft, no report-scoped Ayush).
**Risks.** Wrong report shown (sort by `reviewedAt` then `createdAt`, as `pickReport` does today; reused, not rewritten). A report id in the URL is an id, not a test name (Rule L holds).
**Tests.** `pickReport` reused by the card; card hidden when nothing is released; `?id=` of another student's order shows the not-found/empty state (server already scopes `/lab-orders` to the caller); sidebar has no `insights` item.
**Screenshots.** My health with the card; detail summary; history; empty; error.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 4. Trends (M2Trends)

**Today.** Both widths draw `M2TrendsView` (`src/features/labResults/views/M2TrendsView.tsx`) via `M2TrendsRoute`; desktop is the phone column. Test chips (horizontal scroll), latest value + range bar, chart (`trendGeometry.ts`) or table, bookmark, doctor's steps from report reviews. Board: `M2Trends`. Expo: `Trends`.

**Change.** `wide` prop; desktop: test chips become a vertical list on the left (`M2ListRow`, tone dot and spoken state as on the chip), the selected test's card (value, range bar, chart, table) on the right; doctor's steps under it. Chart width follows the column (geometry already takes a width).

**States.** Loading, error (`m2v.tr.errorTitle` + retry), empty (Add a report → upload), per-test loading/error, few points (`m2v.tr.fewPoints`), nothing to plot, mixed ranges, pin error, offline banner.
**Not changing.** Geometry, ranges, tones, the "no test name in the URL" rule (opens on first bookmarked test), table alternative to the chart.
**Risks.** A wider chart implying precision: keep the same point count and axis labels, no interpolation added. Accessibility of the list vs chips: the list items keep the chip's spoken label.
**Tests.** Desktop renders the list and selects the same default test as the phone; table view present at both layouts; chart has a text alternative.
**Screenshots.** Graph, table, bookmarked, empty, error.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 5. Report upload (M2ReportUpload)

**Today.** Both widths draw `M2ReportUploadView` (`src/features/labResults/views/M2ReportUploadView.tsx`), desktop in the phone column. Steps Add → Read → Check → Saved; sources photo / PDF / StudentKare lab; the check step is a form of value rows the student confirms before saving. Board: `M2ReportUpload`. Expo: `ReportUpload`.

**Change.** `wide` prop; desktop: stepper and source rows (or the lab list) on the left, the current step's card on the right; on the Check step the values form takes the right column at a readable width (≈ 640 px) with the report date and lab name above it. Same components (`SourceRow`, `ValueRowCard`, `TextField`, `Button`).

**States.** Add (online / offline: sources disabled with `m2v.up.needsConnection`), upload failed banner, labs loading / error / empty, check loading / error, save conflict / validation refused / failed, saved, ask-a-doctor asking / asked / error.
**Not changing.** Nothing is saved until the student ticks and saves; validation, units, the date rule, the server scan, review request.
**Risks.** Wrong-person: the upload is always the signed-in student's own record (no picker for another person exists; none added). Losing a half-filled form on resize: the view-model holds the form, so a layout change does not reset it (test below).
**Tests.** Resizing phone ↔ desktop mid-Check keeps the rows; Save disabled until a row is valid at both layouts; offline disables all three sources.
**Screenshots.** Add, Check (with an invalid date), Saved, save error, offline.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 6. Health vault (one view)

**Today.** Phone: `VaultWorkspaceHub` (`src/screens/vault/VaultWorkspaceHub.tsx`, `lucide-react`, `wf-*` CSS): tabs Records (`RecordsPanel` from `MemberPanels`) / Access (`ConsentInboxBoard`) / Family (`FamilyCircleBoard`), plus a Visit summaries button. Desktop: `WebVaultView` (`t1/WebVaultView.tsx`): Export all, Add a document, four stat tiles, category chips + search, a documents table with Share / Revoke per document, share dialog (1–90 days), revoke confirm. Expo: `HealthVaultNativeView` (documents and active shares with Withdraw). Boards: `RecordsVault` (page 2, `inProgress`), `WebVault` (3b, built).

**Change (Q1, Q2).** One `HealthVaultView` (React Native, M2 pieces) on a new `HealthVaultViewModel`-backed route at both widths and on Expo:
- `M2Header` "Health vault" + Add a document (opens the existing report upload / capture) + Export all;
- the M2Profile "Health documents" gradient cards (Lab reports / Prescriptions / Scans) as filters, then category chips and search;
- documents as `M2ListRow`s on the phone; on desktop the same rows in a 2-column `M2Grid` (or the table if Q2 keeps it: recommended table on desktop, rows on phone, one data source);
- tabs: Documents · Prescriptions (§7) · Who can see (consent inbox content, §15) · Family (care circle, §16) · Visit summaries link;
- Share (same dialog fields and 1–90 day rule) and Revoke (same confirm) on each document.
`M2EmptyState` with `anim-file-text` for first time. Retires `VaultWorkspaceHub`, `RecordsPanel` use here, and `WebVaultView`.

**States.** Loading, first time (no documents), no match for filter, error (retry), offline (list read-only from cache if loaded; Share / Revoke / Add / Export disabled with a reason), share failed (server message), revoke failed (alert, shares reloaded), shared-until and expired shares, revoked.
**Not changing.** Endpoints (`/health/documents`, `/records/shares`, `/records/shares/{id}/revoke`, export), the share dialog wording and limits, revoke wording (`swt.vault.revokeTitle/Body`), the deliberately-not-drawn ABDM link and Source column.
**Risks.** **Data exposure:** a share to the wrong clinician (same email field and confirm; no autocomplete added). **Revoke paths:** today there are three (WebVault revokes all active shares of a document in a loop; Consent inbox and Expo revoke one). The one view uses one view-model method; a partial failure in the loop must say which shares were not revoked and reload (today it shows a generic failure and reloads). Stale share status after revoke: always reload from the server, never flip locally.
**Tests.** Revoke success and partial failure (second call fails → alert, list reloaded, nothing shown as revoked that the server still has); offline disables every write; share days outside 1–90 refused before sending; documents of the signed-in student only (no other id path exists); `lucide-react` not imported.
**Screenshots.** Data, first time, filtered no match, share dialog, revoke confirm, revoke failed, offline.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 7. Prescriptions → vault

**Today.** Both widths draw `MyPrescriptionsPanel` (`src/screens/workspace/MyPrescriptionsPanel.tsx`, `lucide-react`, `wf-*`): e-prescriptions (`GET /prescriptions`: ref, medicine count, issued, prescriber reg no., valid until, status / expired, items table, advice, allergy conflict line, Send to pharmacy → `POST /dispenses` by pharmacy id) and tests your doctor ordered (`GET /lab-orders`: status, slot, fasting, collector, Choose / Change time, sample rejected, awaiting review, released + review note). Boards: `PrescriptionUpload` (upload, unchanged); `ConsultSummary` shows prescriptions per visit. No M2 board.

**Change (Q4).** The vault's **Prescriptions** tab draws the same two sections with `M2Card` / `M2ListRow`; the items table stays a table (a `role="table"` view at both widths, as Trends does); the dialogs (send to pharmacy, choose a time) stay the same flows in the shared `Sheet` (phone) / dialog (desktop). `/prescriptions` redirects to `/records?tab=prescriptions`; My health's `collection` link and the sidebar follow.

**States.** Loading, empty (each section's existing empty copy), error per section, offline (read-only; Send and Choose time disabled), expired prescription, allergy conflict, awaiting payment, sample rejected, report released.
**Not changing.** Prescription content and order, the allergy line (stays `danger` text, as a server-flagged alert), expiry rule, `/dispenses` body, slot picking. No price or product appears here (Rule L).
**Risks.** Sending to the wrong pharmacy (same id field, same confirm); hiding the allergy line in a narrower card (it stays above the actions at every width).
**Tests.** Redirect keeps the student signed in and lands on the tab; allergy conflict visible at both layouts; expired prescription has no Send; `lucide-react` gone.
**Screenshots.** Data (one active, one expired), allergy conflict, empty, send dialog, offline.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 8. Visit summaries

**Today.** Phone: `VisitSummaryRoute` → `VisitSummaryView` (`src/features/vault/views/VisitSummaryView.tsx`, React Native). Desktop: `WebConsultSummaryRoute` (`t1/WebConsultSummaryView.tsx`, DOM). Both on `VisitSummaryViewModel`. Boards: `ConsultSummary` (page 2), `WebConsultSummary` (3b), both `inProgress`. Not on Expo.

**Change (Q2).** Desktop draws `VisitSummaryView` in `M2WideColumn`: list of visits on the left (`M2ListRow`), the selected summary on the right (signing doctor, reg no., visit and signing times, the four parts of the note, prescriptions issued → §7 tab). Phone keeps list → detail. M2 cards replace `Card`. `WebConsultSummaryView` retired.

**States.** Loading, empty (no signed visits: Appointments), error, offline (read-only), unsigned visit not shown (as today).
**Not changing.** The four note parts verbatim; nothing the server does not have (no price, rating, plain-language rewrite).
**Risks.** Showing one visit's prescriptions under another: the detail reads prescriptions by the visit id the view-model already uses.
**Tests.** Desktop selection shows the same summary the phone opens; note text verbatim; existing `VisitSummaryView.test.tsx` passes.
**Screenshots.** List + detail, empty, error.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 9. Ask Ayush (one view, two columns on desktop)

**Today.** Phone: `M2AskAyushView` (`src/features/chat/views/M2AskAyushView.tsx`) on `AyushViewModel` (ask + history): orb, BETA, "can't read your records" banner, greeting, thread, crisis card, no-source next steps, suggestion chips, red Tele-MANAS strip (`TELE_MANAS_NUMBER`), own SOS. Desktop: `WebAyushView` (`t1/WebAyushView.tsx`) on a second client, `useAyushConversation`: thread + starters + input + `CrisisLine`, and a side column "What Ayush will not do" (4 limits), transcript note + Manage, "Talk to a person" with `tel:14416` written in the file. Boards: `M2AskAyush` (page 9), `WebAyush` (3b). Expo: `AiChat` → M2AskAyush for students.

**Change (Q2).** Desktop draws `M2AskAyushView` wide: chat column (≈ 720 px) + a right column with the web's three side sections, built from `M2Card` / `M2ListRow` with the same i18n keys; on the phone the limits become a collapsible "What Ayush won't do" card under the banner (same keys). One client: `AyushViewModel`; `useAyushConversation` is kept only until §10 moves the widget, then removed. The Tele-MANAS number on the side card comes from the same constant as the strip (no literal in the view). SOS per §1.

**States.** First open (greeting), history loading / off / failed (empty, never guessed), sending (typing dots), answer with sources, no approved source (next steps), crisis intercepted (crisis card, role alert), ask failed (retry), offline (input disabled, banner).
**Not changing.** Server behaviour (scope guard, vault boundary, grounding floor, crisis interception, refusals), every crisis and limit string, the BETA and records banner wording.
**Risks.** **Crisis rendering differs between the two clients today** (`CrisisCard` vs `AyushAnswer`): moving the web to `AyushViewModel` must render the server's crisis flag as the crisis card on desktop too; test it. History is shown only when the student's setting keeps it (unchanged).
**Tests.** Crisis reply → crisis card with 112 and Tele-MANAS at both layouts; no-source reply → next steps; offline disables send; desktop side column present, phone collapsible present and closed by default; no `tel:` literal in the view.
**Screenshots.** Greeting, answer with sources, crisis, no source, offline, desktop with side column.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 10. Ayush widget (restyle; kept by decision 1)

**Today.** `AyushWidget` (`src/features/ayush/AyushWidget.tsx`, `ayush.css`): launcher bottom-right, 420 × 680 non-modal panel on wide screens (modal sheet when narrow), its own header, thread (`AyushAnswer`), input, and an emergency line with literal `tel:112` / `tel:14416`. Hidden on `sos`, `emergency-card`, `checkout`, sign-in pages, `ayush`, `medical-incident` and any `crisis*` route (`AYUSH_WIDGET_HIDDEN`). Board: `AyushWidget` (page 8, built).

**Change.** Keep the container, launcher position, hidden-routes list and non-modal behaviour. Inside the panel draw the M2AskAyush pieces (orb header, bubbles, crisis card, chips, Tele-MANAS strip) extracted from `M2AskAyushView` into a shared `AyushThread` component, on `AyushViewModel`. Then delete `useAyushConversation` and the widget's own bubble CSS.

**States.** As §9, inside the panel; plus closed / open, and focus returns to the launcher on close.
**Not changing.** Where the widget appears or hides; the emergency line is present in every state.
**Risks.** Two open conversations (page + widget) on `/ayush`: impossible, the widget is hidden there (test kept). Focus trap: the panel stays non-modal on wide screens (no trap), modal with trap when narrow, as today.
**Tests.** Hidden-routes test unchanged; crisis card in the panel; emergency numbers from the constant; `ayush.test.tsx` updated, not weakened.
**Screenshots.** Launcher, panel greeting, answer, crisis, offline (1440 only; widget is not on the phone).

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 11. Profile (M2Profile wide; identity)

**Today.** Phone: `M2ProfileView` (`src/features/m2profile/views/M2ProfileView.tsx`): navy hero (identity, completion ring), vitals strip (blood group etc.), On campus (emergency card, pass), Health documents rail, Student Plus, settings rows, language sheet, Sign out; own SOS. Desktop: `WebAccountView` (`studentweb/views/WebAccountView.tsx`): contact & identity rows from `/profile` and `/identity`, Kare points, messages channels, a "clinician?" banner, links to Privacy, Leave campus, Delete, an edit drawer (`ProfileForm`). Boards: `M2Profile` (page 9), `WebAccount` (3b, Tier 2).

**Change (Q2).** Desktop draws `<M2ProfileRoute wide />`: hero full width; row of vitals + On campus (`M2Grid` desktop 3); documents rail becomes a 3-card row; settings list beside an **Account details** card that carries the web's contact & identity rows, messages summary and the Edit drawer (same `ProfileForm`), plus the Privacy / Leave campus / Delete rows. The "Are you a clinician?" marketing banner is not carried over (no marketing on a signed-in health page; it stays on the public site). SOS per §1. `WebAccountView` retired for `/profile`.

**States.** Profile loading / error (hero retry), vitals loading / error, documents loading / error, offline banner, points error, prefs error, Sign out confirm.
**Not changing.** Identity values and what "verified" means (from `/identity`), completion rule, blood group words, the sign-out confirm, `ProfileForm` validation and the 18+ birth-date rule.
**Risks.** **Data exposure on a shared screen:** desktop shows phone and email in full today (no change); the emergency-card tile shows no clinical value (unchanged). Wrong-person: all reads are `/profile` of the session user.
**Tests.** Account details card renders the same rows as `WebAccountView` did; Edit opens `ProfileForm`; no clinician banner; one Sign out.
**Screenshots.** Default, loading, profile error, offline, edit drawer open.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 12. Digital ID

**Today.** Phone: `DigitalIdRoute` (`src/features/digital_id/views/DigitalIdNativeView.tsx`) on `DigitalIdViewModel`: ID card from `/identity` and `/health/policies`, QR (create / replace / revoke with confirm), ABHA row, link to the pass. Desktop: `MemberProfilePanel initialTab="digital-id"` → `DigitalIdPanel` (`src/screens/workspace/DigitalIdPanel.tsx`, `lucide-react`): tabs Card / ABHA / Health passport QR, its own requests (one refresh is `.catch(() => undefined)`, a silent failure), print, replace and revoke. Board: `DigitalId` (page 2; Tier 2 board, listed Tier 1 here for identity). Expo: `DigitalId`.

**Change (Q1).** Desktop draws `DigitalIdRoute` wide: ID card left, QR and its controls right, ABHA and policies below; restyled with `M2Card` / `M2ListRow`. One view-model, so the silent catch goes away with `DigitalIdPanel`. The desktop-only **Health passport** (`HealthPassportQRScreen`) stays reachable as a row opening the existing screen, unchanged. QR colours move from the two raw hex values in `DigitalIdNativeView` to `qr-foreground` / `qr-background` (the tokens exist for exactly this; same black-on-white in both schemes).

**States.** Loading, error (retry), not issued (Create), issued, stale (refresh due), replacing / revoking busy, revoke confirm, action failed, offline (QR shown only if still within its step; actions disabled).
**Not changing.** Issue / replace / revoke endpoints and confirm copy, refresh timing, what the card shows.
**Risks.** QR scan failure if colours invert (tokens are fixed in both schemes; test). A stale QR shown as valid (the view-model already hides a stale code). Note for the build: `DigitalIdViewModel` has an English error string in code ("Your QR wasn’t created. Try again.") against AGENTS.md rule 11; move it to i18n with the same English text.
**Tests.** QR uses `qr-*` tokens in dark mode; revoke needs confirm; offline disables actions; desktop no longer imports `DigitalIdPanel`; existing `DigitalIdViewModel.test.tsx` passes.
**Screenshots.** Issued, not issued, revoke confirm, error, offline, dark mode QR.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 13. Privacy & consent

**Today.** Both widths: `PrivacyConsentView` (`src/features/privacy/PrivacyConsentView.tsx`, DOM `sk-sw-page`): the consent ledger from `GET /privacy/consents` (required consents with wording and notice versions, and what withdrawing means → delete account), optional purposes with switches (`POST /privacy/consents/{purpose}`). No canvas board. Not on Expo.

**Change (Q1).** Same component tree, M2 look: `M2Header`, each consent as an `M2Card`, optional ones as `M2ListRow` with a switch in `trailing`; desktop 2 columns (required | optional). The DOM page stays DOM only if a native port is not approved; recommended: port to React Native so Expo can register it in phase 4.

**States.** Loading, error (retry), a switch busy, a switch failed (that row only, value left as the server has it), offline (switches disabled with a reason).
**Not changing.** Every consent title, wording, notice version and the withdraw explanation, byte-identical; no pre-ticked switch; withdrawing stays one tap, as easy as giving.
**Risks.** A switch showing a state the server did not confirm: rows render only from the server's reply (as today), never optimistically.
**Tests.** Failed change leaves the switch as the server has it; wording snapshot per language unchanged; existing `PrivacyConsentView.test.tsx` passes.
**Screenshots.** Default, one optional withdrawn, change failed, offline.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 14. Data rights

**Today.** Both widths: `DataRightsView` (`src/features/privacy/DataRightsView.tsx`, DOM): rights cards (access, correct, erase with the grace days from settings, etc.) and the grievance officer from the legal documents (loading / error / unpublished). No canvas board. Not on Expo.

**Change (Q1).** `M2Card` per right with its icon in a `SoftIcon` tile and its actions as buttons; desktop 2-column `M2Grid`.
**States.** Grievance loading, error (retry), unpublished (the existing "meanwhile" text), offline (actions that need the network disabled).
**Not changing.** Rights wording, grace days from `getSetting`, grievance text.
**Risks.** Low; showing a grievance address before legal publishes it (unchanged rule: only when published).
**Tests.** Unpublished state; grace days read from settings; existing `DataRightsView.test.tsx` passes.
**Screenshots.** Default, grievance unpublished, grievance error.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 15. Consent inbox

**Today.** Both widths: `ConsentInboxBoard` (`src/features/vault/views/ConsentInboxBoard.tsx`, page 2 `BoardKit`), also embedded in the phone vault's Access tab: "Awaiting your decision" (always the empty line, no access-request API), active clinician shares with days left and "Revoke now" (`POST /records/shares/{id}/revoke`) behind a confirm. Board: `ConsentInbox` (page 2, built). Not on Expo.

**Change (Q1).** `M2Header`, shares as `M2ListRow` (clinician, document, "until …", days left in `trailing`), revoke confirm unchanged; desktop 2 columns. Becomes the vault's "Who can see" tab (§6) and stays at `/consent`.
**States.** Loading, error, none shared (Open records), revoke busy, revoke failed (danger note), revoked (positive note), expired shares not listed as active.
**Not changing.** Revoke wording and confirm, "awaiting" honesty (no fake requests).
**Risks.** Revoking the wrong share: confirm names clinician and document (as today).
**Tests.** Revoke confirm names both; failure keeps the share listed; existing `safetyBoards.test.tsx` passes.
**Screenshots.** Active shares, none, revoke confirm, revoke failed.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 16. Care circle

**Today.** Both widths: `FamilyCircleBoard` (`src/features/vault/views/FamilyCircleBoard.tsx`), also the phone vault's Family tab: says nothing is shared with family (no API, D6-12), keeps "paying does not buy access", links to emergency card and clinician sharing. Board: `FamilyCircle` (page 2).

**Change (Q1).** `M2Card` + two `M2ListRow` links; desktop 2 columns. M2Profile's "Share with family" row stays "coming soon".
**States.** Static content; offline needs nothing. Loading / error n/a (no read).
**Not changing.** All copy; no switches drawn.
**Risks.** Low.
**Tests.** No switch rendered; both links go where they did.
**Screenshots.** Default at 390 / 1440.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 17. Sign-in & security

**Today.** Both widths: `SignInSecurityRoute` (`src/features/account/views/SignInSecurityView.tsx`, React Native, 454 lines): two-factor (setup key grouped in fours), passcode, contacts, password card, sessions, on `TwoFactorViewModel`, `PasscodeViewModel`, `ContactsViewModel`, `PasswordCardViewModel`, `AuthViewModel`. Board: `WebSecurity` (3b, Tier 2 board, built). Not on Expo as one screen (`TwoFactorSetup` exists).

**Change (Q1).** Wrap each existing card in `M2Card`, `M2Header`; desktop 2-column `M2Grid` (2FA + passcode | password + contacts; sessions full width). No logic moves.
**States.** Each card's own loading / error / busy / success as today; offline: every change disabled.
**Not changing.** All auth logic (no fallback grants a session, AGENTS.md rule 2), setup key handling, password rules.
**Risks.** Setup key or QR shown wider on a shared desktop screen: unchanged visibility rules (shown only during setup).
**Tests.** Existing `SignInSecurityView.test.tsx` and `PasswordCard.test.tsx` pass; desktop grid renders all cards.
**Screenshots.** Default, 2FA setup step, error on one card, offline.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 18. Verify identity

**Today.** Both widths: `IdentityVerifyView` → `IdentityVerifyPanel` with `wide={!phone}` already (`src/features/auth/views/IdentityVerifyView.tsx`); college ID row opens the campus verification sheet; reloads `/identity` on close. Boards: `VerifyIdentity` (page 1), `WebVerify` (3b), both built. Expo: `Verify`.

**Change (Q1).** Visual only: `M2Header`, check rows as `M2ListRow` with the status in `trailing`; keep the five illustrations the briefs require.
**States.** All good, photo unclear, college rejects, name mismatch, code locked (the board's five), loading, error, offline.
**Not changing.** Verification logic, gate behaviour, what each state says.
**Risks.** A check shown as done before the server says so: rows render from `/identity` only (unchanged).
**Tests.** Five states at both layouts; `IdentityVerifyPanel.test.tsx` passes; check-icons for `VerifyIdentity` and `WebVerify`.
**Screenshots.** The five states at 390 and 1440.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 19. Delete account

**Today.** Phone: `DeleteAccountRoute` (`src/features/account/views/DeleteAccountView.tsx`, already uses an M2 piece). Desktop: `WebDeleteAccountRoute` (`t1/WebDeleteAccountView.tsx`, DOM). Both on `DeleteAccountViewModel` (`GET/POST/DELETE /records/deletion-request`; grace days from `privacy.deletion_grace_days`). Boards: `DeleteAccount` (page 2), `WebDeleteAccount` (3b). Expo: `DeleteAccount`.

**Change (Q1, Q2).** Desktop draws `DeleteAccountView` wide: what is deleted / what happens next on the left, the confirm card (export first, then request) on the right. `WebDeleteAccountView` retired.
**States.** Loading, no request (start), confirm, request pending ("day n of N", Cancel), cancelled, error (retry), offline (request and cancel disabled).
**Not changing.** Deletion logic, grace period source, confirm wording, red for the destructive action, no animation, the crisis link on this page.
**Risks.** **Destructive:** a double request or a request without confirm. The view-model already guards; the test below checks both widths. Cancel must be as easy as confirm.
**Tests.** Request needs the confirm at both layouts; pending shows day n of N from the server time; cancel works offline-disabled; `DeleteAccountViewModel.test.ts` passes.
**Screenshots.** Start, confirm, pending, cancelled, error, offline.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 20. Leave campus

**Today.** Phone: `LeaveCampusRoute` (`src/features/campus/views/LeaveCampusView.tsx`, BoardKit). Desktop: `WebLeaveCampusRoute` (`t1/WebLeaveCampusView.tsx`, DOM). Both on `LeaveCampusViewModel`. Boards: `LeaveCampus` (page 2, Tier 2), `WebLeaveCampus` (3b, Tier 1). Expo: `LeaveCampus`.

**Change (Q1, Q2).** Desktop draws `LeaveCampusView` wide: "what stays" | "what changes", confirm below. `WebLeaveCampusView` retired.
**States.** Loading, not on a campus, confirm, submitted, error, offline.
**Not changing.** Only changes the backend makes are listed; departure rules; no personal-email field or plan picker.
**Risks.** Medium: losing campus benefits by mistake; confirm stays explicit.
**Tests.** Confirm required; lists match `campus_departure` effects as today; `LeaveCampusViewModel.test.ts` passes.
**Screenshots.** Default, confirm, submitted, error.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 21. Emergency card

**Today.** Phone: `EmergencyCardRoute` (`src/features/emergency/views/EmergencyCardBoard.tsx`): the card (identity strip, blood group in words, allergies, conditions, contact with the middle of the number hidden), Edit, Call 112 in every state. Desktop: `WebEmergencyCardRoute` (`t1/WebEmergencyCardView.tsx`): editor beside a live preview, "card is n % ready", who can see it, print. Both on `EmergencyCardViewModel` (`GET/PATCH /api/profile`). Boards: `EmergencyCard` (page 2), `WebEmergencyCard` (3b). Expo: no card screen (its link opens the SOS `Emergency` screen; phase 4). Ayush widget hidden here.

**Change (Q1, Q2).** One view: the card face is one component used by both; phone keeps view → Edit; desktop shows the editor beside the live card (the 3b layout, rebuilt with M2 cards and the existing fields). Readiness and "who can see" cards under the card on desktop, under the editor on phone.
**States.** Loading, error (Call 112 still shown), empty card (Not set everywhere, Call 112), editing, unsaved changes, save busy, save failed (no "Saved"), saved, offline (card from the last load if any, editing disabled; Call 112 always).
**Not changing.** Field rules (blood group defaults to Not set; accepted values), allergies red, hidden middle digits, no QR or offline promise (D6-2, D9-7), print.
**Risks.** **Wrong data on a card a responder trusts:** save failure must never read as saved (existing guard; test both layouts). Call 112 never behind loading or error.
**Tests.** Call 112 present in every state at both layouts; save failure keeps the draft and shows the error; `WebEmergencyCard.test.tsx` and `safetyBoards.test.tsx` pass (moved to the one view).
**Screenshots.** Card, empty, editing with an invalid number, save failed, offline.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## 22. Check-in pass

**Today.** Phone: `MyPassRoute` (`src/features/digital_id/views/MyPassBoard.tsx`): QR on `qr-background`, spoken code for the current step, countdown ring, "offline for n minutes" chip, stale state hides the code, link to Digital ID for create/replace. Desktop: `WebPassView` (`t1/WebPassView.tsx`) on the same `livePass`. Boards: `MyPass` (page 2), `WebPass` (3b). Not on Expo.

**Change (Q1, Q2).** Desktop draws `MyPassBoard` wide: QR + code + ring on the left, how check-in works and the Digital ID link on the right; `M2Card` look. `WebPassView` retired.
**States.** Loading, not issued (go to Digital ID), live, refreshing, stale (code hidden, attention note), offline (minutes chip; stale once the step expires), error.
**Not changing.** Step timing, signing, the stale rule, QR colours (`qr-*`), no clinical value on the pass.
**Risks.** **Wrong-person / replay:** a stale code shown as valid; the stale rule is in `livePass` and is reused. A bigger QR on desktop stays within scanner-friendly size (same module size cap as today).
**Tests.** Stale hides the code at both layouts; offline chip counts from server time; `WebPass.test.tsx` moved to the one view and passes.
**Screenshots.** Live, stale, not issued, offline, error.

> **Decision:** ☐ Approve as written ☐ Approve with changes ☐ Hold

---

## What this file does not do

- No code, no screenshots taken yet (they are the deliverable of each build PR).
- Expo gaps (Emergency card, Pass, Consent inbox, Care circle, Privacy, Data rights, Security, Visit summaries, Prescriptions are not registered as Expo screens) are phase 4 work, noted per section, not planned here.
- Dark mode and te/hi fitting are checked per build PR (rule 7), not here.
