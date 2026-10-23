# Web ↔ mobile UI parity: audit and plan (2026-10-23)

**Status:** audit, then decided. Krishna Chintakayala (named reviewer) approved the decisions below on 23 Oct 2026. Phase 1 shipped in #240; the shell and duplicate changes ship in the PR that adds this section.

**Ask (Krishna):** the web UI and the mobile UI don't match. Web should use the same cards, bento cards, icons (including the animated ones) and look as mobile, and the other way round. Every duplicated module or entry point should be listed so it can be moved or hidden.

## How this was checked

- `main` @ `ea6a2588`, backend `APP_ENV=testing SEED_DEMO_DATA=true` on SQLite, Vite on its own port, signed in as `demo.student@studentkare.test` and as the campus, doctor, partner and super-admin demo accounts.
- 50 student screens at **390 px** (phone web: `StudentPhoneFrame` + Mobile 2.0 pill nav) and **1440 px** (desktop web: `StudentWebShell`), plus the Ayush widget open, the phone More menu and the four role homes. That makes 108 PNGs plus `report.json` (per shot: shell, pill nav, counts of SOS / bell / Ayush / search / cart controls, Lottie count, horizontal overflow, failed API calls). They're local only, not committed: `/home/claude/navy-shots/parity/before/`.
- **Expo app:** `expo export --platform web` doesn't build (`@expo/metro-runtime` isn't installed), so there are no native screenshots. The native app draws the same feature views as phone web (`src/native/*Screens.tsx` wrap `src/features/**/M2*View`). For every M2 screen, **390 px web is a faithful stand-in for native**. Native-only differences are noted inline.
- Reference: the Mobile 2.0 boards (canvas page 9, 13 boards, approved 2026-10-21), `src/design-system/m2/`, `design/icons/animated/README.md`.
- No horizontal overflow and no failed API calls on any shot.

## The root cause in one paragraph

The two widths are two separate products. Below `size.phoneFrameMax` (430 px), a student gets `StudentPhoneFrame` and, for 24 routes, the Mobile 2.0 boards built from `src/design-system/m2` (`studentPhoneBoards.tsx`). Above it, a student gets `StudentWebShell` (white top nav plus a navy grouped sidebar, canvas page 3b) and one of three things:

- **(a)** a 3b web view in `src/features/studentweb/views/**` (DOM + `studentweb.css`, static `<Icon3d>`, no gradients). Examples: Your Care, Orders, Vault, Ayush, Account.
- **(b)** the **phone board itself, centred in a ~390 px column** inside the desktop shell. Examples: Labs, Consults, Camps, My health, Trends, Medicines today, Water, Steps, Medicine info, What's new.
- **(c)** an older pre-canvas panel. Examples: Appointments, Notifications inbox, Insurance / Plan / Digital ID (`MemberProfilePanel`), Preventive care, Medications, Prescriptions.

Only Shop has a real wide M2 layout, and it does that by **re-implementing M2 in DOM** (`studentweb/views/shop/m2WebParts.tsx` + `m2webshop.css`, which duplicate `SoftIcon`, `NotYetTile` and the hue palette). The M2 components themselves have no wide layout: `SoftTileGrid` is fixed at 4 per row, `M2Card` and `GradientHeroCard` have fixed phone sizing, and `M2Header` and `M2SearchField` assume a phone gutter.

## Top 10 mismatches (ranked by how often a student sees them)

