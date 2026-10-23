# Newsroom content module: decisions (2026-10-23)

Scope: feat/newsroom-2 (Content module, series, 24-hour aggregator with a precision gate, share kit). Builds on
#229 (newsroom) and #234 (autopilot). Not a Tier 1 screen plan: the newsroom is editorial (Tier 3) and holds no
student data. This file records the decisions that change a safety rule.

## D-NR2-1 — Health series posts do not need a clinician (replaces part of #229)

- **Decision:** Krishna (founder, named reviewer), 23 Oct 2026.
- **What changes:** `content.health_requires_clinician` defaults to **false**. A health-advice *auto* post (Mental
  health, Women's health and Common health series episodes; health tips, explainers, myth vs fact and quick cards
  from the aggregator in a clinical category) that passes the precision gate (`content.precision_threshold`,
  default 100% of sentences traceable to an approved source) is published without a clinician's approval. One that
  does not pass waits in Super admin → Content → Review with each failed sentence and why.
- **Rule it replaces:** #229 "a health tip is published only after an NMC doctor approves that exact version",
  for auto posts only. The approval flow itself is unchanged and is still used when the switch is on.
- **Kept:** the switch (`content.health_requires_clinician`, settings registry, reason required, audited) turns the
  clinician gate back on for every health-advice post, however precise. A health post **typed by the team** is
  never scored, so it still needs a clinician's approval (no change to #229 for typed posts).
- **Safety rails that stay on whatever the switch says:**
  - Mental health posts always show Tele-MANAS 14416 and 112 (template-fixed; the category is protected and
    cannot drop the crisis lines or be archived), and the LinkedIn caption carries them too.
  - Dosing, diagnosis and treatment language (`content.advice_phrases`) fails the gate: such a post waits for a person.
  - Crisis words (`content.crisis_phrases`: suicide, self-harm, overdose …) always send a post to review.
  - Health episodes are written only from approved knowledge sources; a topic without one is skipped, never invented.
  - Kill switch, daily cap, audit trail and the Auto tag apply to every auto post.

## D-NR2-2 — Precise news publishes on its own

`autopilot.news_auto_publish` defaults to true: precise news (the gate above, plus an allow-listed, recent, dated
source) goes out; imprecise news waits in Review. The news lane itself stays off until a super admin turns it on.

## D-NR2-3 — Monday Motivation never writes a quote

The series uses only its library: the team's own words, or a quote with who said it, an https public-domain source
and the public-domain box ticked (the server refuses a quote without all three). It ships empty.
