# Studentkare: Revenue, Investment & Collaboration Report

**Prepared:** 14 September 2026

**Market assumption:** India; initial operations in one city, provisionally Hyderabad.

**Currency:** INR. ₹1 lakh = ₹100,000; ₹1 crore = ₹10,000,000.

**Purpose:** Decide what to sell, whom to partner with, and how much capital to commit using the existing application.

## 1. Recommendation at a glance

**Build Studentkare around paid college contracts, supported by a partner-operated healthcare marketplace.** Sell the institution a student-care coordination service; earn additional income from fulfilled product orders, appropriately structured lab services, optional memberships, and separately contracted campus events.

Your strongest opportunity is a campus distribution network with dependable local fulfilment. The existing application already contains much of the account, catalog, order-request, records, and provider-workflow foundation for that business.

| Decision | Recommendation |
|---|---|
| First customer | Private colleges, universities, and organized hostels with an identifiable student-welfare budget owner |
| First geography | One city and a small service area around two campuses |
| Main recurring income | Institution-paid software and care-coordination contracts |
| Initial commercial offer | Approximately ₹180–₹360 per contracted student per year; model at ₹240, excluding applicable GST |
| Secondary income | Everyday healthcare products, partner lab bookings, disclosed service fees, and campus-event coordination |
| Student membership | Test a tightly capped ₹99/month optional benefits pass; validate willingness to pay before expanding it |
| Recommended capital envelope | **₹18–₹25 lakh for a lean six-month launch; detailed budget: ₹22 lakh** |
| First capital release | **₹5 lakh**, followed by staged spending against paid contracts and fulfilled transactions |
| First-year planning posture | Expect an operating loss while building campus distribution |
| Expansion condition | Positive unit contribution, repeat usage, reliable fulfilment, and collected institutional revenue |

**Illustrative monthly outcomes after reaching the specified operating scale:**

| Scenario | Paying campus contracts | Contracted students | Platform revenue/month | Operating result/month |
|---|---:|---:|---:|---:|
| Pilot | 2 | 4,000 | ₹1.18 lakh | **−₹1.01 lakh** |
| Base | 5 | 10,000 | ₹3.25 lakh | **−₹0.35 lakh** |
| Expansion | 12 | 24,000 | ₹8.64 lakh | **+₹1.11 lakh** |

These are constructed scenarios, **not current revenue, signed pipeline, or guaranteed returns**. No actual sales ledger, bank settlements, customer-acquisition data, supplier quotes, or signed commercial contracts were provided. Your personal capacity to invest also remains unknown; the budget is a business funding requirement, not a recommendation to commit a particular share of your personal savings.

## 2. What the codebase establishes

### Scope of this review

I reviewed the repository structure, architecture and integration documentation, active application entry and care routes, live marketplace/cart flow, subscription components, backend catalog/order/payment/insurance handlers, operational data models, seed data, and relevant payment/inventory tests. This is a targeted commercial-readiness review, not a claim that every line or deployed integration was audited.

The active route is `src/features/care/module.ts` → `CareScreen.tsx` → `LiveMarketplaceScreen.tsx`. Older demo storefront files also remain in the repository; their behavior should not be mistaken for the active marketplace. Similarly, the 13 September audit is historical context: later source changes mean its findings should not all be treated as still open.

| Capability | Evidence in current source | Commercial interpretation |
|---|---|---|
| Accounts and roles | Persistent account/session models; student, vendor, doctor and campus administration concepts | Useful foundation for a multi-sided campus business |
| Healthcare catalog | Backend supports `product`, `lab`, `consultation`, and `vaccine` listings with provider ownership and prices | Can represent several revenue categories; real supplier catalogs must replace illustrative entries |
| Orders | Server-derived prices, persistent order lines, inventory reservation and per-account request idempotency | Real order-request infrastructure exists |
| Provider operations | Provider-scoped requests and accepted/declined/dispatched/completed transitions | Supports a partner-operated fulfilment model |
| Health records and care operations | Documents, readings, appointments, campus verification, camps, attendance and encounter-note models | Supports institutional value beyond shopping; multi-campus access and actual workflows still need pilot acceptance testing |
| Online payments | Initiation returns a `CREATED` message when an environment setting exists; it does not create an external checkout session | **Actual online payment collection requires implementation, not just credentials** |
| Payment accounting | A payment model and generic signed-webhook handler exist | Partial foundation; provider-specific verification, amount/currency checks, duplicate-event handling, reconciliation and refunds need completion |
| Subscription plans | ₹59/₹159/₹299 plan definitions; inspected selection component updates local student state and displays an activation message | Plan selection is not proof of paid membership, recurring billing, or funded benefits |
| Prescription products | Order submission rejects items requiring prescription review | A licensed pharmacy review/dispensing workflow is needed before Rx sales |
| Insurance | Policy/claim records and partial integration handlers | No verified insurer-backed commercial operation established by this review |
| Financial reporting | Operations summary counts accounts, catalog entries and requests | A finance dashboard and partner-payable ledger remain commercial work |

### Specific issues that can prevent revenue