1. **Home is two different screens on the same URL.** `/health` is M2Home at 390 (greeting header, service rail, hero carousel, "Today for you" bento, Shop by concern, On campus). At 1440 it is `WebDashboardView` "Your Care", an empty-state card and a "Book something" button. A third home, `/home` (`WebHomeView`), is a marketing-style hero, and that is where the logo goes.
2. **Phone boards shown as a 390 px strip on desktop.** Labs, Consults, Camps, My health, Trends, Report upload, Medicines today, Water, Steps, Medicine info and What's new leave about 60% of a 1440 px screen empty.
3. **Navigation models differ.** Mobile uses a five-destination pill nav (Home · Orders · Ask Ayush orb · My health · Profile). Desktop uses a five-link top nav (Shop · Lab tests · Doctors · Health vault · Ayush) plus a 17-item sidebar in 3 groups. The groupings and names don't line up: "Your Care" on desktop → `/health`, but "My health" on mobile → `/your-care`.
4. **Animated icons only on mobile.** The pill nav (anim-home / heart / user), M2Orders' 3D cart and M2Labs' / M2Consults' scenes animate. Desktop 3b views use static `<Icon3d>` tiles: Your Care, Orders and Vault empty states, and My lab tests. Native StateScreen marks animate; desktop panels don't.
5. **Gradient service tiles and heroes only on mobile.** `ServiceRail`, `GradientHeroCard`, `HeroCarousel` and the bento "Today for you" don't exist on desktop outside Shop. Desktop cards are flat white `sk-sw-card` with `radius-xl`; M2 cards are 22 px radius with `shadow.card` and hover lift.
6. **Orders.** M2Orders has Active/Past segments, a Help pill, SOS and an animated 3D cart. `WebOrdersView` has a plain title, a count line and a static 3D cart tile, with no segments.
7. **Profile.** M2Profile has a navy hero with a completion ring, a vitals strip, On campus bento, gradient Health documents cards, a Student Plus card, a settings list and Sign out. `WebAccountView` has a Contact & identity table, Messages toggles, a marketing "Are you a clinician?" banner with a 3D character and the public site footer. They share almost no structure.
8. **Ayush.** M2AskAyush (orb avatar, BETA, "can't read your records" banner, chips, red Tele-MANAS strip, SOS) vs `WebAyushView` (two-column page with a "What Ayush will not do" list) vs `AyushWidget` panel (third visual design) vs `AgentAyushPanel` (staff and other roles). That is four UIs on one server agent.
9. **Records / vault.** Desktop `WebVaultView` (title, Export all, Add a document, 3D lock empty state) vs phone-web vault board (page 2 style, tabs "Health records / Access and your data", "Every record has a place.", a second empty state for shares). Two different information architectures.
10. **Refills isn't wired on desktop.** `/health/refills` at 1440 falls through to `MemberOverview` ("Your next step, made clearer."): `M2RefillsRoute` is lazily imported in `WorkspaceScreen.tsx` but never rendered. This is a **bug**, not a style difference. Smaller items: the desktop sidebar doesn't stretch to the page height in full-page captures (to be checked in a real browser), and Blog / News are public pages with no shell and no SOS at either width.

## Per-screen comparison

Key. **Mobile** is what 390 px web and the Expo app draw. **Web** is what 1440 px draws. **Fix** names what the web should reuse, or what web has that mobile lacks. "Column" means the phone board is centred in about 390 px on desktop. Tier is from DESIGN.md §5.

### Home

| Screen (route) | Mobile | Web 1440 | What differs | Fix | Tier |
|---|---|---|---|---|---|
| Home `/health` | M2Home: `RoundButton` bell and cart, `SosButton`, `M2SearchField` + Rx button, `ServiceRail` (glossy gradient tiles), `HeroCarousel`, "Today for you" bento (Medicines-today navy card + ring, Upload report, Buy again), Next consult, blog, `SoftTileGrid` concerns, On campus bento | `WebDashboardView` "Your Care": title, "Book something" menu, empty card with static `Icon3d` bar-chart | Different screen. No rail, carousel, bento or gradients on web. Web has a week summary / needs list / semester / upcoming that mobile lacks | Make M2Home responsive: rail + carousel full width, "Today for you" as a 3–4 column bento, concerns 8 per row, On campus 4 per row. Move the web-only "Needs you" and "Upcoming" into M2Home as bento cards (both have data); drop "Book something" (the rail covers it) | 2 |
| Web home `/home` | (phone web shows the same marketing page in the frame) | `WebHomeView`: display hero, search, Ayush hero card, 4 feature cards, campus band, public footer | A signed-in marketing page; it duplicates the landing | See Duplications (home ×3). Make `/home` redirect to `/health`, or keep it public-only | 2 |
| Search `/search` | Phone search board (`SearchEntryView`, M2 search field, popular categories) | Same view in the page column | Minor: narrow column | Responsive `M2SearchField` + results grid | 2 |

