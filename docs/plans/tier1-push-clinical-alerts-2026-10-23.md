# Push notifications: clinical alert content — plans awaiting review

**Status:** awaiting review. Nothing below is built; the shipped push (feat/push-notifications) sends
only fixed, generic lock-screen lines for anything about care, and refuses health words in announcements.
**Rule:** `CLAUDE.md`, `DESIGN.md` §5 and §7. Each item needs a named design reviewer **and** clinical
(and, where marked, legal) sign-off before a branch is opened. Write the approver's name and the date in
each **Approved by** line. For Krishna to route.

---

## 1. Public-health announcements to a campus (dengue, heat, water, outbreak, flu camp dates)

**Approved by:** _(clinical lead)_ · _(design reviewer)_

**Today.** `core/push_copy.check_announcement` refuses any announcement naming a condition, medicine,
test, doctor or camp, so "Dengue alert — use nets in Block C" and "Flu camp Saturday 8 am" cannot be sent
by push. The canvas board *CampusAnnouncements* (Tier 3, campus admin) shows exactly these states.

**Question for the clinical lead.** Is a campus-wide public-health notice "health content"? It names no
person, but a lock-screen "Dengue alert" can alarm, and a camp's service (dental, eye, sexual health)
says something about the reader if it is targeted at a segment.

**Proposal.** A third announcement kind, `HEALTH_NOTICE`: only to a whole campus (never a smaller
segment), text from a reviewed template library (no free text), reviewed by a clinician account before it
can be scheduled (two-person rule, audited), shown on the lock screen as the template title only. Camp
announcements name the date and place, never the service.

## 2. Medicine reminders through quiet hours

**Approved by:** _(clinical lead)_

**Today.** Server reminders (refills, consult reminders, camp reminders) are held until quiet hours end,
as before this change. The canvas (*NotificationSettings*) says "Safety messages and medicine reminders
still come through". Local dose reminders set on the phone already ring at their time.

**Question.** Should a refill reminder (a medicine running out) break quiet hours? Proposal: no — a
refill is days ahead; dose reminders are already local. Keep as is unless the clinical lead says otherwise.

## 3. Critical lab values and clinician alerts by push

**Approved by:** _(clinical lead)_ · _(legal)_

**Today.** A released report raises the generic "You have a new update" line (category *Results &
doctors*). Nothing says a value is critical. `CRISIS_ALERT` is never pushed (pull queue only, audit JOB-06).

**Proposal for review.** A critical value (per the lab's flag, never computed by us) gets the same
generic line but the *safety* channel (high priority, ignores quiet hours), and opens the report with the
clinician's call-back note. Needs: who decides "critical", what happens when the student does not open
it, and whether the campus clinician is told too (consent).

## 4. The lock-screen detail switch on the canvas

**Approved by:** _(design reviewer)_ · _(legal)_

The canvas has "Hide health details on the lock screen" as a switch that can be turned off (then "Your
report is ready" shows). The build draws it as **always on**: the server has no detailed text to send.
Showing even "report ready" would need this plan approved, and the line must still never carry a value.
