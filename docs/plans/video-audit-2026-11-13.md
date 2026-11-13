# Reference-video audit: what the seven recordings show and where Student Kare stands

**Date:** 2026-11-13. **Asked by:** Krishna ("check all 7 videos … implement the same flow designs,
cards, banners").

**How this was done.** Seven files were uploaded; two are the same recording
(`WhatsApp_Video_2026-11-03_at_6_57_45_AM.mp4` and its `_1` copy are byte-identical), so there are
six recordings, about 42 minutes in total. Each was sampled at one frame every six seconds (421
frames) and read as contact sheets. That is enough to name every screen and flow; it is not enough
to read small print or catch a screen shown for under six seconds. Status in the app was checked
against `src/features/` (real screens), `src/features/redesignPreview/` (flat previews, not wired)
and `src/features/redesignPreview/NOTES.md` (earlier audits of the same recordings).

**Status words used below**

- **Live** — a real screen in the app does this job today.
- **Preview** — drawn as a flat, non-working screen in Storybook only; no data, not reachable in the app.
- **None** — not drawn and not built.
- **Declined** — looked at earlier and deliberately not copied, with the reason.

## 1. The recordings

| # | File | App shown | Length | What it walks through |
|---|---|---|---|---|
| 1 | `1000171929.mp4` | Tata 1mg | 2:00 | Lab-test cart → slot → pay → payment fails → retry → booking confirmed |
| 2 | `1000172021.mp4` | Blinkit | 2:39 | Pharma store browse, product sheet, a partner product page with compare table and steps |
| 3 | `1000172022.mp4` | Tata 1mg | 3:54 | Home, family health overview, prescription upload, consult by symptom, categories, health plans, lab insights, membership |
| 4 | `1000172053.mp4` | Apollo 24\|7 | 13:49 | Skin scan and routine, Ayurveda/homeopathy store, chat ordering, lab packages, doctors, physiotherapy, surgery estimate, insurance builder |
| 5 | `WhatsApp_Video_…6_57_45_AM.mp4` (+ duplicate) | Tata 1mg | 14:06 | Store, medicine page with assistant, lab packages and compare, family and AI insights, wearables, vaccines, consults, insurance covers, coupons |
| 6 | `WhatsApp_Video_…6_59_50_AM.mp4` | Blinkit | 5:42 | Checkout, rating, wallet top-up, gift cards, order history, settings, live order tracking, print store |

Recording 3 ends with about 20 seconds of a video call that has nothing to do with the apps; it was
ignored.

## 2. Flow by flow

### A. Lab tests (recordings 1, 4, 5)

| Pattern in the video | Status | Where / note |
|---|---|---|
| Package list with price, test count, report time, Add | Live | `src/features/labBooking` |
| Package detail: tests included (expandable), preparation, FAQs | Preview | `LabPackageDetailPreview`, `WebLabPackageDetailPreview` |
| Pick packages by age/sex/need, "why is this recommended" | Preview | `LabPackageSelectionPreview` |
| Compare two packages, "show only differences" | Preview | `LabComparePreview` |
| Cart add-ons (hard copy, faster report), bill summary | None | Lab cart has no add-ons |
| Slot picker by day and hour | Live | `labBooking` |
| Booking confirmed, collector assigned, "who is your phlebotomist" | Preview | `HomeCollectionStatusPreview` |
| Offers strip, "buy 1 get 1", cashback banners | None | Needs a real offers source; no invented discounts (AGENTS.md rule 11) |
| "Tests for you and your family" tick-list with reasons | None | Recommending tests is clinical content: Tier 1 |

### B. Paying (recordings 1, 6)

| Pattern | Status | Where / note |
|---|---|---|
| Payment options, recommended method first | Live | `src/features/payments` (Razorpay) |
| Payment failed, with retry and "pay another way" | Live | `payments/PayStepView` (used by shop, reorder, lab booking, web checkout); also pending, late and closed states. `PaymentRetrySheetPreview` is only a different look |
| Full-screen payment failure | Live | Same `PayStepView` result screen |
| Cash on delivery as fallback | None | Product decision, not a screen |
| Wallet top-up ("Add money"), gift cards | None | A stored-value wallet is a regulated product; not proposed |
| Loyalty coins (NeuCoins) | Declined | No coin icon in the kit; also see section 4 |
| Tip the delivery partner, donation at checkout | None | Not relevant to a campus health service |

### C. Medicines and store (recordings 2, 4, 5, 6)

| Pattern | Status | Where / note |
|---|---|---|
| Store home, categories, product grid with Add | Live | `src/features/m2store`, `shopPhone` |
| Category browse with side rail | Preview | `CategoryBrowsePreview`, `WebCategoryBrowsePreview` |
| Product page: uses, side effects, safety advice tabs | Live | `src/features/medicineInfo` (Tier 1, reviewed content only) |
| "Frequently bought together", Rx badge on cards | Preview | `CommerceExtrasPreview` |
| Cheaper generic alternative ("pay 26% less") | None | Substitution is a pharmacist decision here (`refills`), never an app upsell |
| Filters by form, brand, price | None | Store filters are category only |
| Floating "View cart" pill | Live | `m2store` |
| Order history with item thumbnails, Reorder | Live | Thumbnails merged in #311; reorder in `refills` / `orders` |
| Rate your order | None | Left out earlier pending a product decision |
| Multiple deliveries in one checkout, live map tracking | None | No courier integration |
| Coupons list with locked/unlocked states | None | One coupon reference in `shopPhone`; no coupon engine |
| Festive banners and brand rails | None | See section 3 |
| Ayurveda / homeopathy store sections | None | Catalogue decision |

### D. Prescriptions and records (recordings 3, 5)

| Pattern | Status | Where / note |
|---|---|---|
| Upload a prescription (camera, gallery, saved) | Live | `vault`, `PrescriptionUploadPreview` drawn for the newer look |
| "What is a valid prescription" explainer | Live | In the upload flow |
| Records filed into folders | Live | #318 (filing) and #321 (folder chips on the records screen) |
| Upload lab report / prescription / radiology scan chooser | Live | Record capture picks a category |

### E. Doctors and consults (recordings 3, 4, 5)

| Pattern | Status | Where / note |
|---|---|---|
| Consult now, pick speciality | Live | `teleconsult`, `appointments`, `careDirectory` |
| Pick symptoms as chips, then get matched | None | Symptom-to-doctor routing is triage: Tier 1 (`tier1-symptom-checker-2026-10-21.md`) |
| Doctor list with fee, experience, next slot | Preview | `DoctorBrowsePreview`, `WebDoctorBrowsePreview` |
| Compare two doctors | Preview | `DoctorComparePreview` (no brief or ticket) |
| Audio / video / chat mode, bill summary, free consult with membership | Preview | `TeleconsultPreview`, `CarePlanBenefitsPreview` |
| On-time guarantee with refund | None | A service promise, not a screen |
| Physiotherapy at home | Preview | `PhysiotherapyAtHomeLandingPreview` (new service line) |
| Surgery cost estimator, hospital shortlist | None | Out of scope for a campus product |
| Second opinion | Preview | `SecondOpinionPreview` |

### F. AI and insights (recordings 3, 4, 5)

| Pattern | Status | Where / note |
|---|---|---|
| Lab values in/out of range, trend chart per value | Live | `labResults`, `insights` (range comes only from the printed range) |
| AI summary of a report, "ask a different question" chips | Preview | `M2InsightsPreview`, `WebReportAssistantPreview` |
| "Improve" plan: diet, supplements and products tied to a lab value | Declined | Selling products off a lab value crosses the commerce firewall (AGENTS.md rule 4) |
| Health score out of 100, "better than 20% of your age group" | Declined | Gamifies body metrics (rule 4) |
| Assistant on a medicine page (how to take, side effects) | Live | Ask Ayush, approved sources only |
| Chat that places an order ("Order Dolo 650") | Preview | `AskAyushOrderCardPreview` |
| Skin scan from a selfie with scores and a product routine | Preview | `AISkinScanPreview`; diagnosis from a photo plus product upsell: Tier 1 and rule 4 |
| Wearables: pick a device and connect | Live (steps) / Preview | Steps and distance are live; `DevicesPreview` for more |

### G. Family, membership, insurance (recordings 3, 4, 5)

| Pattern | Status | Where / note |
|---|---|---|
| Switch between family members' health records | Declined | 18+ only, student-owned records (rule 8). Student Kare's answer is Care circle (`vault/FamilyCircleBoard`) |
| Membership with benefits list and "use your benefits" | Preview | `CarePlanBenefitsPreview`; billing for Student Plus is live in `billing` |
| Health plans marketplace (weight, diabetes programmes) | Preview | `HealthPlansMarketplacePreview`; needs real partners |
| Insurance covers with DOB eligibility, policy-holder form | Preview | `M2InsurancePreview`; no insurer chosen, so no purchase flow |
| Build-your-own plan (members, cover, deductible → price) | Preview | `InsurancePlanBuilderPreview`; prices cannot be invented |
| My policies (active / pending / expired) | None | Nothing to list until an insurer exists |
| Refer a friend | Preview | `ReferFriendPreview`; referral points exist in `rewards` |
| Vaccination tracker and booking | Live / Preview | Records live; `M2VaccinesPreview` for the newer look |

## 3. Cards and banners

The recordings lean on three things Student Kare does not have:

1. **Product and lifestyle photography** (hero banners, category tiles, doctor portraits). The
   design kit has icons, 3D icon tiles and 39 illustrations, and no photography component.
2. **Promotional banners** ("Payday sale", "up to 56% off", festival themes). These need a real
   offers source; a banner with an invented discount breaks rule 11.
3. **Partner logos** (insurers, labs, brands). None can be shown until a partner is signed.

What can be built honestly today: a banner **component** (title, body, one action, one illustration
from the kit, tokens only) fed by content an admin enters, so a real campaign can be shown the day
one exists. Open-source art can fill the photography gap if its licence allows commercial use and
it is added to the kit in its own PR (CLAUDE.md: no icon or asset is invented inside a screen).

## 4. What I recommend building, in order

Not copied, and I recommend it stays that way: the family record switcher, health score, product
upsell from lab values, loyalty coins, wallet and gift cards, surgery estimator.

| Order | What | Why now | Blocked on |
|---|---|---|---|
| — | ~~Payment failed → retry~~ | Already live (corrected 2026-11-13 after reading `PayStepView`; the first version of this audit was wrong) | — |
| 1 | Lab package detail and compare, made real | Data already exists in `labBooking` | Nothing |
| 2 | Doctor list with fee and next slot, made real | Data exists in `careDirectory` | Nothing |
| 3 | Banner component + admin-entered campaigns | Unlocks every "banner" ask without invented offers | Art source (section 3) |
| 4 | Home-collection status after a lab booking | Needs collector assignment data | Lab partner feed |
| 5 | Rate your order | Small | Krishna: what happens to a low rating |
| 6 | Store filters (form, brand, price) | Catalogue fields exist for some | Catalogue completeness |
| 7 | Insurance purchase, health plans, physiotherapy, second opinion | New services | Signed partners, clinical sign-off |
| 8 | AI report summary, skin scan, symptom-to-doctor | Tier 1 | Named clinical reviewer |

## 5. Limits of this audit

- Frames were six seconds apart; a screen shown briefly may be missing.
- "Live" means a real screen does the job, not that it looks like the recording.
- Status came from file names and searches, not from reading every screen. One row (payment
  retry) was wrong on the first pass and is corrected above; each item is re-checked in the code
  before it is built.
- The earlier audits in `NOTES.md` covered four reports; this pass re-read all six recordings but
  did not re-open every preview file to confirm it still matches.
