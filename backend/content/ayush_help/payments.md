---
id: payments
title: Paying, and what to do when a payment fails
reviewed: 2026-11-14
keywords: payment, pay, payment failed, payment declined, bank declined, money deducted, amount debited, charged twice, double payment, payment pending, waiting for bank, upi, gpay, phonepe, paytm, card, net banking, cash on delivery, cod, kare points, receipt, try again, पेमेंट, भुगतान, पैसे कट गए, చెల్లింపు, పేమెంట్, డబ్బు కట్ అయింది
---
<!--
Written from: the Pay step (src/features/payments/views/PayStepView.tsx, copy pay.* in src/i18n/areas/pay.ts),
checkout copy (Continue to pay, "Nothing is charged until you pay"), backend/services/payments.py (unpaid
orders release their stock; amount mismatch raises an ops alert). Checked in a browser by e2e/02-order.spec.ts.
-->
You pay on the Payment step, after checkout. You see the amount first, and nothing is charged until you pay. You can pay by UPI (GPay, PhonePe, Paytm or any UPI app), by debit or credit card, or by net banking. Kare points and cash on delivery are not available yet.

Payment is processed by the payment gateway. StudentKare never stores your card details. Paying gives nobody access to your records, and your campus is not told what you ordered.

If your bank declines the payment, the screen says Payment failed and that nothing was charged. Choose Retry to pay the same way again, or Try another method to pay a different way. Your order is kept while you do this.

If the payment screen is showing Waiting for your bank, the payment is still being confirmed. This can take up to 2 minutes. Do not pay again. Choose Check status, or open My orders: the order updates as soon as the payment is confirmed.

If StudentKare could not confirm a payment, nothing is marked paid. If money left your account, it comes back automatically. If a payment does not match the order, nothing is marked paid and the StudentKare team is told.

An order that is not paid in time, or that was cancelled, cannot be paid later. Its items go back on the shelf and nothing is charged. Place the order again.

If online payment is not connected yet, your order is saved as a request and nothing is charged. The provider tells you how to pay.

Once an order is paid, you see the amount and the order reference, and you can copy them. A downloadable receipt is not available yet. For refunds after a return, see Tracking orders, cancelling and returns.
