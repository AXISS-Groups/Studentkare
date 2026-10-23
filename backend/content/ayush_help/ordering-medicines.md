---
id: ordering-medicines
title: Ordering medicines and health products
reviewed: 2026-10-22
keywords: buy, buy medicines, purchase, order medicines, shop, cart, checkout, delivery, deliver, home delivery, pay, payment, upi, card, cash on delivery, cod, dawai, dawa, medicine order, दवाई, दवा, दवाइयाँ, ऑर्डर, మందులు, మందు, ఆర్డర్
---
<!--
Written from: /shop (src/features/studentweb/views/shop/WebShopView.tsx, phone ShopPhoneRoute),
/checkout (src/features/studentweb/views/shop/WebCheckoutView.tsx), order success and tracking
(src/features/m2store/views/M2OrdersView.tsx), and the server rules in
backend/services/workflow_api.py (cart serviceability check and POST /api/orders: prescription-only
items and lab tests are refused in the cart).
-->
You can order medicines and health products from partner pharmacies in the Shop (Medicines). Add items to your cart, then open Checkout.

At checkout you choose how you get the order: collect it from the provider (pickup), or home delivery or collection to an address you type. The provider sees the delivery address so they can deliver it. They never see anything from your health records. Shop items need no time slot: the provider confirms the timing when they accept your order.

Then you pay. You see the payment step before anything is charged, and you choose UPI, card or netbanking there. Payment goes through the payment gateway, and StudentKare never sees or stores your card details. Cash on delivery and paying with Kare points are not available yet. Nothing is dispensed or held for you until the payment clears. An order you have not paid for is saved, but it reaches the provider only once it is paid.

Prescription-only medicines cannot be bought through the cart yet, because prescription review in the shop is not connected. Contact your care provider or a pharmacy for those. Lab tests are not bought through the cart either: book them from Lab tests, with a collection time.

Paying for something gives no one access to your records, and your campus is not told what you ordered.

After you order, track it under My orders. See the article on orders and returns for what each step means.