### Shop / Medicines

| Screen | Mobile | Web 1440 | What differs | Fix | Tier |
|---|---|---|---|---|---|
| Shop `/shop` | M2Medicines: `M2Header`, search, Rx/Call/Chat quick cards, Generics gradient hero, Clinic pickup / To your block, `SoftTileGrid` categories, Refills row, Medicine info row, Below MRP rail, generic-vs-brand table, Kare points | `WebShopFront`/`WebShopView`: M2 look rebuilt in DOM (`m2WebParts.tsx`): rail, two heroes, quick cards, categories card, filters, product grid, cart rail, Ayush card, Urgent card | Closest pair. But it is a **second implementation** of M2 (own `SoftIcon`, `NotYetCard`, `hueStyle`, CSS gradients). Web has a filter bar, a full grid and a cart rail that mobile lacks; mobile has Medicine info and lab-package rows | Replace `m2WebParts` with the shared M2 components once they are responsive (phase 1). Keep the web's filter bar and grid as a wide variant of the "Below MRP" rail | 2 |
| Product / Medicine detail | M2Product (generics compare, gradient art) | `WebProductView` (DOM) | Separate code, similar content | Reuse M2Product with a two-column wide layout (art left, buy box right) | 2 |
| Medicine info `/medicine-info` | M2MedicineInfo (soft cards, animated mark) | Same board, `wide` (one wider column) | Mostly a column | Already responsive-ish: widen to two columns | 2 |
| Cart / Checkout `/checkout` | Phone cart board | `WebCheckoutView` (DOM, 3b) | Different layout and components | Shared summary card + price row; checkout is commerce-only (Rule L) | 2 |
| Buy again `/buy-again` | `WebReorderView` reflowed in the frame (no M2) | `WebReorderView` | Neither uses M2. Mobile Home's "Buy again" bento opens it | Restyle with M2 list rows + `LiftCard`; native has M2Reorder (`M2ReorderView`) and web should use it | 2 |

### Labs

| Screen | Mobile | Web 1440 | What differs | Fix | Tier |
|---|---|---|---|---|---|
| Lab tests `/lab-tests` | M2Labs: header + My reports pill, search, 3D quick tiles, gradient hero (price + Book a slot), test rows, "How collection works" stepper, `scene-lab-workers` when empty | Same board in a column | Column only | Responsive M2Labs: hero + quick tiles in one row, test rows as a 2–3 column card grid | 2 |
| My lab tests `/my-lab-tests` | `WebMyLabTestsView` reflowed in the frame (no M2) | `WebMyLabTestsView` (static `Icon3d`) | No M2 at either width | Rebuild on M2 list rows + `AnimatedIcon` empty state | 2 |
| Report insights `/report-insights` | `WebReportInsightsView` reflowed | same | No M2 at either width; overlaps M2Insights + Trends | Fold into My health (M2Insights) / Trends. **Shows clinical values** | **1** |

### Consults

| Screen | Mobile | Web 1440 | What differs | Fix | Tier |
|---|---|---|---|---|---|
| Doctor consults `/care` | M2Consults: concerns grid, doctor cards, `scene-medical-workers` empty | Same board in a column | Column only | Responsive grid of doctor cards (2–3 columns) | 2 |
| Find care `/find-care` | CareDirectory (M2 parts) | Same board, `wide` (two columns) | Already two columns | Done. Check the card radius matches `M2Card` | 2 |
| Appointments `/appointments` | Phone appointments page (page 2) | `AppointmentsPanel` (older, lucide icons) | Different look; web uses `lucide-react` | Rebuild on M2 list rows + `anim-calendar` empty | 2 |
| Visit summaries | Phone board | `WebConsultSummaryView` (t1) | Separate code | Shared card. **Clinical** | **1** |

### Camps

