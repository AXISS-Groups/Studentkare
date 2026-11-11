# Catalog expansion: OTC medication at scale + new product categories

**Status:** proposal, not yet built. Krishna asked (1) for real public OTC-medication datasets to
choose from, and (2) confirmed cosmetics/wellness/sports/apparel/footwear/mats are a real storefront
expansion, not demo filler. This lays out what's realistically available for each before any import
or schema work starts — it's a sourcing decision, not something to build blind.

## 1. OTC medication — two public sources, two different jobs

No single open dataset covers both "which medicines are legitimately OTC in India" and "full brand/
composition/pack/manufacturer detail at scale." Two public sources cover different halves:

| Source | What it is | License | Covers |
|---|---|---|---|
| **NLEM 2022** (National List of Essential Medicines, Ministry of Health / CDSCO) | The government's own official essential-medicines list, with therapeutic categories | Government publication, public domain | Authoritative classification of what's essential/OTC-adjacent in India — a few hundred entries, PDF, not a ready CSV |
| **Indian Medicine Dataset** (`github.com/junioralive/indian-medicine-dataset`) | Community-maintained CSV of ~254,000 Indian branded medicines: name, price, manufacturer, type, pack size, composition (two fields) | "Open for use by anyone" — informal, not a standard license (no MIT/CC grant stated); not pharmacist-curated | Brand/composition/manufacturer/pack identity at real scale |

**What this means for the Tier 1 rules already in place (`docs/plans/tier1-medicine-info-2026-10-22.md`):**

- Rule 2 ("no AI writes monograph text") and the dataset-import design are about **monograph fields**
  — uses, side effects, warnings, storage. Neither public source above has those at all (the GitHub
  dataset is identity + price only; NLEM is a classification list, not a monograph). So neither
  source can fill in `care_medicine_info_fields` monograph content regardless of review status —
  there's nothing to import there.
- What they *can* do is seed the **medicine master / catalog identity layer** (`care_medicines`,
  `MedicineIngredient`, `CatalogEntry` — brand, composition, form, pack, manufacturer, schedule) at
  real scale, which is a different, lower-stakes table than the reviewed monograph one. This is the
  layer that currently has no dataset bundled at all (per the Tier 1 plan: "no dataset is bundled").
- Recommendation: use the GitHub dataset for identity-layer scale (de-duplicated, validated against
  NLEM's schedule classification where a match exists), and leave every monograph field exactly as
  today — empty until a real licensed, pharmacist-reviewed dataset (MIMS/CIMS-class, paid) is
  obtained. The "informal license" on the GitHub set is worth flagging to whoever signs off on this
  before it goes into a production database, even though the identity fields carry much lower legal
  risk than clinical text would.
- This gets you real brand/pack/manufacturer/price breadth (tens of thousands of rows is realistic)
  without ever touching the part of the feature that's gated behind pharmacist review — and it keeps
  the existing honest-empty-state ("we don't have reviewed information for this medicine yet") intact
  for every monograph field on every one of those rows.

## 2. Cosmetics, wellness, sports, apparel, footwear, mats

**There is no open-dataset equivalent for these.** A drug formulary exists because regulators publish
one; there's no regulator publishing "every cosmetics SKU sold in India" as open data. Real inventory
in these categories comes from one of two places:

- **Vendor onboarding** — the platform already has this: `backend/scripts/seed_catalog.py`'s own
  comment says it plainly ("For real inventory, create a VENDOR account and publish entries from the
  admin console instead"). This is the mechanism built for exactly this situation. Scaling into new
  categories here means recruiting actual sellers/distributors for each category, not importing a
  dataset.
- **A wholesale/distributor feed** you license — the commerce equivalent of the "licensed dataset"
  pattern already used for medicine info. If AXISS or a partner already has a distributor
  relationship for any of these categories, that's the real path, same shape as the medicine-info
  import but for the catalog tables instead.

What I'd flag before either path: these are new product *categories* on the storefront, which likely
needs small decisions beyond data — does each category need its own schedule/compliance handling
(cosmetics have their own labeling rules in India, separate from drugs), does "wellness mats/sports
products" sit under the existing commerce plane cleanly, and who owns category taxonomy (new top-level
categories vs. subcategories of something that exists). None of that blocks starting, but it's worth
deciding once rather than mid-build.

## 3. Recommended sequence

1. Confirm the GitHub Indian Medicine Dataset is acceptable for identity-layer import (flag the
   informal-license point to whoever needs to sign off) — if yes, I can write the import/dedup script
   against the existing medicine-master schema.
2. Separately, keep monograph content exactly as-is (empty, honest, waiting on a licensed dataset) —
   this plan doesn't change that.
3. For the new categories, decide: recruit real vendors through the existing console, or license a
   distributor feed. Either way the next step is picking which category to onboard first rather than
   building all six at once — a working importer/vendor flow for one category (say, wellness mats or
   OTC-adjacent cosmetics) is the thing to prove out before cloning it five more times.

Nothing here has been built yet — this is the sourcing decision laid out so the next step is a choice,
not a guess.