1. **Service checkout can fail inventory validation.** `validate_cart` applies `stock >= quantity` to all catalog kinds, while sample labs and consultations have zero stock. The active checkout invokes this validation before sending an order. Service availability should be based on provider capacity and bookable slots, rather than physical-product stock. This is a source-level finding; it was not reproduced in a live deployment during this report.
2. **A payment label can overstate readiness.** `initiate_payment` has no external provider call. The generic webhook also accepts a supplied amount without comparing it with the expected order amount, and duplicate provider references need deliberate idempotent handling. These gaps matter directly to money collection and accounting.
3. **Delivery coverage is currently a postcode-format check.** `_is_serviceable` accepts a syntactically valid Indian pincode, not a partner-confirmed service area. Replace it with a real campus/pincode allowlist or provider coverage data.
4. **The active cart is browser-memory state.** Submitted requests are persisted, but `LiveCartContext.tsx` does not establish a cross-device cart despite broader feature-completion claims in documentation.
5. **Requested times and appointments need one fulfillment contract.** The order flow records a requested time; separate appointment models reserve capacity. The commercial journey must connect these explicitly before promising a confirmed service.

**Conclusion:** This is a reusable application foundation with meaningful backend workflows. Feature-completion percentages do not establish revenue readiness. Invest next in collection, fulfilment, institutional sales, and financial controls.

### What must not be counted as traction

- Seeded university names, active-seat counts, sample providers and sample orders.
- Fictional product prices, ratings, discounts or brands.
- Local subscription selections or a screen saying a plan was activated.
- Environment variables labeled “configured.”
- ABDM-related code or sandbox responses as proof of production approval or certification.

The application can support the business. It does not establish that the business already has paying customers.

## 3. Market and positioning

The Ministry of Education's July 2026 release reports **4.50 crore students enrolled in higher education in 2023–24**.[S1] This establishes a large potential audience, not an immediately reachable customer base.

For planning, use a bottom-up market:

| Layer | Illustrative calculation | Meaning |
|---|---|---|
| Local prospecting universe | 50 selected campuses × 2,000 eligible students = 100,000 seats | A list to build and validate, not a measured Hyderabad market count |
| Institutional opportunity within that list | 100,000 × ₹240/year = ₹2.4 crore/year | Assumes every seat is contracted; not a sales forecast |
| First operating target | 2 paid campuses × 2,000 seats = 4,000 seats | Small enough for founder-led operations |
| Base milestone | 5 paid campuses × 2,000 seats = 10,000 seats | Requires multiple actual procurement wins |

### Why a campus would pay

Offer measurable operational outcomes:

- One place to submit, assign and follow up student-care requests.
- Health-camp registration and attendance coordination.
- A maintained local provider directory and documented escalation contacts.
- Student-controlled health-record access and consent-based sharing.
- Aggregate operational reporting: response time, completed requests and unresolved cases.

**Sales message:** “For ₹240 per contracted student per year, Studentkare helps your campus coordinate care, manage requests and organize access to local providers.”

The institution purchases software and a defined coordination service. Doctor time, laboratory tests, medicines, ambulance journeys and dedicated on-site staffing are separately priced unless a contract explicitly funds them. Campus officials should not receive unrestricted access to individual student medical records.

### Competitive reality

Practo's public page advertises consultation offers starting at ₹199, while displayed specialty prices vary and can be substantially higher.[S3] Large pharmacy and diagnostic platforms also compete on price and convenience. Studentkare should earn its place through campus access, local pickup/collection, service follow-up and institutional workflow—not assume it can sustainably undercut every national platform.

## 4. Revenue streams and suggested pricing

All commercial ranges below are **proposed negotiation or pricing-test assumptions**, not published industry margins or partner commitments.

| Priority | Revenue stream | Who pays | Suggested approach | What must be in place |
|---|---|---|---|---|
| 1 | Campus annual contract | Institution/hostel operator | ₹180–₹360/student/year; model ₹240; consider ₹1.5–₹2 lakh annual minimum for small sites | Budget owner, signed seat count, scope, institutional billing and campus access controls |
| 2 | Everyday healthcare products | Student; seller funds agreed platform fee | Target 8–15% net platform fee on the agreed basket basis; model 12% | Licensed/appropriate sellers, genuine inventory, delivery and returns terms |
| 2 | Lab booking and collection coordination | Lab/customer under an approved contract | Test a 15–25% net service/distribution fee equivalent; model 20% | Lab agreement, justified service scope, sample logistics, actual reports and lawful commercial structure |
| 3 | Optional student benefits pass | Student or parent | Test ₹99/month including assumed 18% GST | Billing, entitlement limits, redemption ledger and benefits that students value |
| 3 | Consultation technology/coordination service | Customer or institution | Test a disclosed flat ₹30–₹75 fee; model ₹50 net | Qualified practitioners, real consultation delivery, fee disclosure and contract review |
| 3 | Campus events | Institution or sponsor | ₹10,000–₹25,000 coordination fee/event; model ₹15,000 | Separate clinical provider budget, staffing, attendance and event acceptance |
| Later | Clinic/provider software | Clinic/group | Test ₹1,000–₹3,000/month for demonstrably useful workflow tools | A provider willing to pay for software independent of patient referrals |
| Later | Vaccination program coordination | Institution/customer | Fixed coordination fee plus provider's quoted clinical costs | Provider-administered service, eligibility, cold chain and clear dose/course pricing |
| Later | Insurance servicing/distribution | Authorized contractual payer | Only through a permitted structure with a licensed insurer/intermediary | Regulatory and partner permissions; exclude from the initial forecast |

**Medical-fee structure matters:** NMC's published ethics code prohibits physician referral commissions and certain fee-splitting arrangements.[S5] A commercial fee is not automatically permissible just because it is called a “platform fee.” Have the specific lab and consultation agreements reviewed. The model assumes legitimate, disclosed services; it does not include payments to doctors for prescribing tests or directing patients. If a proposed fee cannot be used, price the service through the campus contract and remove that fee income from the model.

