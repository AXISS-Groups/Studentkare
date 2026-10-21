# Mobile 2.0 — what it replaces, its colours, and what has a backend

Krishna (founder) approved the *StudentKare Mobile 2.0* canvas on **2026-10-21** as the new phone UI. It is kit page **9 · Mobile 2.0** (folder `09-mobile-2`): 13 phone boards, 390 px wide. It adds the 1mg-style store (medicines, medicine detail, labs, consults, vaccines, insurance, orders) and a new *My health* look (insights, trends, report upload, Ask Ayush about my records, profile).

The canvas notes say: every existing StudentKare feature stays (SOS, emergency card, check-in pass, campus clinic, camps, crisis support); sample data throughout; **prices are placeholders** (`₹[price]`, `[n]`, `[Name]`) until the catalogue fills them; *not copied from 1mg*: a health score, and product suggestions from lab results.

Briefs: `briefs/M2*.md` · pictures: `screenshots/09-mobile-2/` · source: `source/09-mobile-2/` (the source files are copied unchanged and load `./support.js`; to click through one, serve it next to a copy of `source/support.js`).

---

## 1. Which old boards each M2 screen replaces or extends

"Old boards" are page 2 · Student app (mobile) unless named otherwise. Files are from `design/screens/implementation-map.json` (`screens`, or `inProgress` where marked *ip*); routes are the app routes that draw them today.

| M2 screen | Replaces | Extends / links to (old board stays) | Implemented today by | Route |
|---|---|---|---|---|
| M2Home | HomeDiscover | YourCare (the "Today for you" cards), MyPass, EmergencyCard, HostelVisit, camps (the "On campus" tiles open them) | `src/features/discover/views/HomeDiscoverView.tsx`, `HomeDiscoverRoute.tsx`, `src/features/phoneKit/studentPhoneBoards.tsx`, `src/screens/workspace/StudentPhoneFrame.tsx`, `src/design-system/navigation/TabBar.tsx`, `src/native/StudentHomeScreen.tsx`, `src/native/StudentTabBar.tsx` | `/health` (phone board), `/home` |
| M2Medicines | ShopHome (medicine side), ProductList | RefillRequest (auto-refill), PrescriptionUpload (Order with prescription), Cart, Checkout | `src/features/shopPhone/views/ShopHomeView.tsx`, `ProductListView.tsx` (*ip*), `ShopFlow.tsx`, `ShopPhoneRoute.tsx`, `viewmodel/PhoneShopViewModel.ts`; refills `src/features/requests/views/RequestsViews.tsx` (*ip*); Rx upload `src/screens/marketplace/LiveMarketplaceScreen.tsx` (*ip*) | `/shop`, `/refill-request`, `/prescriptions` |
| M2Product | ProductDetail | Cart | `src/features/shopPhone/views/ProductDetailView.tsx`, `PhoneShopViewModel.ts` | inside `/shop` |
| M2Labs | LabPackages, LabResults | ResultLabBooked, MyReports | `src/features/labBooking/views/LabPackagesView.tsx`, `LabBookingFlow.tsx`, `LabBookingOverlay.tsx`, `viewmodel/LabBookingViewModel.ts`, `data/LabBookingRepository.ts`; `src/features/discover/views/LabResultsView.tsx` | `/lab-tests` (student tab), `/search` |
| M2Consults | DoctorResults | Appointments, Teleconsult, ConsultSummary (e-prescription), CrisisSupport (counsellor note) | `src/features/discover/views/DoctorResultsView.tsx`, `SearchRoute.tsx`; `src/features/appointments/views/AppointmentsBoard.tsx`; Teleconsult `src/features/teleconsult/views/TeleconsultNativeView.tsx` (*ip*) | `/search`, `/appointments` |
| M2Vaccines | PreventiveCare (vaccine part) | RecordsVault (old vaccine card upload) | `src/features/preventive/views/PreventiveCareBoard.tsx`, `src/features/preventive/screens/PreventiveCareScreen.tsx` | `/preventive-care` |
| M2Insurance | ClaimsHub | PlanBilling (Student Plus is separate) | `src/features/claims/views/ClaimsHubBoard.tsx`, `src/screens/workspace/PhoneBoards.tsx` | `/insurance` |
| M2Orders | OrderTracking, OrderHistory | ReturnRequest, ResultRefund, HelpCentre | `src/features/orders/views/OrderTrackingView.tsx`, `OrderHistoryView.tsx`, `OrdersPhoneRoute.tsx`, `viewmodel/OrdersViewModel.ts` | `/orders` |
| M2Insights | MyReports, ReportInsights, YourCare (overview) | VitalTrends, RecordsVault | YourCare `src/features/yourcare/views/YourCareBoard.tsx`; MyReports / ReportInsights not built | `/your-care`, `/records` |
| M2Trends | — (new) | VitalTrends (vitals) stays; M2Trends is lab values over time | not built | — |
| M2ReportUpload | — (new) | RecordsVault upload, PrescriptionUpload (prescriptions stay there) | vault `src/screens/vault/VaultWorkspaceHub.tsx`, `src/features/vault/views/HealthVaultNativeView.tsx` (*ip*) | `/records` |
| M2AskAyush | AyushChat (phone); AyushSheet (page 8) | CrisisSupport | `src/screens/workspace/AgentAyushPanel.tsx`, `src/features/chat/views/AyushChatNativeView.tsx` (*ip*) | `/ayush` |
| M2Profile | StudentProfile, MoreHub | DigitalId, MyPass, EmergencyCard, FamilyCircle, ConsentInbox, PlanBilling, DataExport, DeleteAccount, Legal, NotificationSettings, HelpCentre, RecordsVault (documents) | `src/features/account/views/StudentProfileBoard.tsx`, `MoreHubBoard.tsx`, `AccountDetailsBoard.tsx`; `src/features/digital_id/views/DigitalIdNativeView.tsx` | `/profile`, `/digital-id`, `/records` |

