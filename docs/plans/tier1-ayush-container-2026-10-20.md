# Tier 1 plan: Ayush widget (web) and Ayush sheet (phone), container only

**Status:** plan only. No code has been written for it.
**Approved by:** _(name, date)_
**Boards:** `AyushWidget` and `AyushSheet` (canvas page 8, Tier 1, SK-020).
**Ticket:** S11 in `docs/plans/canvas-gap-audit-2026-10-20.md`. It unblocks AyushSheet (WP-07),
AyushWidget (WP-09), Discover and Your Care.

The rule is in `CLAUDE.md` and DESIGN.md §5: Tier 1 needs a named reviewer's approval before
any code is written. Once someone approves it, write their name and the date above.

## 1. Board vs today

| | Board | Today |
|---|---|---|
| Web | A floating launcher (68 px navy orb with a halo, plus an "Ask Ayush" pill) opens a 400×580 panel. The panel has a navy header (orb, "Ayush", BETA, Ready/Typing… status, **New**, close `x`), a disclaimer strip, the conversation, five starter chips, the input with an `arrow-up` send button, and the crisis line "Emergency? Call **112** · Tele-MANAS **14416** · free, any time", which links to CrisisSupport. | There is no widget. Ayush is only the full page `/ayush` (`src/screens/workspace/AgentAyushPanel.tsx`, lucide icons, `useMutation`). |
| Phone | An "Ask Ayush" pill (with a `sparkles` orb) opens a bottom sheet over a scrim. The sheet is 64 % high, or 92 % when made taller (`chevron-up` / `chevron-down`). It has a grabber, a header (orb, "Ayush", "● Answers only from approved sources", close `x`), an "About: campus care" chip, a greeting, "TRY ASKING" chips, sources shown with ✓, the input with an `arrow-right` send button, and the footer "Ayush can't diagnose or prescribe. **Open full chat** · emergency: 112". | There is no sheet. Ayush is only the full native screen (`src/features/chat/views/AyushChatNativeView.tsx`, using `AyushViewModel`). |
| Icons | Widget: `arrow-up`, `x`, `ayush-orb` (26 px, message avatar), `ayush-orb-2` (44 px, header), `ayush-orb-3` (56 px, launcher). Sheet: `arrow-right`, `chevron-down`, `chevron-up`, `sparkles`, `x`, and `check` in place of ✓. | Every one of them is in `design/icons/icon-manifest.json`. None is used yet (check-icons gives 0/5 and 0/5). |

## 2. What will change (the container only)

- **Launcher:** the web orb button and the "Ask Ayush" nudge, and the phone "Ask Ayush" pill.
- **Panel / sheet frame:** the web panel is non-modal (`role="dialog"`, Escape closes it). The
  phone sheet uses `Modal` (`aria-modal`, focus trap, a scrim that closes it on tap), can be made
  taller or smaller, and has a grabber.
- **Header:** the orb, the name, BETA (web only) and a status line (Ready / Typing… / Offline).
  The web header has New; the phone header has taller/smaller. Both have Close.
- **Disclaimer and crisis-help line, word for word from the boards.** It shows in every state:
  offline, on error and while sending.
- **Input:** a text field with a 1,000-character limit (the current limit) and a send button that
  is disabled when the field is empty, while sending, or offline.
- **Loading / typing:** three dots and the "Typing…" status while a question is with the server.
- **Error:** "Ayush couldn't be reached…" (the existing `ayush.unreachable`) with Try again.
- **Offline:** a banner, the input and send button disabled, and the crisis line still there. On
  web, offline is read from `navigator.onLine`. Native has no network-status package, so there it
  is shown only as the error state (see decision 5).
- **Code:** `src/design-system/ayush/` (web widget in DOM + CSS with tokens; phone sheet in React
  Native) holds a frame that takes the conversation as children and never answers. A feature
  layer (`src/features/chat/views/`) connects `AyushViewModel` to the frame. New copy goes in
  `src/i18n/areas/ayushdock.ts` (en/te/hi; te/hi are drafts).
- **Adoption:** the widget goes on the student web dashboard (`/health`, students only), above the
  phone tab bar. The sheet goes on the phone Discover screen (`src/native/StudentHomeScreen.tsx`),
  unless S4 is merged first.

## 3. What will NOT change

- **Ayush's answers:** every question still goes to `POST /agents/ayush/ask` through
  `AyushViewModel`, unchanged. There is no local answer. The boards' scripted `reply()` logic is
  not used.
