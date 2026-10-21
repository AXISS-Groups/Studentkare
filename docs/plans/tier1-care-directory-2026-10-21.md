# Find care near you: the safety parts (Tier 1)

**Approved by:** Krishna Chintakayala (founder), 2026-10-21, in the feature ticket that specifies exactly the
changes below ("Emergency first: 112 and 108 call buttons pinned at the top of the directory and ambulance
tab; the campus SOS stays reachable"; "from the SOS/emergency card as 'Nearest hospitals'"). Nothing beyond
this list is approved by it. A design reviewer may still revise the strip's look; the behaviour rules stay.

**Scope:** the directory itself is Tier 2 (`design/screens/briefs/M2FindCare.md`, `M2FacilityDetail.md`,
`WebFindCare.md`) and its admin table Tier 3 (`AdminCareDirectory.md`). This plan covers only what touches
the safety screens or puts emergency numbers on screen.

## 1. The emergency strip on the directory

- Two call buttons, **Call 112** and **Call 108 (ambulance)**, at the top of the directory and of a place's
  page, in every state: before anything loads, on error, empty, signed out, offline. No request gates them.
- Numbers are protocol constants beside the existing ones (`EMERGENCY_NUMBER`, new `AMBULANCE_NUMBER` in
  `src/design-system/CrisisLinks.tsx`, SYNC with `src/components/health/EmergencyBar.tsx`), never copy.
- `danger-fill` is used here because these are emergency calls (DESIGN.md §3: SOS and crisis lines).
  Nothing else in the directory is red: 24×7 is a neutral chip, stale or missing data is never red.
- The ambulance tab repeats nothing new: the strip is already at its top; the tab adds the campus SOS card
  for a signed-in student.

## 2. The campus SOS stays one tap away

- The directory's hero carries the M2 SOS pill (`SosButton`) wherever a student session exists; it opens
  the same flow as every other M2 board (the phone frame's helplines dialog on the web, `Emergency` in Expo).
- The ambulance tab shows "Alert your campus" → the existing SOS flow (`SosBeacon`). Nothing about SOS
  changes: no new request, no new state, no location sent.

## 3. "Nearest hospitals" on the SOS / emergency surfaces

Additive links only. Each opens the directory on the Hospitals tab; none replaces or moves an existing
control, and none is shown before Call 112.

| Surface | Today | Change |
|---|---|---|
| SOS helplines dialog (`EmergencyHelplinesDialog`, web shell and phone frame) | Send SOS, then the helplines | A "Nearest hospitals" link after the helplines, students only |
| SOS screen (`SosView`, web and Expo), start state and after-SOS | Call 112 on every state | An optional "Nearest hospitals" secondary button after Call 112 on the start and closed states; not on the active alert (the student should not leave it) |
| Emergency card (`EmergencyCardBoard`) | The card, offline | An optional "Nearest hospitals" link under the card |

## 4. Location

- Asked for only when the student taps "Use my location", with a plain explainer first: it stays on the
  device, it is never sent or stored. Denied, unavailable or timed out: the list stays sorted by name and
  says so; directions still work.
- Distance is computed on the device from the listing's coordinates. The server never receives a position
  (a test asserts no directory request carries one). Nothing is cached beyond the view's memory.
- Expo declares foreground ("when in use") location only, with the same purpose text; no background location.

## 5. Not built (and why)

- **Map view.** No map library is in the lockfile, and OpenStreetMap's public tiles are not for app traffic
  and would disclose the student's area to a third party. Every place with coordinates has "Directions".
- **Live data from ABDM HFR.** The connector reports "not configured" or "not built"; it never fills the list.
- **Bed availability, ratings, reviews, wait times, "open now".** Not stored, not shown.
