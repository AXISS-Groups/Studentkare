# M16 — Checkout Module

> **Status:** one of two slices left in `src/modules` (the rest of that parallel
> architecture was never run by the app and was deleted, audit TD-06). It is live,
> and should move into `src/features/marketplace` in its own reviewed PR.

## Overview
Shopping cart management, pricing calculations, promo coupon verification, and order checkout pipeline for campus products and healthcare services.

## Rule L Firewall Compliance
- **Data Class:** `commercial`
- **Isolation:** Contains zero clinical health data references and does not access PHI or health vault schemas.

## Architecture Layering
```
src/modules/m16-checkout/
  index.ts            Public API (Domain types & ViewModel hook ONLY)
  domain/             CartLineItem, OrderSummary entities & pricing rules
  data/               CheckoutRepository (Order placement & cart caching)
  state/              CheckoutStore (Observable store with discriminated union state)
  viewmodel/          useCheckoutViewModel hook ({ state, actions })
  view/               Presentational Web & RN components
  platform/           Storage adapter ports
  __tests__/          Characterisation unit tests
```

## Public API Usage
```typescript
import { useCheckoutViewModel, CartCheckoutWebView } from '@/modules/m16-checkout';
```