| Screen | Mobile | Web 1440 | What differs | Fix | Tier |
|---|---|---|---|---|---|
| Health camps `/health-camp` | M2Camps (bookings, upcoming, `anim-calendar` empty) | Same board in a column (the Lottie doesn't run at 1440: count 0) | Column; no animation on web | Responsive 2-column camp cards. Check why the empty mark is static on desktop | 2 |

### Refills and medicines

| Screen | Mobile | Web 1440 | What differs | Fix | Tier |
|---|---|---|---|---|---|
| Refills `/health/refills` | M2Refills (list, setup, reorder sheet) | **Not wired:** falls through to `MemberOverview` | **Bug** | Add `case 'health/refills'` to the desktop switch (`<M2RefillsRoute wide />`), then make it responsive | 2 |
| Medicines today `/health/medicines` | M2Reminders | Same board, `wide` | Column | Responsive | 2 |
| Medications `/medications` | Phone page (older) | `MedicationPanel` (lucide) | Overlaps Medicines today | See Duplications: merge into Medicines today | 2 |
| Prescriptions `/prescriptions` | Phone page | `MyPrescriptionsPanel` (lucide) | Older panel at both widths | Move into Vault (documents) with M2 cards. **Clinical** | **1** |

### Records / Vault and My health

| Screen | Mobile | Web 1440 | What differs | Fix | Tier |
|---|---|---|---|---|---|
| Health vault `/records` | Phone vault board (page 2: tabs, two empty states, Privacy & access card) | `WebVaultView` (3b: header actions, static 3D lock) | Different IA and look | One vault view: M2 header, gradient "Health documents" cards as on M2Profile (Lab reports / Prescriptions / Scans), M2 rows, `anim-file-text` empty, two columns on desktop. **Consent/sharing** | **1** |
| My health `/your-care` | M2Insights (navy hero, Medicines today, Water, Steps, Trends, report cards) | Same board in a column | Column; desktop sidebar calls `/health` "Your Care" | Responsive bento (3 columns). Rename (see Duplications) | **1** (clinical values) |
| Trends `/health/trends` | M2Trends (chart) | Column | Column | Wider chart + side list | **1** |
| Report upload `/health/report-upload` | M2ReportUpload | Column | Column | Two-column (source picker + values form) | **1** |
| Water / Steps | M2Water / M2Steps | Column (Water `wide`) | Column | Responsive | 2 |
| Insurance `/insurance` | **Phone web:** `InsurancePage` (old panel). **Native:** M2Insurance | `MemberProfilePanel` tab | Native and phone web differ from each other, and web is a third design | Use M2Insurance everywhere (phone web and desktop) | 2 |
| Vaccines `/preventive-care` | M2Vaccines (tracker) | `PreventiveCareScreen` (older hero "A little planning…") | Different screens | M2Vaccines everywhere, wide variant | 2 |

### Ayush

| Screen | Mobile | Web 1440 | What differs | Fix | Tier |
|---|---|---|---|---|---|
| Ask Ayush `/ayush` | M2AskAyush (orb, BETA, records banner, chips, Tele-MANAS strip, SOS) | `WebAyushView` (two columns + "what Ayush will not do" + transcript note) | Different visuals; the web side panel content is good and missing on mobile | One view: M2AskAyush chat column + the web's side panel as a second column on desktop (and a collapsible "What Ayush won't do" on phone) | **1** |
| Ayush widget (floating, every desktop page) | none on mobile | `AyushWidget` 420 × 680 panel, its own design | Third Ayush design | Restyle with the M2AskAyush bubble, chips and crisis strip; see Duplications for whether to keep it | **1** |

### Profile / Privacy

| Screen | Mobile | Web 1440 | What differs | Fix | Tier |
|---|---|---|---|---|---|
| Profile `/profile` | M2Profile (navy hero + ring, vitals strip, On campus bento, gradient document cards, Student Plus, settings rows, Sign out) | `WebAccountView` (Contact & identity, Messages, clinician banner, footer) | Almost nothing shared | M2Profile responsive: hero full width, vitals + On campus in one row, settings list beside the documents. Keep the web's Contact & identity rows as an "Account details" section (mobile reaches them through Settings → More) | **1** (identity) |
| Account `/account` | Phone account board | Same | Same | — | 2 |
| Plan & billing `/billing` | `PlanBillingBoard` (phone) | `MemberProfilePanel` tab "plan" | Different | Phone board, wide | 2 |
| Digital ID `/digital-id` | Phone page | `MemberProfilePanel` tab | Different | One view. **Identity** | **1** |
| Privacy & consent, Data rights, Consent, Care circle | Same view at both widths (page 2 style, not M2) | Same | Consistent but pre-M2 | M2 rows/cards. **Consent** | **1** |
| Security, Verify, Delete account, Leave campus | Phone boards / t1 views | Same or t1 web twin | Consistent-ish, pre-M2 | M2 restyle. **Identity / destructive** | **1** |

### Blog / News

| Screen | Mobile | Web 1440 | What differs | Fix | Tier |
|---|---|---|---|---|---|
| What's new `/whats-new` | M2WhatsNew (`M2PostParts`) | Same, `wide` | Column | Card grid | 3 |
| Blog `/blog`, News `/news` | Public newsroom page (no student shell, no pill nav, no SOS) | Same | Consistent, but a signed-in student leaves the app shell | Render inside the shell when signed in; reuse `M2PostParts` cards | 3 |

### Notifications

| Screen | Mobile | Web 1440 | What differs | Fix | Tier |
|---|---|---|---|---|---|
| Inbox `/notifications` | `NotificationNativeView` (animated `anim-bell-off`) | `NotificationInboxPanel` (lucide, "Your updates.") + `NotificationCenterModal` from the bell | Two web inboxes plus one mobile one | One inbox view (M2 rows), opened as a drawer from the bell on desktop | 3 |
| Settings `/notification-settings` | Same board | Same board | Consistent | — | 3 |

### SOS / emergency

| Screen | Mobile | Web 1440 | What differs | Fix | Tier |
|---|---|---|---|---|---|
| SOS `/sos` | Campus SOS page (no shell) | Same | Consistent | — | **1** |
| SOS control | `SosButton` (pulse) on M2Home, Insights, Profile, Ask Ayush, Orders; the frame's SOS on non-M2 pages. **None on M2 Medicines, Product, Labs, Consults, Vaccines, Camps, Trends, Report upload, Steps, Medicine info, What's new** (these boards draw no SOS) | Red SOS in the shell's top bar on every page | Desktop always has SOS; mobile store and health sub-boards don't (DESIGN.md §2.4 says help is always one tap away) | **Decision for Krishna:** add `SosButton` to `M2Header`'s trailing slot on every board | **1** |
| Emergency card `/emergency-card` | Phone board (offline card) | `WebEmergencyCardView` (t1, "Card is 50% ready") | Two designs | One view. **Tier 1** | **1** |
| Check-in pass `/pass` | Phone board | `WebPassView` | Two designs (QR stays `qr-*` tokens) | One view | **1** |

### Other roles (1440 and 390)

Campus, doctor, partner and super-admin consoles use their own shells (`CampusShell`, the clinician console, `VendorShell`, `SuperAdminShell`). Mobile 2.0 doesn't apply to them; they are out of scope for this pass. Two exceptions:

- A **doctor's personal side** (`/health` as `NMC_DOCTOR`) still renders the oldest layout, `wf-workspace` + `MemberOverview`. It has **Shop ×3** (sidebar brand opens shop, a "Shop" button in the top bar, "Back to shop" in the sidebar) and **Plan / Profile / Digital ID ×2** (top quick-nav and sidebar).
- Doctor and partner consoles show no SOS at either width (count 0). That's expected for staff consoles, but it should be a recorded decision.

## Approved decisions (23 Oct 2026)

Decided by Krishna Chintakayala (named reviewer) on the recommendations below. Where a decision differs from the recommendation, the decision wins.

1. **Ayush.**
   - On desktop, keep the floating bubble and the Shop card "Not sure what you need? Ask Ayush".
   - Remove the top-nav "Ayush" link, the sidebar "Ayush AI" item and the Home Ayush card (`/home` is retired, see 2).
   - On the phone, hide the More menu's Ayush item. The pill nav's orb stays.
2. **One home.** Home is `/health`, as on the phone. The logo opens `/health`, and `/home` is retired for a signed-in student (it redirects to `/health`).
3. **Each place once:**
   - Orders: in the sidebar, not the top bar.
   - Health vault: in the sidebar, not the top nav.
   - Account: the avatar and the sidebar's account header, with no separate "Account" item.
4. **One notifications inbox, through the bell.** The bell opens `/notifications`, the same inbox the phone uses. The sidebar's "Notifications" item is renamed "Notification settings".
5. **Merges:**
   - My lab tests is a tab of Orders above phone width. The phone keeps its page.
   - Medications is Medicines today: `/medications` redirects there.
6. **Footer.** No public site footer when signed in; one line of crisis help (112 · Tele-MANAS 14416) under every page.
7. **One search box, in the top bar.** Results open in the shop. The signed-in shop has no second search box; a visitor's shop keeps its own.
8. **Phone More menu folded into Profile → Settings.** No menu button in the phone header. More gets its own close control and no longer repeats Ayush or Orders.
9. **Names match mobile.** "Your Care" becomes **Home** (`/health`), and **My health** (`/your-care`) gets its own sidebar item.
10. **SOS in the header of every screen, phone and web.**
    - `M2Header` carries SOS by default, and so does every board with its own header (Product, Consults, Camps, Medicine info, Care directory detail, Report upload, Trends, Steps, Vaccines).
    - On the web desktop, the shell's top bar carries SOS on every page, so a board shown there draws no second one.

**Icons these decisions took off screens.** These are recorded under `retiredIcons` in `design/screens/implementation-map.json`, with this section as their source, so the icon check does not ask for them back:
- `map-pin`: Your Care, now Home with the `home` icon.
- `flask`: My lab tests.
- `sparkle`: Ayush AI.
- `user`: Account.
- `menu`: the phone header's menu button.

`WebHome` is marked superseded by `WebDashboard`.

**Deferred** (Tier 1 content, phase 3): folding Report insights into My health. Report insights keeps its sidebar item until then.

## Duplications (recommendations for Krishna; decided above)

"Same screen" means visible at once without scrolling the nav. The phone-web counts also apply to the Expo app unless noted.

### Desktop web (1440, `StudentWebShell`)

| Module | Copies and where | Recommendation |
|---|---|---|
| **Ayush** | ① top nav "Ayush" ② sidebar Services → "Ayush AI" ③ floating orb + panel (`AyushWidget`, every page except crisis/SOS/emergency card/checkout/Ayush) ④ in-page cards: Home hero "Ayush AI" card, Shop rail "Not sure what you need? Ask Ayush". Up to **5** controls on Home and Shop | **Keep** the floating orb (it is the mobile pill-nav orb's twin, and it works on every page). **Hide** the sidebar "Ayush AI". **Move** the top-nav "Ayush" link out (the orb covers it). Keep at most one contextual in-page card (the Shop one, since it is about choosing a test) |
| **Orders** | ① top bar "My orders" ② sidebar Services → "Orders" ③ Profile → "Orders and payments" (mobile) | **Keep** sidebar "Orders". **Hide** top-bar "My orders" (or keep that one and drop the sidebar item: pick one) |
| **Health vault / records** | ① top nav "Health vault" ② sidebar "Health vault" ③ Your Care "Open vault" link | **Keep** sidebar. **Remove** from top nav |
| **Lab tests** | ① top nav "Lab tests" (store `/lab-tests`) ② sidebar "My lab tests" (`/my-lab-tests`) ③ Shop rail "Lab tests" ④ Report insights (sidebar) next to My health | Keep store in the top nav and bookings under Orders. **Merge** "My lab tests" into Orders (Active / Past, like M2Orders) and "Report insights" into My health |
| **Profile / account** | ① avatar "DS" top right → `/profile` ② sidebar header block (name + campus, not a link) ③ sidebar Account → "Account" (also `/profile`) | **Keep** avatar. **Hide** sidebar "Account" item (or make the sidebar header the link and drop the item) |
| **Notifications** | ① bell → `NotificationCenterModal` (inbox) ② sidebar Account → "Notifications" → **settings** ③ `/notifications` page (`NotificationInboxPanel`), a second inbox | **Keep** bell. **Rename** the sidebar item to "Notification settings" or move it under Profile. **Remove** one inbox (keep a single view; the modal can host it) |
| **Home** | ① logo → `/home` (`WebHomeView`) ② sidebar "Your Care" → `/health` (`WebDashboardView`) ③ mobile Home is `/health` (M2Home) | **One home:** the logo and "Home" both → `/health` drawing responsive M2Home. Retire `/home` for signed-in students |
| **"Your Care" / "My health"** | Desktop "Your Care" = `/health`; mobile "My health" = `/your-care` (M2Insights); native also registers a separate `YourCare` screen | **Rename** to match mobile: Home (`/health`) and My health (`/your-care`). Drop the "Your Care" label |
| **Medicines** | ① sidebar "Medicines today" (`/health/medicines`) ② `/medications` (`MedicationPanel`, in member links / More) ③ My health "Medicines today" card ④ Home "Medicines today" bento | Keep ③ and ④ as entry points. **Merge** `/medications` into Medicines today |
| **SOS** | ① top-bar SOS (always) ② Shop rail "Urgent? Help is one tap away" card ③ Ayush panel emergency line ④ footer "In a crisis, call 112" | **Keep all.** Safety copy is intentionally redundant (DESIGN.md §2.4); ② could shrink to a single line |
| **Cart** | ① top-bar bag ② Shop "Your cart" rail | **Keep both** (the rail is the shop's live basket) |
| **Search** | ① `/home` hero search ② Shop search ③ `/search` page. There is no global search in the shell | **Add** one search field to the top bar (as on M2Home) and remove the hero copy on `/home` |
| **Emergency card / pass** | ① sidebar "Emergency card", "My check-in pass" ② Profile On campus (mobile) ③ Home On campus (mobile) | **Keep** (Tier 1 shortcuts). Fine to duplicate |
| **Public site footer** | Shown inside the signed-in shell on Home and Account | **Hide** in the signed-in shell (leave a one-line crisis footer) |

### Phone web (390, `StudentPhoneFrame`) and the Expo app

| Module | Copies and where | Recommendation |
|---|---|---|
| **Ayush** | ① pill-nav orb ② More menu → "Ayush AI" ③ Profile row "Ayush can read my records" (not available yet; a setting, not an entry point) | **Keep** orb. **Hide** the More menu item |
| **Profile** | ① pill nav "Profile" ② M2Home avatar "DS" ③ More menu "Account" + header card | Keep pill nav + avatar (as on the board). **Hide** "Account" in More, or fold More into Profile → Settings (native already opens More from Profile Settings) |
| **Orders** | ① pill nav "Orders" ② More "My orders" tile ③ Profile "Orders and payments" | Keep pill nav. **Hide** the other two, or point them at the same screen |
| **Notifications** | ① M2Home bell ② the phone header's bell (non-M2 pages, Discover) ③ More "Notifications" (settings) | Keep bell. Rename the More item "Notification settings" |
| **SOS** | ① `SosButton` on M2 boards that draw it ② the frame header's SOS on non-M2 pages ③ More "Crisis contacts" | Keep. **Add** SOS to every M2 board header (the gap noted above) |
| **Vault** | ① More "Health vault" tile ② Home "Upload a lab report" ③ Profile "Health documents" ④ My health report cards | Keep ③ and ④. More's tile can go once Profile links the vault |
| **More menu (phone web only)** | The hamburger opens `MoreHubBoard` *above* the page, so More + the full M2Home are on screen together (capture `50-MoreMenu-390.png`) | **Move** More into Profile → Settings, as on native. The hamburger then goes away on M2 boards |

## Implementation plan

Rules for every phase: tokens only, i18n only, every state, `check-icons` per screen, implementation-map updated, stories for changed components (DESIGN.md §6). Desktop "wide" means the same component with a wider grid, never a second implementation.

### Phase 0: decisions and the bug (0.5 day, no design work)
- Krishna decides the Duplications rows (keep / move / hide) and the SOS-on-every-board question.
- Fix `/health/refills` on desktop (one `case` in `WorkspaceScreen.tsx`). **1 screen.**

### Phase 1: shared M2 components become responsive (about 4–5 days)
- Add a breakpoint hook in `src/design-system/m2` (`useM2Layout()`: `phone | tablet | desktop` from `size.phoneFrameMax` and a new `size.desktopMin` token) and a `M2Grid` (1 / 2 / 3–4 columns, `space.gutterPhone` → `space.gutterWeb`).
- Make wide variants of `M2Card`, `LiftCard`, `GradientHeroCard` (height and padding scale), `HeroCarousel` (2 slides visible on desktop), `ServiceRail` (no scroll on desktop), `SoftTileGrid` (columns prop: 4 / 6 / 8), `M2SectionHead`, `M2Header` (title + actions, no back on nav roots), `M2SearchField`, `NotYetTile`, plus new **`M2ListRow`** and **`M2EmptyState`** (wraps `AnimatedIcon variant="3d"` + copy + one CTA; replaces the static `Icon3d` empty states).
- Add `SosButton` to `M2Header`'s trailing slot (if Krishna agrees).
- Replace `studentweb/views/shop/m2WebParts.tsx` + `m2webshop.css` with the shared components (removes the second M2 implementation).
- Animated icons: give `ServiceRail` tiles and the "Today for you" bento an optional `anim-*` 3D variant (only names in `lottie.config.json`; no new animations without the packs).
- Stories for every changed component, phone and desktop.

### Phase 2: Tier 2/3 screens adopt the shared set at both widths (about 6–8 days)
Home `/health` (M2Home wide, absorbs the WebDashboard "needs" and "upcoming"), `/home` retired for students, Search, Shop, Product, Checkout summary, Buy again, Lab tests, My lab tests (→ Orders tab), Consults, Find care, Appointments, Camps, Refills, Medicines today (+ merge Medications), Water, Steps, Insurance (M2Insurance everywhere), Vaccines (M2Vaccines everywhere), Orders (M2Orders wide replaces `WebOrdersView`), Plan & billing, Account, Notifications inbox (one view), Notification settings, What's new, Blog / News in-shell, Help centre, My requests.
**About 26 screens.** Plus the shell changes approved in phase 0 (top nav, sidebar items, logo → `/health`, top-bar search, footer hidden when signed in).

### Phase 3: Tier 1 screens (plan first, then Krishna's approval and a named reviewer, then code)
Needs Krishna's plan approval before any code (DESIGN.md §5, CLAUDE.md):
My health (M2Insights wide), Trends, Report upload, Report insights (fold into My health), Health vault (one view), Prescriptions (into vault), Visit summaries, Ask Ayush (one view, two columns on desktop), Ayush widget (restyle or retire), Profile (M2Profile wide; identity), Digital ID, Privacy & consent, Data rights, Consent inbox, Care circle, Security, Verify identity, Delete account, Leave campus, Emergency card, Check-in pass, SOS control on every board.
**About 22 screens.** Each gets a one-page plan (components used, states, what differs from the board) for approval.

### Phase 4: native parity sweep (about 2 days)
Native already draws the M2 views, so it picks up phases 1–3 automatically. Left to do: phone web shows `InsurancePage` while native shows M2Insurance; native More → Profile Settings vs the phone-web hamburger; native `YourCare` screen (older) vs `Insights`. Re-shoot all 108 captures to `/home/claude/navy-shots/parity/after/` and compare.

| Phase | Screens | Tier 1 | Needs Krishna |
|---|---|---|---|
| 0 | 1 (+ decisions) | 0 | Duplications and SOS decisions |
| 1 | components (about 14) | — | No (design system), stories reviewed |
| 2 | about 26 | 0 | Shell changes from phase 0 only |
| 3 | about 22 | **22** | **Plan approval for each** |
| 4 | about 3 + re-shoot | 0 | No |

## Not done / limits
- No code changed; screenshots aren't committed (local path above).
- Expo native screens weren't captured (web export needs `@expo/metro-runtime`). Native parity is inferred from shared view code.
- Light scheme only. Dark mode and Telugu / Hindi fitting weren't checked in this pass.
- Control counts in `report.json` are DOM heuristics (aria-label / text matches); the duplication tables were checked against the screenshots and the shell source (`StudentWebShell.tsx`, `studentNav.ts`, `StudentPhoneFrame.tsx`, `WorkspaceScreen.tsx`).
