# Catalog data — sources, counts, and honesty notes

This folder holds a reference product/service catalog for Student Kare's commerce
screens (medicines, lab tests, vaccines, insurance). It exists to give the Mobile 2.0
canvas screens (and any future build) realistic, non-fabricated sample data to work
against, in line with `DESIGN.md`'s rule against invented numbers.

## Honest total: ~310 entries, not 2000+

The original ask was for 2000+ entries scraped from "open source" websites. Two things
changed that plan, on purpose:

1. **"Open source" ≠ a competitor's live catalog.** Tata 1mg, PharmEasy and Netmeds'
   product listings are their own proprietary data, not open-source — scraping them
   wasn't an option. What *is* legitimately reusable is public/government data (India's
   NLEM, UIP schedule) and general market research for price ranges.
2. **Those legitimate sources don't contain 2000+ items.** NLEM 2022 has 384 medicines
   total; there is no open dataset of 2000 real, distinct lab tests or vaccines. Hitting
   2000 would have meant padding with invented SKUs (fake pack-size variants, invented
   drugs, fabricated test names) — which `DESIGN.md` explicitly rules out ("no invented
   numbers... no fabricated data").

So this catalog is smaller than asked for, but every entry is either grounded in a real
public source or clearly flagged as a researched price *range*, never presented as a
confirmed exact figure.

| File | Entries | Grounding |
|---|---|---|
| `catalog-medicines.json` | 159 (134 NLEM 2022 + 25 OTC/wellness) | NLEM 2022 gazette (sections 1–23 of 27; see gaps below) |
| `catalog-labs.json` | 96 tests + 20 packages | Standard clinical/diagnostic knowledge + general price-comparison research |
| `catalog-vaccines.json` | 22 (9 UIP + 13 adult/traveler) | India UIP schedule + general vaccine-price research |
| `catalog-insurance.json` | 13 product categories | IRDAI-regulated product types + general advisory-article research |

**Total: 310 real entries** across the four categories.

## What's verified vs. estimated

- **Names, compositions, clinical use, dose schedules:** grounded in real public
  sources (NLEM 2022 gazette, standard clinical knowledge of what each lab test
  measures, India's UIP vaccine schedule, IRDAI product categories).
- **Prices:** every single entry carries a `price_range_inr` (a range, never one exact
  number) plus a `price_basis` field saying plainly that it's an approximate market
  range from general research, not a vendor quote. Nothing here was scraped from any
  one competitor's product page.
- **Not yet verified:** a live PMBJP/Jan Aushadhi machine-readable MRP list could not be
  reached this session (only outdated 2014–15 archive PDFs surfaced) — medicine prices
  are pattern-based estimates, flagged as such. The COVID-19 vaccine entry is built on
  2022-era pricing and should be re-checked before any real use. See each category's
  notes section below for the fuller caveat list.

## Known gaps

- NLEM 2022's full list is 384 medicines across 27 sections; this file covers sections
  1–23 (~134 of them) because the source document was truncated mid-fetch. Sections
  24–27 (respiratory, IV fluids/electrolytes, vitamins & minerals, misc.) are not
  included — nothing was guessed in their place.
- `prescription_required` flags on medicines are a general Schedule H/H1/OTC judgment,
  not pulled from an official CDSCO schedule — flag for legal review if that distinction
  matters downstream.
- Insurance entries are **category references** (e.g. "Individual Health Insurance, 5L
  cover"), not real named insurer policies — Student Kare has no insurance
  underwriting/distribution partnership, so nothing here should be presented as a
  purchasable SKU with a guaranteed price.

## Status

Research inputs only. These files have **not** gone through the screen-build process
in `CLAUDE.md`/`AGENTS.md` (icon manifest, implementation-map, Tier-1 review) — they're
data for screens/backends to consume, not screens themselves. Before any of this ships
to real users, prices should be confirmed against whatever lab/pharmacy/insurer
Student Kare actually contracts with.

## Full source lists

<details>
<summary>Medicines — NLEM 2022 sources</summary>

- Gazette notification S.O. 5249(E), MoHFW, 11-Nov-2022 (mirror):
  https://thehealthmaster.com/wp-content/uploads/2022/11/S.O.-5249E-dt-11-11-2022-National-List-of-Essential-Medicines-2022-EC-Act-1955.pdf
- NHSRC-hosted copy: https://qps.nhsrcindia.org/sites/default/files/2022-09/nlem2022.pdf
- PIB press release (count/category confirmation): https://pib.gov.in/PressReleasePage.aspx?PRID=1858931
- Supporting coverage: https://www.downtoearth.org.in/health/national-list-of-essential-medicines-34-drugs-enlisted-in-update-after-7-years-84909 ,
  https://biovoicenews.com/384-drugs-included-in-nlem-2022-34-new-drugs-added/
- Price-pattern context (not a price list): https://organiser.org/2025/11/24/327164/bharat/generic-medicine-revolution-in-india-how-jan-aushadhi-push-triggered-a-177-fold-surge-in-sales-in-11-years/ ,
  https://biovoicenews.com/medicines-worth-rs-6975-crore-in-mrp-terms-sold-under-special-scheme-in-last-10-years-minister/
</details>

<details>
<summary>Lab tests — price-pattern sources</summary>

- secondmedic.com — blood test price list table
- mydiagnostics.in, lifecell.in, surveyheart.com, moolchandhealthcare.com — full-body
  checkup pricing tiers
- manipalcigna.com — Vitamin D / B12 test cost pages
</details>

<details>
<summary>Vaccines — sources</summary>

- 1mg, Medindia — pharmacy drug-price listings
- ThePrint, Business Standard — Indian health journalism (incl. HPV vaccine comparative
  pricing)
- PharmEasy, Cloudnine, myUpchar — consumer health explainer blogs
- FirstCry community — Menactra (meningococcal) pricing discussion
</details>

<details>
<summary>Insurance — sources</summary>

- Policybazaar, Star Health, Ditto Insurance, Apollo 247, ManipalCigna — student/young-adult
  health insurance advisory articles
- Bajaj Allianz / Bajaj Finserv — sanity-check pricing only, not copied as "the" product
- Outlook Money, FreeFinCal, BankBazaar, Niva Bupa — top-up vs. super top-up explainers
- Deccan Herald — reporting confirming campus-mandated group insurance is a real category
- IJCMPH academic review — student safety/accident insurance in India
- NIT Hamirpur, Maulana Azad National Urdu University, Krea University — public GPA/group
  mediclaim policy pages
</details>