### Initial assortment

Start with approximately 30–50 partner-backed everyday items: first-aid supplies, hygiene products, approved basic devices, and selected personal-care/nutrition products with the relevant product and seller documentation. Use a licensed pharmacy for medicine fulfilment. Select diagnostic offerings with the clinical partner rather than promoting large test panels to every healthy student.

Use scheduled campus pickup and batched collection to reduce cost. Introduce delivery charges transparently when needed. The model's ₹12/order delivery allowance is a **net subsidy after partner/customer contributions**, not an assumption that an individual delivery costs ₹12.

## 5. Redesign the existing membership economics

The repository's current plan definitions include:

| Existing plan definition | Promised benefits in source | Commercial concern |
|---|---|---|
| Free | Blood, BP and vision checkups | Someone must fund the staff, consumables and clinical service |
| ₹59/month | One consultation/month and diagnostic discounts | Little room for actual doctor cost plus platform support |
| ₹159/month | Three consultations/month and broader diagnostics benefits | High redemption can quickly exceed membership revenue |
| ₹299/month | Unlimited consultations, large imaging/lab discounts and an ambulance benefit | Open-ended cost and service availability obligations |

For illustration only, suppose a contracted GP consultation costs Studentkare ₹150. That is an assumed procurement price, not a quote. One redeemed consultation already costs more than a ₹59 membership; three cost ₹450 against ₹159 revenue. Even at only 30% monthly use of the ₹59 consultation allowance, expected doctor cost is ₹45 per member before payment fees, tests and support. Low utilization cannot be assumed without real cohort data.

### Better first offers

**Free account**
- Basic records access, service browsing, self-care tools and emergency contact information.
- Free physical health events only when an institution or sponsor has funded a defined event.

**₹99/month optional benefits pass**
- Nonclinical coordination and partner-funded discounts.
- A clearly capped platform-funded benefit budget, such as a maximum ₹25 eligible credit per month, with no rollover or cash withdrawal.
- A defined response window and usage limits; no unlimited clinician time.

**Institution-sponsored clinical bundle**
- Add only after obtaining a written per-seat or per-redemption provider quote.
- State exactly which services, annual limits, eligibility, geography and cancellation terms apply.
- Keep a healthcare membership distinct from insurance. Do not describe it as financial “protection” unless an actual regulated insurance product provides that coverage.

The financial model treats the ₹99 membership as incremental optional benefits beyond campus-funded core access. It assigns a full ₹25/month direct-cost allowance to every member. It does not count a member's credit as a second source of sales revenue. Other transaction-promotion budgets cover separate promotions. Validate that these benefits warrant ₹99; membership adoption may be zero if the offer is weak.

## 6. Unit economics: what remains from each sale

### Definitions and tax assumptions

- **GMV:** Customer transaction value of fulfilled products, labs and consultations. It is not Studentkare's revenue.
- **Platform revenue:** Net contractual fees retained by Studentkare plus earned campus, membership and event fees; excludes output GST.
- **Contribution:** Platform revenue less directly attributable costs. Central team and fixed operating costs are deducted afterwards.
- **Operating result:** Contribution less the stated fixed operating budget, before income tax, financing, depreciation and one-time launch costs.

Razorpay's public standard pricing is 2% plus 18% GST on its fee, or **2.36% of the processed amount**.[S2] The model uses this cash-cost allowance, with no input-tax-credit benefit assumed. Marketplace/split-settlement products, payouts and particular payment methods may have additional charges; obtain a written quote.

Product/lab/consultation ticket sizes below are modeled customer cash amounts. Their platform fee assumptions are **net of Studentkare's output GST**, with the tax and partner payable separately handled in the contract. If a supplier offers an inclusive-GST commission, divide it by the applicable tax factor before using it here. Membership alone explicitly assumes ₹99 inclusive of 18% GST: net revenue ₹83.90. Campus and event quotes exclude applicable GST and are assumed collected by bank transfer. A CA must finalize product classifications, invoicing, input credits and any marketplace withholding obligations.

| Unit | Customer value / contract price | Studentkare net revenue | Direct-cost allowance | Contribution |
|---|---:|---:|---:|---:|
| Product order | ₹700 | ₹84.00 at 12% | ₹16.52 gateway + ₹12 delivery subsidy + ₹8 support/returns + ₹10 promotion | **₹37.48** |
| Lab booking | ₹1,000 | ₹200.00 at 20% | ₹23.60 gateway + ₹40 collection subsidy + ₹10 support/recollection + ₹10 promotion | **₹116.40** |
| Consultation | ₹400 total | ₹50.00 flat net fee | ₹9.44 gateway + ₹10 coordination + ₹5 cancellation/support allowance | **₹25.56** |
| Paid member/month | ₹99 incl. assumed GST | ₹83.90 | ₹2.34 gateway + ₹25 benefit/support budget | **₹56.56** |
| Contracted student/month | ₹240/year excl. GST | ₹20.00 | ₹5 variable campus servicing allowance | **₹15.00** |
| Separately contracted event | ₹15,000 coordination fee excl. GST | ₹15,000 | ₹8,000 incremental event delivery | **₹7,000** |

For a lab booking, the lab's underlying clinical service cost is already outside the platform's net fee. The ₹40 is Studentkare's additional collection subsidy, not the entire lab fee. For a consultation, the remaining customer amount funds the provider and applicable taxes; clinician income is not counted again as Studentkare revenue. Event clinical tests and clinician charges are separately funded and excluded from both the coordination fee and its ₹8,000 delivery allowance.

