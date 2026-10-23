---
id: plans-and-prices
title: Plans and prices
reviewed: 2026-10-22
keywords: is it free, is studentkare free, price, prices, pricing, cost, fee, fees, charges, subscription, membership, plan, plans, upgrade, premium, student plus, free, paid, कीमत, प्लान, शुल्क, ధర, ప్లాన్, ఫీజు
---
<!--
Written from: backend/services/billing.py _plan_payload and GET /api/billing/plans, Plan & billing
(src/features/billing/views/PlanBillingBoard.tsx, copy sf.plan.* and shopweb.billing.*).
Every price below is filled from the settings registry when the pack is published
(backend/core/settings_registry.py billing.*), never written here.
-->
Every StudentKare account starts free and stays usable. The free account includes your personal health records, readings and document storage, your emergency contact information, browsing care services, and self-care tools. Your records are never behind a paywall.

Student Plus costs {{setting:billing.student_plus.monthly_inr|inr}} a month. There is also a 3-month package for {{setting:billing.student_plus.quarter_package_inr|inr}}, paid once. Student Plus includes everything in Free, {{setting:billing.student_plus.benefit_requests_per_month}} care coordination requests per month, partner-funded discounts, and priority support.

Premium starts from {{setting:billing.premium.from_monthly_inr|inr}} a month. It is not sold online yet.

Campus plans are paid by the institution, not by students, at {{setting:billing.campus.per_student_yearly_inr|inr}} per student per year. They cover seat-based access, health camp coordination, request tracking and aggregate operational reporting. Enterprise plans are by agreement.

See your plan, how many requests you have used this period, and your payment history in Plan & billing. If online payment is not connected yet, you cannot upgrade from the app; contact support. You can cancel Student Plus at the end of your current period.

Plan benefits are limited. They do not replace insurance or clinical care.
