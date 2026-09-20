# M16 — Checkout Module

## Overview
Shopping cart management, pricing calculations, promo coupon verification, and order checkout pipeline for campus products and healthcare services.

## Rule L Firewall Compliance
- **Data Class:** `commercial`
- **Isolation:** Contains zero clinical health data references and does not access PHI or health vault schemas.

## Architecture Layering
```
src/modules/m16-checkout/
  module.config.ts    Manifest definition (ID: M16, commercial)
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