**Practical implication:** A 10% platform-funded discount on a ₹700 product order costs ₹70. Replacing the model's ₹10 promotion allowance with ₹70 turns ₹37.48 contribution into **−₹22.52**. Broad coupons can increase sales while increasing losses.

## 7. Financial scenarios

### Operating assumptions per month

“Contracted seats” means seats the institution actually pays for. Registered students, active users, paying members and completed transactions are separate measures. The same student can appear in several usage measures; they are not added together as unique customers.

| Input | Pilot | Base | Expansion |
|---|---:|---:|---:|
| Paying campus contracts | 2 | 5 | 12 |
| Contracted seats | 4,000 | 10,000 | 24,000 |
| Activated student accounts | 1,200 | 4,000 | 12,000 |
| Monthly active students | 600 | 2,500 | 7,200 |
| Fulfilled product orders | 120 | 500 | 1,800 |
| Completed lab bookings | 30 | 120 | 360 |
| Completed consultations | 40 | 160 | 500 |
| Paying optional members | 60 | 250 | 900 |
| Paid events, monthly average | 1 | 2 | 4 |

These volumes presume the commercial blockers have been resolved and partners actually deliver. Lab and consultation demand follows clinical need; it should not be manufactured to meet a revenue target. Event counts are annualized planning averages, with cash and activity concentrated in term time.

### Monthly financial output

| Item | Pilot | Base | Expansion |
|---|---:|---:|---:|
| Product/lab/consultation GMV | ₹1,30,000 | ₹5,34,000 | ₹18,20,000 |
| Campus revenue | ₹80,000 | ₹2,00,000 | ₹4,80,000 |
| Product platform fees | ₹10,080 | ₹42,000 | ₹1,51,200 |
| Lab service fees | ₹6,000 | ₹24,000 | ₹72,000 |
| Consultation service fees | ₹2,000 | ₹8,000 | ₹25,000 |
| Membership net revenue | ₹5,034 | ₹20,975 | ₹75,508 |
| Event coordination revenue | ₹15,000 | ₹30,000 | ₹60,000 |
| **Total platform revenue** | **₹1,18,114** | **₹3,24,975** | **₹8,63,708** |
| Variable operating costs | ₹38,708 | ₹1,10,037 | ₹3,02,655 |
| **Contribution** | **₹79,406** | **₹2,14,938** | **₹5,61,054** |
| Fixed operating costs | ₹1,80,000 | ₹2,50,000 | ₹4,50,000 |
| **Operating profit / (loss)** | **−₹1,00,594** | **−₹35,062** | **+₹1,11,054** |

Totals use unrounded calculations; displayed rows may differ by ₹1 on addition. GMV excludes campus subscriptions, memberships and event coordination. Annualized platform revenue at these run rates is approximately **₹14.17 lakh, ₹39.00 lakh and ₹1.04 crore**, respectively. Annualizing an expansion month does not make ₹1 crore a first-year forecast.

### An illustrative first-year ramp

This is a separate progression toward the base case, not four quarters at the expansion case. Each row is the monthly average during that quarter, including onboarding time and holidays. It assumes annual campus contracts continue through holidays and that event volume is a term-time average.

| Quarter | Average paid seats | Product / lab / consultation volumes per month | Members / events per month | Monthly revenue | Monthly operating result |
|---|---:|---|---|---:|---:|
| Q1 | 1,000 | 20 / 5 / 10 | 0 / 0 | ₹23,180 | −₹1,63,413 |
| Q2 | 4,000 | 120 / 30 / 40 | 60 / 1 | ₹1,18,114 | −₹1,00,594 |
| Q3 | 7,000 | 300 / 75 / 100 | 150 / 1 | ₹2,12,785 | −₹76,986 |
| Q4 | 10,000 | 500 / 120 / 160 | 250 / 2 | ₹3,24,975 | −₹35,062 |

Fixed monthly budgets for Q1–Q4 are ₹1.8/₹1.8/₹2.2/₹2.5 lakh. Applying the same unit economics gives:

- **First-year platform revenue: approximately ₹20.37 lakh.**
- **First-year operating loss: approximately ₹11.28 lakh.**
- Adding ₹4 lakh one-time launch work, ₹2 lakh working-capital reserve and ₹2.2 lakh contingency produces an illustrative **₹19.48 lakh funding requirement**, before additional collection delays or expansion spending.

This annual illustration can fit within the ₹22 lakh envelope only if the assumed sales and collections occur. The six-month budget below is the more conservative authorization: it does not require those projected receipts to fund the initial core operating period. Reforecast monthly rather than assuming the budget guarantees twelve months of runway.

## 8. Break-even, acquisition cost and downside cases

### Break-even

At the base-case mix, non-campus activities contribute approximately ₹64,938/month. With ₹2.5 lakh fixed costs and ₹15 contribution per contracted student/month:

```text
Required contracted students
= (250,000 − 64,938) / 15
≈ 12,338 paid seats
```

That is roughly **6–7 campuses of 2,000 contracted students**, provided fixed costs and other contribution remain near the base assumptions. Seven campuses would yield 14,000 seats; servicing more campuses can also increase fixed costs. Campus revenue alone would require approximately **16,667 seats** at the same budget.

By contrast, product orders alone would require about **6,671 orders/month** at ₹37.48 contribution to cover ₹2.5 lakh fixed costs. This is why institutional selling deserves priority.

### Acquisition economics