- **Safety checks:** the server's crisis gate, scope guard, grounding check and output guard
  (`backend/services/agent_ayush.py`).
- **Triage and crisis routing:** a `CRISIS` reply is drawn by the existing crisis card, with the
  resources the server sends. The card moves out of `AyushChatNativeView` unchanged.
- **Refusals** keep the existing `REFUSAL_NOTE` keys. **Sources** are the server's citations.
- **Data access:** Ayush never reads records. There are no new endpoints, tables or settings.
- The `/ayush` page and the native AyushChat screen stay as they are (WP-07/09).

## 4. Safety elements

- The crisis line is never behind a state, a gate or loading. It makes no request.
- Web: the line links to the crisis page. Phone: "112" is a `tel:` link with the spoken label
  "Call 112, emergency services".
- Red is used only for the crisis numbers and the server's crisis card. Network errors and
  offline use `attention` (amber), not red.
- Nothing is invented while offline or on error: no fallback answer and no cached reply.
- Starter chips only send their text to the unchanged agent. "I'm not feeling okay" therefore goes
  through the server's crisis gate.

## 5. Accessibility

- Every control has a role and a label, and a hit area of at least 44 px. The board's 36–38 px
  header buttons become 44 px. The footer links get 44 px rows.
- Focus moves to the input when the panel opens and back to the launcher when it closes. Escape
  closes the web panel. The phone sheet traps focus.
- The conversation log is `aria-live="polite"`. Errors are `role="alert"`; offline is
  `role="status"`.
- Under `prefers-reduced-motion`, the halo, the float, the dots and the sheet slide all stop.
- Light and dark use tokens only. The navy header keeps `on-hero` text in dark mode. Text is at
  least 4.5:1 and controls at least 3:1.

## 6. Tests

- Unit tests (vitest, Testing Library):
  - roles and labels;
  - open and close, focus return and Escape;
  - starters send through the view model (a fake request);
  - typing, error with retry, and offline (send disabled, crisis line present);
  - a crisis reply renders the existing card with `tel:` buttons;
  - a refusal shows its note and sources show the `check` chip;
  - both themes render tokens with no hex.
- Update `AyushViewModel.test.tsx` for the moved crisis card.
- `check-icons --screen AyushWidget` and `--screen AyushSheet` must pass before the entries move
  from `inProgress` to `screens`.
- Run both `tsc` builds, lint, `lint:ratchet`, `lint:css-colours`, `tokens:check` and the full
  vitest suite.
- Take light and dark screenshots of the widget on `/health`. Also check the sheet on web at
  390 px.

## 7. Open decisions for the reviewer

1. **Widget greeting.** The board says "I can book a lab test, find a doctor who's free today…".
   Ayush cannot book or see who is free. Proposed wording: "Ask me how to book a lab test, find
   a doctor…".
2. **Starter chips.** Should the chips use the boards' copy? Widget: lab test, doctor, yoga/gym,
   Premium, "I'm not feeling okay". Sheet: fever in hostel, blood test at hostel, clinic cover.
   Some of these will honestly get "no approved source" until the knowledge base covers them.
   The alternative is to keep today's three starters.
3. **Sheet "Your care" context.** The board's greeting says Ayush explains your reports. It never
   reads records. Proposal: build only the Discover ("campus care") context now.
4. **Crisis line target.** On web, keep the single link to `/crisis` as the board shows, or make
   112 and 14416 direct `tel:` links? On the phone, is it acceptable to make "112" a `tel:` link?
5. **Offline on native.** Add `@react-native-community/netinfo` (a new dependency), or treat a
   failed request as the only offline signal?
6. **Orb art.** The `ayush-orb*` glyphs keep the canvas indigo gradient (generated art). The phone
   orb has no gradient token, so it becomes solid `brand-navy`. Is that acceptable?
7. **Where it shows.** Is the widget for students only, on the dashboard only, or on every
   student web page? (It is hidden on `/ayush` itself.)
8. **"New" chat.** Should it clear the thread on screen but keep the same server
   `conversationId`, as `AyushViewModel.reset()` does today, or start a new id? The new-id option
   changes the view model and needs approval.


## Approval (2026-10-21)

Krishna Chintakayala (founder, named Tier 1 reviewer) approved this plan on 2026-10-21 ("approve all"). Where it overlaps `tier1-mobile2-health-2026-10-21.md`, that plan wins. Anything this plan routes to the clinical lead, legal or the AI-constitution owner stays unavailable until they sign.