**Navigation changes.** The M2 pill nav (Home · Orders · Ask Ayush orb · My health · Profile) replaces the five-tab bar (Discover · Wellness · Ayush AI · Lab Tests · Your Care) in `StudentPhoneFrame.tsx` / `TabBar.tsx` / `src/native/StudentTabBar.tsx`. The store tabs (For You · Medicines · Lab tests · Consults · Vaccines · Insurance · Campus) move to the service-tile rail on M2Home. M2Profile draws a variant of the nav with text labels and no glyph in the orb; treat the icon version as the reference and confirm with design.

### Old boards that stay as they are

Nothing on Mobile 2.0 replaces these; keep the current boards and code:

- **Page 1 (launch, sign-in, onboarding, identity):** all 24 boards — splash, onboarding, SignIn, OtpVerify, account set-up, OnboardingConsent, VerifyIdentity, VerifyGate, GuardianConsent, LostPhone, NewDevice, sign out.
- **Safety:** SosBeacon, SosDebrief, EmergencyCard, IceContacts, CrisisSupport. M2 only links to them (SOS button, emergency-card tile, Tele-MANAS line).
- **Identity and consent:** MyPass, CheckinReceipt, ConsentInbox, FamilyCircle, DigitalId.
- **Checkout:** Cart, Checkout, Payment, PaymentResult, OrderSuccess (M2 has no checkout boards).
- **Search:** SearchEntry, SearchTyping, SearchLoading, SearchResults, NoResults (M2 shows only the search field).
- **Care and records:** Teleconsult, ConsultSummary, Medications (the medicine schedule; M2Home only shows today's ring), RecordsVault, PrescriptionUpload, RefillRequest, VitalTrends, Devices, Movement, PreventiveCare (screenings part).
- **Account:** PlanBilling, AccountDetails, NotificationSettings, Notifications, DataExport, DeleteAccount, Legal, HelpCentre, MyRequests, LeaveCampus, HostelVisit, ReturnRequest, ResultRefund, ResultLabBooked, ResultCampBooked.
- **Web pages (3a/3b) and every console (pages 4–8):** unchanged.

---

## 2. Colours

Tokens added to `design/tokens/studentkare.tokens.json` (light + dark, contrast pairs, DESIGN.md §3 row): a **service palette** of 9 hues and 3 navy/orb helpers (35 roles). Gradient light stops are decorative: white text or the only icon contrast never sits on them (white on a light stop is 1.7–2.7:1).

| Token | Light | Dark | Use |
|---|---|---|---|
| `brand-navy-light` | `#2B20C9` | same | top of navy gradients → `brand-navy` |
| `ayush-orb-glint` | `#A5F3FC` | same | Ayush orb highlight |
| `service-indigo` | `#6D5BFF` | same | indigo light stop (deep `brand-navy`, soft `surface-3`, ink `action`) |
| `service-violet` / `-deep` / `-soft` / `-ink` | `#A78BFA` / `#6D28D9` / `#EDE9FE` / `#6D28D9` | `-soft #2E2458`, `-ink #C4B5FD` | lab tests |
| `service-blue` … | `#60A5FA` / `#1D4ED8` / `#DBEAFE` / `#1D4ED8` | `#1B2E5C`, `#93C5FD` | consults, diabetes, blood sugar |
| `service-sky` … | `#38BDF8` / `#0369A1` / `#E0F2FE` / `#0369A1` | `#12384F`, `#7DD3FC` | campus, cold and cough, hostel visit |
| `service-teal` … | `#14B8A6` / `#0F766E` / `#CCFBF1` / `#0F766E` | `#10403D`, `#5EEAD4` | medicines, eye care, product art |
| `service-green` … | `#34D399` / `#047857` / `#D1FAE5` / `#047857` | `#12402F`, `#6EE7B7` | insurance, prescriptions, first aid, StudentKare lab |
| `service-amber` … | `#FBBF24` / `#B45309` / `#FEF3C7` / `#B45309` | `#3D2E10`, `#FCD34D` | vaccines, vitamins, health camp |
| `service-orange` … | `#FB923C` / `#C2410C` / `#FFEDD5` / `#C2410C` | `#43260F`, `#FDBA74` | report upload, fever, scans, Student Plus |
| `service-rose` … | `#F472B6` / `#BE185D` / `#FCE7F3` / `#BE185D` | `#45192F`, `#F9A8D4` | skin care, sexual health, iron, vaccines card |

`-deep` and the light stop keep their light values in dark mode (vivid tiles on the dark canvas, like the navy surfaces).

### Board colours → tokens

| On the boards | Token |
|---|---|
| Canvas `#FAF8FF`, cards `#FFFFFF`, `#F2F3FF`, `#EEF2FF` | `canvas`, `surface`, `surface-2`, `surface-3` |
| Text `#131B2E` / `#464555` / `#6B6980` | `text` / `text-2` / `text-3` (lab values: `clinical-value` + mono font) |
| Navy `#0C0494`, borders `#DAE2FD` | `action` / `brand-navy`, `rule` |
| Navy gradients `#2B20C9`→`#0C0494` (primary buttons, chat bubbles, upload button, highlight 1) and `#1A10B5`→`#0C0494` (pill nav) | `brand-navy-light` → `brand-navy` (`#1A10B5` folds into `brand-navy-light`) |
| Insights / Profile hero `#2B20C9`→`#0C0494`→`#08036B` | `hero-bg` (flat) or `brand-navy-light` → `brand-navy` |
| Ayush orb `radial(#A5F3FC, #6D5BFF 55%, #2B20C9)` | `ayush-orb-glint`, `service-indigo`, `brand-navy-light` |
| Nav icons `#C7C3FF`; text on navy `#C7C3FF`, `#E0DEFF` | `nav-text`; `on-hero-2` |
| Mint on navy `#82F5C1` (medicine ring, OFFLINE READY), `#6EE7B7` | `on-hero-positive` |
| Inactive dots `#C7C4D8`, `#D4D2E3` switch track off | `rule-strong` |
| Service tiles (M2Home rail, M2Labs quick actions, M2ReportUpload sources, M2Profile document cards): `#6D5BFF`→`#0C0494`, `#14B8A6`→`#0F766E`, `#A78BFA`→`#6D28D9`, `#60A5FA`→`#1D4ED8`, `#FBBF24`→`#B45309`, `#34D399`→`#047857`, `#38BDF8`→`#0369A1`, `#FB923C`→`#C2410C`, `#F472B6`→`#BE185D` | `service-<hue>` → `service-<hue>-deep` (indigo: `service-indigo` → `brand-navy`) |
| Tile gloss `radial(rgba(255,255,255,.55) → 0)` and card shine | `color-mix()` of `surface` / `illustration-highlight` with transparent; `aria-hidden` |
| Concern / category / row-icon tiles: `#FFEDD5`+`#C2410C`, `#FCE7F3`+`#BE185D`, `#FFE4E6`+`#9F1239` / `#BE123C` / `#B91C1C`, `#EDE9FE`+`#5B21B6` / `#6D28D9` / `#7C3AED` / `#4C1D95`, `#DBEAFE`+`#1D4ED8`, `#E0E7FF`+`#4338CA`, `#CCFBF1`+`#0F766E`, `#D1FAE5`+`#047857`, `#DCFCE7`+`#15803D`, `#FEF3C7`+`#B45309`, `#FEF9C3`+`#A16207`, `#E0F2FE`+`#0369A1`, `#ECFEFF`+`#0E7490`, `#FFF4E5`/`#FFF7ED`+`#C2410C` | `service-<hue>-soft` + `service-<hue>-ink`: orange, rose (pink and red merge), violet (all purples), blue, indigo (`surface-3` + `action`), teal, green, amber (yellow merges), sky (cyan merges) |
| Devices / Privacy tile `#F1F5F9`+`#334155`; neutral pills `#F1F5F9`+`#475569` | `neutral-bg` + `text-2` |
| Product art gradients (`#CCFBF1`→`#99F6E4`, `#FEF3C7`→`#FDE68A`, `#DBEAFE`→`#BFDBFE`, `#E0F2FE`→`#BAE6FD`, `#FCE7F3`→`#FBCFE8`, `#FEF9C3`→`#FDE68A`), avatar gradients (`#EEF2FF`→`#DAD7FF`, `#DBEAFE`→`#93C5FD`, `#FCE7F3`→`#F9A8D4`, `#D1FAE5`→`#6EE7B7`) | `service-<hue>-soft` → `color-mix(service-<hue>-soft, service-<hue> 25%)`; initials in `service-<hue>-ink` |
| Hero cards: highlight 2 and GENERICS `#10B981`→`#065F46`; highlight 3 / Add a lab report `#F97316`→`#C2410C`; Labs `#8B5CF6`→`#4C1D95`; Consults `#3B82F6`→`#1D4ED8`→`#0C0494`; Vaccines `#FBBF24`→`#F59E0B`→`#B45309`; Insurance-cover start `#10B981`→`#047857` | `service-green`, `service-orange`, `service-violet`, `service-blue`, `service-amber` → their `-deep` (see the AA note below) |
| Policy card and emergency-card tile `#312E81`→`#1E1B4B`→`#131B2E`, `#1E1B4B`→`#131B2E` | `brand-navy` → `text` (dark ink panel); `info` and `illustration-ink` are the same hexes but are not UI roles |
| Profile emergency card `#B91C1C`→`#7F1D1D` | `danger-fill` (flat). It is the emergency card, so the danger family fits; a gradient needs a design decision |
| Status: in range `#ECFDF5`+`#047857`, outside range `#FFFBEB`+`#92400E`, dots `#34D399` / `#F59E0B`, claim bars `#34D399`→`#047857` / `#FBBF24`→`#D97706`, range bars `#A7F3D0` / `#FDE68A` | `positive-bg` + `positive`, `attention-bg` + `attention`, `positive-fill`, `attention`; range bands as `color-mix()` of `positive` / `attention` with `surface` |
| SOS `#E11D48`; done ticks `#10B981` | `danger-fill`; `positive-fill` |
| Doctor's note card `#ECFDF5`→`#FFFFFF`, Vaccines steps `#FFFBEB`→`#FFFFFF`, Ask Ayush card `#EEF2FF`→`#F5F3FF`→`#ECFEFF`, Orders map `#EEF2FF`→`#E0E7FF`→`#C7D2FE` | `positive-bg`, `service-amber-soft`, `surface-3`, and `surface-3` → `color-mix(surface-3, service-indigo 15%)` for the map (not `illustration-indigo-soft`: illustration tokens are not UI) |
| Shadows `rgba(12,4,148,.06–.35)` | `shadow-hairline`, `card`, `float` |

**Contrast problems on the boards (fix when building, confirm with design):**
- White titles start on a light gradient stop and fail AA: highlight 2 and the Medicines GENERICS card (`#10B981`, 2.5:1), highlight 3 and Add a lab report hero (`#F97316`, 2.8:1), Consults hero (`#3B82F6`, 3.7:1), Labs hero (`#8B5CF6`, 4.2:1). Keep the text on the `-deep` end (or a flat `-deep` behind it).
- The white labels on the M2Profile document cards (`#FB923C`→`#C2410C`, `#34D399`→`#047857`, `#F472B6`→`#BE185D`) sit low-left where the gradient is mid-way; check them on the built card.
- M2AskAyush's range bar has a red segment (`#FECACA`). DESIGN.md: a result outside range is amber, never red — use `attention`.
- M2Insurance sets the policy number in JetBrains Mono; DESIGN.md's mono is IBM Plex Mono.

---

## 3. Features on the boards → backend today

Endpoints are under `/api` (`backend/services/*.py`). "No backend yet" means the builder shows the honest "not available yet" state for that part, never sample data.

| Board | Feature | Backend today |
|---|---|---|
| M2Home | Search medicines, tests, doctors | `GET /catalog` (`workflow_api.py`, `kind`, `query`, `category`) |
| M2Home | Voice search (mic) | no backend yet (device speech input; not built) |
| M2Home | Delivery block chip "Block C, VNR VJIET"; "Clinic pickup today" | partial: delivery address is typed per order (`POST /orders`); no saved address and no pickup-availability API |
| M2Home, M2Medicines, M2Labs | Upload a prescription / Upload Rx | `POST /health/prescription-uploads`, `GET /health/prescription-uploads` (`workflow_api.py`, `rx_uploads.py`) |
| M2Home | Highlights carousel (semester check, generics, upload any lab) | no content API: static copy linking to existing features |
| M2Home | Medicines today ring, next dose | `GET /meds/today`, `GET /meds/schedule` |
| M2Home | Buy again | `GET /orders` (+ `/buy-again` route) |
| M2Home, M2Insights | Next consult | `GET /appointments` |
| M2Home, M2Medicines | Shop by concern / categories | `GET /catalog?category=` |
| M2Home | Recently viewed | no backend yet |
| M2Home, M2Profile | Emergency card (offline) | profile fields `GET/PATCH /profile` + the offline emergency-card view model (`src/features/emergency`) |
| M2Home, M2Profile | Check-in pass | `GET/POST /identity` (`member_profile_api.py`, `check_in_pass.py`) |
| M2Home | Hostel visit | `POST /hostel-visits` (`student_requests.py`) |
| M2Home | Health camp · Sat | `GET /camps`, `POST /camps/{id}/book` |
| M2Home | Trust strip ("Licensed partner pharmacies", "Every Rx checked by a pharmacist", "Price shown before you pay") | no evidence source: AGENTS.md rule 6 forbids hard-coded compliance claims — show only what partner verification records prove, or leave the strip out |
| M2Home, M2Medicines, M2Labs | Call to order / Call to book (`tel:`) | no backend yet (no order-line number in the settings registry) |
| M2Medicines | Chat to order (board says "soon") | no backend yet |
| M2Home, M2Insights, M2Profile | SOS | `POST /emergency/sos` (`emergency_api.py`) |
| M2Medicines, M2Product | Generics: same composition, other makers, cheapest first | `GET /catalog/{item_id}/alternatives` (`medicine_master.py`) |
| M2Medicines, M2Product | Clinic pickup time / delivery window ("Today by 6 pm", "Tomorrow 10–12") | partial: `requested_slot` on `POST /orders`; no ready-by or delivery-window estimate API |
| M2Medicines | Auto-refill your regulars | `GET /refills/plans`, `POST /refills`, `POST /refills/{id}/cancel` (`student_requests.py`), `POST /meds/refill-reminder` |
| M2Medicines | Lower prices this week (MRP, % off) | `GET /catalog` (`price_paise`, `mrp_paise`); no "deals" selection API |
| M2Product | Medicine, pack, maker, Rx needed, MRP | `GET /catalog` (`requires_prescription`, `mrp_paise`, linked `care_medicines` composition and schedule) |
| M2Product | In stock at the clinic | `GET /inventory/{item_id}` |
| M2Product | Uses, side effects, do not take with (sourced, pharmacist reviewed) | no backend yet (no reviewed medicine-information fields; do not fill from `POST /ai/medication-lookup`) |
| M2Product | Add to cart, Add Rx | `POST /cart/validate`, `POST /orders`; `POST /health/prescription-uploads` |
| M2Labs | Packages, includes, price, collection slots | `GET /lab-packages`, `GET /lab-packages/{id}/slots`, `POST /lab-bookings` (`lab_booking.py`), `GET /lab-orders/{id}/slots` |
| M2Labs | Packages by audience (Everyone · Women · Men · Fitness · By concern) | no backend yet (no audience field; `category` only) |
| M2Labs | Most booked on campus | no backend yet |
| M2Labs | Your doctor asked for a repeat test | `GET /lab-orders` (`clinical_api.py`; doctor orders from `/work/doctor-lab-orders`) |
| M2Labs | Book again, report ready | `GET /lab-orders`, `GET /lab-bookings/{id}` |
| M2Consults | Doctors online now count | no backend yet |
| M2Consults | Consult now, next free slot, book a doctor | `GET /appointments/availability`, `POST /appointments`, `GET /providers` (`preventive_care.py`) |
| M2Consults | Video, audio or chat | video: `POST /consultation/{id}/join`, `/media-token` (`livekit_media.py`); audio-only and chat consults: not verified, treat as no backend yet |
| M2Consults | Free follow-up for [n] days | no backend yet (follow-ups exist only clinician-side, `/work/followups`) |
| M2Consults | Valid e-prescription to the vault | `GET /prescriptions`, `GET /records/visit-summaries` |
| M2Consults, M2Profile | Student Plus (consults a month, price) | `GET /plans`, `POST /subscription/checkout` (`billing.py`); per-month consult allowance not verified |
| M2Consults | Concern chips that match the right doctor | no backend yet (no concern → specialty matching) |
| M2Consults, M2AskAyush | Counsellor / Tele-MANAS 14416 line | crisis routing `POST /care/crisis-signal`, `crisis_gate.py`; helpline number must come from settings, not copy |
| M2Vaccines | Your vaccine record (doses, dates, due) | no backend yet |
| M2Vaccines | Add an old card | partial: `POST /health/documents` stores the file; nothing turns it into dose records |
| M2Vaccines | Book a vaccine, clinic slot, price | partial: `GET /vaccines` (offerings by provider) and `kind=vaccine` catalogue items; no vaccine slot booking |
| M2Vaccines | Given at the clinic vs vaccine only; dose added to record after the visit | no backend yet |
| M2Insurance | Student health policy (insurer, sum insured, valid till, number) | `GET/POST/DELETE /health/policies` (student-entered); no insurer feed |
| M2Insurance | Start a claim, claims with status | `POST /insurance/claims`, `POST /insurance/claims/{id}/submit`, `GET /insurance/claims`; `GET /insurance/eligibility`, `GET /insurance/benefits` |
| M2Insurance | E-card | no backend yet |
| M2Insurance | Network hospitals | no backend yet |
| M2Insurance | More cover (accident, top-up, travel) | no backend yet (board marks "Not yet") |
| M2Orders | Active and past orders, status steps | `GET /orders` (order lines carry `status`), `POST /orders/{id}/cancel` |
| M2Orders | Live map, rider position, arriving by | no backend yet (no rider tracking) |
| M2Orders | Handover code | no backend yet |
| M2Orders | Return, refund | `POST /returns`, `GET /returns/eligible`, `POST /v1/orders/{id}/refund` |
| M2Orders | Help | `POST /support`, `GET /my-requests` |
| M2Insights | Documents count, shared now | `GET /health/documents`, `GET /records/shares` |
| M2Insights | Latest report values, need a look / in range counts, by body system | no backend yet (no store of lab values per test) |
| M2Insights | Your doctor's note on a report | `POST /report-reviews`, `GET /report-reviews` (`preventive_care.py`) |
| M2Insights | Ask Ayush about this report | no backend yet (Ayush does not read records) |
| M2Trends | Each test over time, range bar, table | no backend yet (`care_readings` holds vitals by metric, not lab tests) |
| M2Trends | Bookmark a test | no backend yet |
| M2Trends | Your doctor's 3 steps | partial: free-text doctor note via `report-reviews`; no structured steps |
| M2ReportUpload | Take a photo / upload a PDF | `POST /health/documents` |
| M2ReportUpload | Read the values | partial: `POST /intake/{document_id}/process` makes a heuristic draft (`document_intake.py`) |
| M2ReportUpload | Student checks and saves the values | no backend yet (no student confirm step, no lab-value store) |
| M2ReportUpload | From a StudentKare lab | `GET /lab-orders` |
| M2ReportUpload | Ask a doctor to explain it | `POST /report-reviews` |
| M2AskAyush | Ask, suggestions, answer | `POST /agents/ayush/ask` (approved sources only, crisis intercepted), `GET /agents/ayush/history` (only if the student opted in) |
| M2AskAyush, M2Profile | "Ayush can read my records" consent and answers from my records | no backend yet |
| M2AskAyush | Talk to a doctor about it | `POST /appointments` |
| M2Profile | Name, course, year, hostel, blood group | `GET /me`, `GET/PATCH /profile` (`bloodGroup`) |
| M2Profile | Height, weight | `GET/POST /body/measurements` (`wellness_api.py`) |
| M2Profile | Profile complete % | no backend yet (could be computed on the client from the profile) |
| M2Profile | Medical leave (requests and notes) | no backend yet (none found for students) |
| M2Profile | Health documents (lab reports, prescriptions, scans) | `GET /health/documents` (by category); vaccines count: no backend yet |
| M2Profile | Share with family (adults only, "coming soon") | partial: `POST /records/shares`, `POST /records/shares/{id}/revoke` share records with a named person; no family circle |
| M2Profile | Addresses | no backend yet (address typed per order) |
| M2Profile | Orders and payments | `GET /orders`, `GET /orders/{id}/payment` |
| M2Profile | Language | client i18n (`src/i18n`) |
| M2Profile | Privacy and data (download, delete) | `GET /records/export`, `POST /records/deletion-request` |
| M2Profile | Help and support | `POST /support` |

### Rule L and copy rules to settle before building

- **Health data on store pages.** DESIGN.md §2.3: no health data on commercial surfaces. M2Home puts "Medicines today" next to the shop shelves, M2Medicines lists the student's prescribed medicines ("Auto-refill your regulars"), and M2Labs shows "Your doctor asked for a repeat test" on the lab catalogue. Read those from clinical endpoints only, never pass them into catalogue or commerce queries, and get a named reviewer to confirm the placement (or move them to My health).
- **Prices and numbers** (`₹149 a month`, `3 months for ₹2,199`, `[n] tests`, helpline `14416`) come from `GET /plans`, the catalogue and the settings registry, never from copy (AGENTS.md rule 11).
- **Trust claims** in the M2Home strip need evidence (AGENTS.md rule 6).

---

## 4. Icons

Every drawing on the boards is named against `design/icons/icon-manifest.json` in its brief. Drawings with no manifest icon are listed under **Missing icons** in each brief and were not replaced by look-alikes (19 kinds): document with an upload arrow; thyroid; card with text lines (emergency card / e-card); eight-ray Ayush spark (pill nav); medicine bottle with a cross; open tray (price shown before you pay); two-leaf sprout (Ayurveda, allergy); walking person; delivery scooter; bookmark; plus with one diagonal (generics); female ♀; male ♂; translate 文A; aeroplane; stomach; trend line with arrow; line chart on axes; zigzag trend line. M2Product also uses a text "−" on its quantity stepper; the manifest has no `minus`.