- A hypothetical ₹60,000 fully loaded acquisition cost for a 2,000-seat college is recovered in about **two months of campus contribution** after service begins: ₹60,000 / ₹30,000. Procurement time, delayed collection and onboarding costs can extend cash payback. Sales salaries already included in fixed costs should not be charged twice.
- A student acquired for ₹200 who places one product order every two months contributes only ₹18.74/month under this model. Payback takes about **10.7 months**, assuming retention lasts that long. This is a poor basis for aggressive paid advertising.
- Track institutional CAC, student first-purchase CAC and paid-membership CAC separately. Do not substitute registered-user counts for paying-customer economics.

### Sensitivities against the base case

| Change | Approximate monthly effect |
|---|---|
| Institution price falls from ₹240 to ₹180/student/year | Profit falls ₹50,000; base loss becomes approximately **₹85,062/month** |
| No paid campus revenue, with its variable servicing cost removed | Loss becomes approximately **₹1,85,062/month** at unchanged central staffing |
| No optional membership adoption | Contribution falls approximately ₹14,140/month |
| Product take rate falls from 12% to 8% | Contribution falls ₹14,000/month |
| Net product delivery subsidy rises from ₹12 to ₹40 | Contribution falls ₹14,000/month |
| No platform fees on labs/consultations; partner collects payment and bears their transaction costs | Forego approximately ₹18,058 contribution/month; base loss becomes approximately **₹53,120/month** |
| Campus invoices take an extra 60 days to collect | Approximately ₹4 lakh additional receivables at base campus revenue, before GST |

If lab/consultation costs remain with Studentkare when fee income is removed, the downside is larger than the table. The ₹2 lakh working-capital allocation is not enough for every delay scenario; seek advance institutional payments and aligned supplier terms.

### Return on invested capital

At the expansion scenario's ₹1.11 lakh/month operating surplus, recovering a ₹22 lakh investment takes about **20 months after that surplus is reached**, ignoring income tax, reinvestment and later working-capital changes. Time spent reaching expansion comes before that. This is arithmetic, not a promised investor payback or a valuation.

## 9. How much to invest

### Suggested investment levels

| Funding available | Suitable scope |
|---|---|
| ₹3–₹5 lakh | Founder-led validation with one campus, narrow scope and partner-managed clinical/payment operations; enough to learn, not enough to assume a fully staffed launch |
| **₹18–₹25 lakh** | Recommended lean six-month one-city launch using the existing code and contracted providers |
| ₹40–₹60 lakh | A later staffed expansion envelope, justified only by paid traction; build a fresh twelve-month cash plan before committing |

These are alternative planning envelopes, not additive budgets. An owned pharmacy, warehouse, diagnostic lab or ambulance fleet requires a separate capital and licensing plan and is not included here.

### Detailed six-month budget: ₹22 lakh

| Allocation | Budget | Deliverable or cost basis |
|---|---:|---|
| Payment and financial completion | ₹1.8 lakh | Checkout adapter, receipt/refund workflow, event deduplication, reconciliation and partner accounting |
| Marketplace and provider completion | ₹0.8 lakh | Service-capacity fix, real coverage, catalog onboarding and fulfilment acceptance |
| Institutional commercial completion | ₹0.7 lakh | Minimum contract/seat billing, campus scoping acceptance and operational reports |
| Initial legal/accounting/contracts | ₹0.7 lakh | Entity/contract/product obligations, tax model, clinical partner and data terms |
| Core team and fixed operations | ₹10.8 lakh | ₹1.8 lakh/month × 6 months |
| Incremental delivery and customer-service allowance | ₹3.0 lakh | Campus servicing, transaction subsidies, benefit costs and events; reconciled against actual variable costs |
| Working-capital reserve | ₹2.0 lakh | Short settlement/collection mismatches and approved provider deposits |
| Contingency | ₹2.2 lakh | Cost overruns and remaining launch uncertainty |
| **Total** | **₹22.0 lakh** | Gross funding envelope before relying on projected revenue |

The first four rows total ₹4 lakh one-time launch work. They are quote targets, not fixed-price engineering commitments. They presume reuse of the existing application and a deliberately narrow launch. If tenant isolation or financial workflow remediation requires materially more work, obtain quotes and revise the envelope before spending beyond the first stage.

Example ₹1.8 lakh/month lean fixed-cost allocation:

| Role/cost | Monthly allowance |
|---|---:|
| Ongoing application engineer/maintenance | ₹70,000 |
| Care operations/support coordinator | ₹35,000 |
| Founder-led sales stipend/business development | ₹30,000 |
| Part-time QA and clinical operations review | ₹20,000 |
| Hosting, monitoring, communications and software | ₹15,000 |
| Routine administration and travel | ₹10,000 |
| **Total** | **₹1,80,000** |

These are lean India operating allowances to validate with quotes and hiring availability. Patient consultations and events are funded separately through their unit economics. One-time specialist integration deliverables must be separately scoped from ongoing engineer time; adjust allocations if the same person performs both. A salaried senior team or 24/7 human support would increase the budget substantially.

### Release the money in stages

| Stage | Maximum allocation | Allocation detail | Evidence required to release the next stage |
|---|---:|---|---|
| Month 1: validate and close the first sale | ₹5 lakh | ₹2.8 lakh initial work + ₹1.8 lakh core operations + ₹0.4 lakh variable allowance | A paid pilot or firm purchase order with a collection date; quoted clinical/supply partners; an agreed delivery scope |
| Months 2–4: operate two campuses | ₹10 lakh | ₹1.2 lakh remaining initial work + ₹5.4 lakh core operations + ₹1.4 lakh variable allowance + ₹2 lakh reserve | Two paying campuses, reliable completed transactions, usable financial records and positive transaction contribution |
| Months 5–6: prove repeatability | ₹7 lakh | ₹3.6 lakh core operations + ₹1.2 lakh variable allowance + ₹2.2 lakh contingency | Collections, repeat use and a qualified expansion pipeline support the next hiring decision |

If there is no institutional willingness to pay, narrow or revise the business before funding the next stage. A letter of interest without a budget owner or procurement path is not equivalent to a sale.

## 10. Collaboration plan

### The first partner network

| Partner | Initial target | What Studentkare offers | What to obtain | Commercial approach |
|---|---|---|---|---|
| College/university/hostel group | 2 nearby institutions | Student access, request tracking, events and coordination | Budget owner, signed scope, verified seat count, campus contact and launch access | Annual contract, preferably 50% upfront or semester advances |
| Diagnostic laboratory | 1 primary and 1 backup | Organized demand and scheduled campus collections | Test-wise net prices, collection coverage, capacity, report turnaround and recollection policy | Reviewed distribution/service agreement; avoid guaranteed volume initially |
| Licensed pharmacy | 2 local pharmacies | Orders and predictable pickup windows | License details, pharmacist responsibility, actual catalog/stock and expiry/returns policy | Agreed product fee and partner fulfilment; defer own inventory |
| GP/clinic network | 1 group with named available practitioners | Scheduling, records handoff and nonclinical coordination | Credentials, consultation rates, availability, follow-up and cancellation terms | Actual care delivered by practitioners; separately reviewed technology or institution-paid service terms |
| Counseling/dietetic providers | Small specialist panel after core pilot | Convenient campus access and scheduling | Appropriate qualifications, safeguarding/escalation and service-specific scope | Session-based contracted care; configure appropriate app roles rather than falsely treating every provider as an NMC doctor |
| Hospital/emergency service | 1 local operational partner | Maintained contact and escalation arrangements | Actual coverage, dispatch process and pricing | Institution-funded coordination or a quoted retainer; no guaranteed free transport without a funded contract |
| Delivery provider | 1 local/batched service | Concentrated campus deliveries | Per-drop/batch quote, proof of delivery, failed-drop handling and product restrictions | Per-delivery contract with an explicit payer |
| Incubator | T-Hub/AIC T-Hub or a suitable local university incubator | A functioning product and measurable pilot | Institutional introductions, commercial mentoring and funding preparation | Program participation; do not count unawarded grants as financing |
| Sponsor | Local employer, alumni group or appropriate CSR implementer | A defined health event with aggregate impact reporting | Funded budget, permitted sponsorship and delivery milestones | Event contract; no sale of individual health data |

**Concrete starting points:** Thyrocare publicly describes B2B partnerships and third-party service requests, making its corporate/channel team a reasonable diagnostic prospect.[S4] This does not establish API access, prices or a partnership with Studentkare. Also obtain quotes from accredited local labs whose relevant test scope and collection geography fit the campuses.

AIC T-Hub's healthcare program is aimed at MVP-stage commercialization.[S10] Its published Cohort 6 application deadline was 10 August 2026 with an August start; as of this report, ask about subsequent intake or other support rather than assuming that cohort is still open.

### Terms to negotiate before launch

- Which entity sells, invoices, delivers and receives payment for each service.
- The exact fee basis: list price versus actual customer price, tax-inclusive versus tax-exclusive, and who funds discounts.
- Settlement after verified completion, refund responsibility and dispute evidence.
- Availability, acceptance deadlines and what happens if the primary provider fails.
- Clinical responsibility, complaints and escalation contacts.
- Consent-based data exchange, limited access, retention and deletion responsibilities.
- Avoid broad exclusivity or minimum volume commitments before measured demand.

**Ownership:** Use ordinary supply contracts for suppliers and commercial contracts for colleges. Routine introductions do not justify giving away company equity. Consider strategic investment separately, based on cash, binding distribution commitments and documented governance terms.

### A first college proposal

> Studentkare proposes a paid campus-care pilot covering 2,000 students. The standard annual software and coordination fee is ₹4.8 lakh plus applicable GST. The scope includes request tracking, student access, defined support hours, provider coordination and aggregate operational reports. Clinical services and physical events are separately quoted. A 90-day paid pilot is ₹1.2 lakh plus applicable GST, with continuation subject to an agreed review. Individual medical records remain consent-controlled.

At this size, the 90-day campus fee provides ₹90,000 contribution under the ₹5/seat/month servicing allowance, before central costs and onboarding. Customize scope to the institution's actual need.

## 11. Commercial obligations to budget for

These obligations arise directly from selling the proposed products and services; the application itself does not replace them.

| Area | Practical action before monetizing |
|---|---|
| Medicines | Establish the seller-of-record and dispensing model with licensed pharmacies; verify state drug-control requirements and prescription handling. CDSCO/ONDLS provides licensing and verification channels.[S7] |
| Nutrition/food supplements | Classify products and establish the relevant FSSAI licensing responsibilities, including the ecommerce entity's role when facilitating food-product orders.[S8] |
| Teleconsultation | Verify practitioners, consent, documentation, fees and escalation against applicable telemedicine requirements.[S6] |
| Medical referral fees | Review the actual remuneration arrangement against NMC ethics rules; do not pay clinical referral bounties.[S5] |
| Insurance | Use an authorized insurer/intermediary structure for any regulated distribution activity. A general partnership agreement alone does not establish authority to earn insurance commission.[S9] |
| Student data | Define institution/provider access, consent, security, incident response and deletion. DPDP Rules were notified in November 2025 with phased commencement; map provisions and applicable dates to launch.[S11] |
| Under-18 users | Confirm the relevant consent/guardian and clinical requirements before admitting minors to the paid service |
| Marketplace finance | Confirm GST, invoicing, principal-versus-agent revenue treatment, withholding, returns and payment-provider onboarding for the actual product mix |

Keep emergency contact information accessible. Sell a defined coordination service only when it can actually be delivered. An SOS button or directory does not establish ambulance availability or a response-time guarantee.

## 12. Commercial implementation priorities

### First release: make the core paid journey dependable

1. Import a genuine partner catalog with seller details, prices, tax treatment and restricted-product flags.
2. Correct service stock validation and connect requested times to actual provider availability.
3. Replace generic pincode validation with contracted coverage.
4. Implement one payment provider end to end, including amount/currency validation and provider-specific event processing.
5. Add payment/order/fulfilment linkage, refund and return states, inventory release and duplicate-event recovery.
6. Record per-order-line contractual fees, discounts, taxes, partner payables and settlement status.
7. Support institution contracts, billable seats, invoices and collection tracking; manual approved invoices can precede automated billing.
8. Add membership billing and server-controlled entitlements only after the benefit design is accepted.
9. Establish a daily finance reconciliation and weekly campus contribution report.

Launch acceptance should include a genuine sandbox payment → provider acceptance → fulfilment → receipt flow, plus duplicate webhook, failed payment, cancellation/refund and cross-campus access checks. A later controlled live transaction confirms the actual provider connection. The present report did not run these checks or change application code.

### Initial finance dashboard

Track these separately by campus, partner and category:

- Requested orders, payment attempts, paid orders and fulfilled orders.
- GMV, net platform revenue, discounts, GST, partner payables and contribution.
- Refunds, failed deliveries, recollections and unresolved reconciliation differences.
- Contracted seats, invoice value, cash received and receivables aging.
- Paid members, renewals, benefit redemption and service cost per member.
- First-purchase acquisition cost and 30/60/90-day repeat cohorts.

## 13. First 90 days

| Period | Commercial work | Product/operations work | Decision evidence |
|---|---|---|---|
| Days 1–15 | Interview 10 institutional buyers and 30 students; obtain at least 3 supply/clinical quotes | Confirm active workflows, payment gap, service-capacity gap and costed launch scope | Named budget owners; quantified problems; partner price sheet |
| Days 16–30 | Close the first paid pilot; appoint campus and provider contacts | Complete the narrow paid journey and record partner responsibilities | Purchase order/contract plus collection date; successful acceptance checks |
| Days 31–60 | Launch first campus and close the second | Run actual requests with human supervision, receipts and weekly reconciliations | Paid invoice, completed orders and measured contribution |
| Days 61–90 | Demonstrate renewal/continuation value; develop the next 3–5 campus opportunities | Fix fulfilment problems and measure repeat use before adding more features | Evidence supports further spending or a narrower revised offer |

Suggested pilot decision targets, to agree before launch rather than present as achieved results:

- Two paid campus contracts and approximately 4,000 contracted seats.
- At least 25% student activation within 60 days of each campus launch.
- At least 100 completed monthly product/service transactions across the initial campuses.
- Positive measured contribution after actual discounts, delivery and refunds.
- At least 25% 60-day repeat purchase among eligible first-time product buyers; report sample size and allow for academic holidays.
- At least 95% fulfilment within the specifically promised partner window.
- No unexplained payment/settlement differences at weekly close.
- A documented budget-owner decision on pilot continuation.

These are proposed operating gates, not external market benchmarks. Do not drive unnecessary consultations or testing to satisfy them.

## 14. Funding and next decision

Prefer this sequence:

1. Founder capital sufficient for the first ₹5 lakh stage, if affordable.
2. Paid institutional pilots and advance contracts.
3. Partner-funded event delivery, discounts and clinically appropriate service bundles.
4. Incubator support and eligible grants only once actually awarded.
5. Angel/strategic funding once there is evidence of paid distribution and repeatable contribution.

For example, two 2,000-seat annual contracts at ₹240/seat produce ₹9.6 lakh annual contracted fees; 50% advance collection yields ₹4.8 lakh cash before GST. That cash funds future service obligations. It is not all immediately earned revenue and must not be added again on top of the same contracts in the financial model. Partner settlement money and collected GST are not operating capital.

Do not estimate company valuation from feature count. As a dilution illustration only, ₹25 lakh raised at an agreed ₹2 crore pre-money valuation means an investor owns about 11.1% post-money, before other changes. The repository does not establish that valuation; contracts, retention, margins and funding terms would determine an actual negotiation.

### Information needed to replace assumptions with your real plan

1. Launch city and campuses you can genuinely approach.
2. Maximum business capital available and the time you can personally devote.
3. Current paying customers, monthly completed orders and bank-collected revenue, if any.
4. Supplier quotes, licenses and agreements already held.
5. Existing team costs and whether development is founder-led or outsourced.
6. Whether you intend to own inventory or operate through partner sellers.

**Final decision:** Commit to a tightly scoped paid-campus pilot. Authorize approximately ₹22 lakh in stages, spend the first ₹5 lakh to establish a real buyer and a working commercial journey, and expand when collections and unit economics support it. At the modeled scale, roughly 6–7 paid campuses can approach operating break-even; a substantially larger footprint can produce meaningful profit, but the first year should be funded as a validation and distribution-building period.

## Appendix A. Repository evidence

Paths and line references apply to the source reviewed on 14 September 2026; they may move as the application changes.

| Finding | Source |
|---|---|
| Active application uses live cart and feature routes | `src/App.tsx:88–103`; `src/features/care/module.ts:8–12`; `src/features/care/screens/CareScreen.tsx:6–8` |
| Checkout validates then sends a persistent request | `src/screens/marketplace/LiveMarketplaceScreen.tsx:385–408` |
| Active cart is in-memory | `src/data/LiveCartContext.tsx:8–28` |
| Provider-priced catalog and product/service kinds | `backend/core/workflow_models.py:96–111`; `backend/services/workflow_api.py:520–560` |
| Stock check applied to services and pincode-only coverage | `backend/services/workflow_api.py:588–630` |
| Server-priced, idempotent order requests; Rx blocked | `backend/services/workflow_api.py:667–713` |
| Placeholder payment initiation and partial webhook | `backend/services/workflow_api.py:719–780` |
| Provider fulfilment state transitions | `backend/services/workflow_api.py:808–843` |
| Current operational summary is counts, not a P&L | `backend/services/workflow_api.py:877–882` |
| Campus, appointment and camp persistence concepts | `backend/core/workflow_models.py:286–309,370–423` |
| Current membership prices and promises | `src/data/subscriptionPlans.ts:17–112` |
| Inspected plan selection updates local state | `src/components/health/SubscriptionPlansModal.tsx:21–26` |
| Illustrative catalog and zero-stock sample services | `backend/services/demo_seed.py:28–88` |
| Sample universities are seed data | `backend/services/seed.py:13–18` |
| Insurer submission has no actual provider call in inspected handler | `backend/services/workflow_api.py:489–517` |
| ABDM adapter contains sandbox-success responses | `backend/services/abdm_gateway.py:38–44,62–79` |
| Existing payment/inventory tests exercise partial contracts | `backend/tests/test_payments.py`; `backend/tests/test_inventory.py` |

Financial assumptions and calculated scenario outputs are also available in [the companion CSV](studentkare-revenue-scenarios-2026-09-14.csv). It is a static, spreadsheet-readable snapshot, not an automatically recalculating workbook.

## Appendix B. External sources

Sources checked on 14 September 2026. Public prices can change. Partner descriptions establish potential routes to explore, not Studentkare agreements. Proposed take rates, staffing costs, campus pricing, conversion, retention and forecast volumes are internal planning assumptions.

- **[S1] Ministry of Education / PIB, 8 July 2026:** [AISHE 2022–23 and 2023–24 release](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2282525&lang=1&reg=48). Source for 4.50 crore enrollment; this is academic-year 2023–24 data released in 2026.
- **[S2] Razorpay:** [Public pricing](https://razorpay.com/pricing/). Source for standard 2% platform fee plus 18% GST on that fee. No temporary promotional waiver assumed.
- **[S3] Practo:** [Online consultation page](https://www.practo.com/consult). Source for advertised entry offers and variable displayed specialty prices; not a wholesale provider quote.
- **[S4] Thyrocare:** [Partner/franchise information](https://www.thyrocare.com/franchisee/register) and [service terms](https://www.thyrocare.com/terms). Evidence of B2B/channel and third-party request models; obtain fresh terms for a digital partnership.
- **[S5] National Medical Commission:** [Code of Medical Ethics Regulations, section 6.4](https://www.nmc.org.in/rules-regulations/code-of-medical-ethics-regulations-2002) and [published regulations PDF](https://www.nmc.org.in/wp-content/uploads/2017/10/Ethics-Regulations-2002.pdf). Source for physician referral-commission restrictions; confirm the applicable framework for the proposed agreement.
- **[S6] Ministry of Health and Family Welfare:** [Telemedicine Practice Guidelines](https://esanjeevani.mohfw.gov.in/assets/guidelines/Telemedicine_Practice_Guidelines.pdf). Clinical delivery, consent, documentation, professional duties and platform considerations.
- **[S7] CDSCO:** [Regulator overview](https://www.cdsco.gov.in/) and [Online National Drugs Licensing System](https://statedrugs.gov.in/). Confirm actual seller and state-specific licensing obligations.
- **[S8] FSSAI:** [Licensing information](https://fssai.gov.in/business/licensing) and [July 2024 operationalization direction, including ecommerce provisions](https://fssai.gov.in/upload/advisories/2024/07/669a5e5daca83direction%20merged.pdf). Confirm the currently applicable product/business classification.
- **[S9] IRDAI:** [Requirements for registering as a corporate agent](https://irdai.gov.in/requirements-for-license-as-a-corporate-agent). Evidence that regulated distribution requires an appropriate authorized structure.
- **[S10] AIC T-Hub:** [Healthcare program](https://www.t-hub.co/healthcare). Commercialization focus and published 2026 cohort dates; future availability must be confirmed.
- **[S11] MeitY:** [DPDP Rules 2025, enforcement timeline and corrigendum](https://www.meity.gov.in/documents/act-and-policies/digital-personal-data-protection-rules-2025-gDOxUjMtQWa?pageTitle=Digital-Personal-Data-Protection-Rules-2025.pdf); [PIB explanation of phased implementation](https://www.pib.gov.in/PressReleasePage.aspx?PRID=2190655&lang=2&reg=3). Notification is not the same as every provision having commenced.
